"""Multi-document upload endpoint (Phase 1 / Bug 2).

Tier gating is intentionally BINARY for now (free vs paid: anything that isn't
`plan == "free"` gets the paid tier). Refacto to a true 4-tier system (Solo /
Family / Pro) when pricing is validated in production.

Scope: per-tier file count + per-file size + format whitelist. Storage upload,
text extraction, single shared `case` doc creation. Returns `case_id` so the
client triggers analysis via the existing `POST /analyze/trigger` endpoint.
The cinematic stays the unique source of progress UI.
"""
from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from db import db
from auth import get_current_user
from models import User
from storage import put_object, APP_NAME

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Tier limits — binary free vs paid ─────────────────────────────────────
# When the 4-tier system lands (Solo/Family/Pro), swap this constant for a
# proper lookup keyed on `current_user.plan`. The keys here intentionally match
# the future 4-tier shape so the migration is straightforward.
LIMITS = {
    "free": {
        "max_files": 1,
        "max_bytes_per_file": 10 * 1024 * 1024,        # 10 MB
        "allowed_formats": {"pdf"},
    },
    "paid": {
        "max_files": 10,
        "max_bytes_per_file": 50 * 1024 * 1024,        # 50 MB
        "allowed_formats": {"pdf", "docx", "jpg", "jpeg", "png", "webp", "heic", "heif"},
    },
}


def _tier_for(user: User) -> str:
    """Binary: free if `plan == "free"`, otherwise paid."""
    return "free" if (user.plan or "free") == "free" else "paid"


def _ext(filename: str) -> str:
    return (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()


def _validate_files(files: List[UploadFile], tier: str, tier_limits: dict) -> None:
    """Raises HTTPException with details. Free over count → 402 (Payment Required)
    with explicit upgrade message. Other limits (size/format) → 400."""
    if not files:
        raise HTTPException(status_code=400, detail="At least one file required")

    if len(files) > tier_limits["max_files"]:
        if tier == "free":
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "TIER_UPLOAD_LIMIT",
                    "message": "Multi-document upload is reserved for Protect subscribers.",
                    "upgrade_url": "/pricing",
                },
            )
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {tier_limits['max_files']} files per upload",
        )

    for f in files:
        ext = _ext(f.filename or "")
        if ext not in tier_limits["allowed_formats"]:
            raise HTTPException(
                status_code=400,
                detail=f"Format not allowed for your plan: .{ext}. Allowed: {sorted(tier_limits['allowed_formats'])}",
            )


@router.post("/cases/upload-multiple")
async def upload_multiple(
    files: List[UploadFile] = File(...),
    user_context: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """Upload N documents into a single new case. Returns `case_id` so the
    frontend calls `POST /analyze/trigger?case_id=...` to kick off the
    cinematic. The cinematic is the only progress UI."""
    tier = _tier_for(current_user)
    tl = LIMITS[tier]
    _validate_files(files, tier, tl)

    # Read all files first, validate per-file size, accumulate metadata.
    payloads: list[dict] = []
    for f in files:
        content = await f.read()
        if len(content) > tl["max_bytes_per_file"]:
            mb = tl["max_bytes_per_file"] // (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"File '{f.filename}' exceeds {mb} MB limit for your plan",
            )
        if not content:
            raise HTTPException(status_code=400, detail=f"File '{f.filename}' is empty")
        ext = _ext(f.filename or "")
        # Normalize HEIC/HEIF → jpg for downstream consistency
        if ext in ("heic", "heif"):
            ext = "jpg"
            ctype = "image/jpeg"
        else:
            ctype = f.content_type or "application/octet-stream"
        payloads.append({
            "filename": f.filename, "ext": ext, "content_type": ctype, "bytes": content,
        })

    # Create the case shell (status = analyzing).
    now_iso = datetime.now(timezone.utc).isoformat()
    case_id = f"case_{uuid.uuid4().hex[:12]}"
    user_country = current_user.jurisdiction or "US"
    user_region = current_user.region or ""
    user_language = current_user.language or "en"
    main_filename = payloads[0]["filename"]

    await db.cases.insert_one({
        "case_id": case_id, "user_id": current_user.user_id,
        "title": f"Analyzing {main_filename}…",
        "type": "other", "status": "analyzing",
        "country": user_country, "region": user_region, "language": user_language,
        "risk_score": 0, "risk_financial": 0, "risk_urgency": 0,
        "risk_legal_strength": 0, "risk_complexity": 0,
        "risk_score_history": [],
        "deadline": None, "deadline_description": None,
        "financial_exposure": None,
        "ai_summary": "Analysis in progress…",
        "ai_findings": [], "ai_next_steps": [],
        "recommend_lawyer": False, "battle_preview": None,
        "document_count": len(payloads),
        "created_at": now_iso, "updated_at": now_iso,
    })
    logger.info(f"Multi-upload: created case {case_id} with {len(payloads)} docs (tier={tier})")

    # Persist each document (storage + text extraction + DB row).
    document_ids: list[str] = []
    # Lazy import to avoid pulling the heavy server module symbols at import time.
    from server import extract_text_from_pdf, extract_text_from_docx
    for i, p in enumerate(payloads):
        document_id = f"doc_{uuid.uuid4().hex[:12]}"
        storage_path = f"{APP_NAME}/documents/{current_user.user_id}/{uuid.uuid4()}.{p['ext']}"
        try:
            put_object(storage_path, p["bytes"], p["content_type"])
        except Exception as e:
            logger.error(f"storage upload failed for {p['filename']}: {e}")
            storage_path = None

        extracted_text = ""
        if p["ext"] == "pdf":
            try: extracted_text = await extract_text_from_pdf(p["bytes"], filename=p.get("filename", ""))
            except Exception: pass
        elif p["ext"] == "docx":
            try: extracted_text = extract_text_from_docx(p["bytes"])
            except Exception: pass

        await db.documents.insert_one({
            "document_id": document_id, "case_id": case_id,
            "user_id": current_user.user_id,
            "file_name": p["filename"], "file_url": None,
            "storage_path": storage_path, "file_type": p["ext"],
            "extracted_text": extracted_text[:50000] if extracted_text else None,
            "status": "analyzing",
            "is_key_document": (i == 0),  # first uploaded doc is the key one
            "uploaded_at": now_iso,
        })
        document_ids.append(document_id)

    await db.case_events.insert_one({
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "case_id": case_id,
        "event_type": "case_opened",
        "title": "Case opened",
        "description": (
            f"{len(payloads)} documents uploaded: " + ", ".join(p["filename"] for p in payloads)
        ),
        "metadata": {"document_count": len(payloads), "user_context": (user_context or "")[:500]},
        "created_at": now_iso,
    })

    return {
        "case_id": case_id,
        "document_count": len(payloads),
        "document_ids": document_ids,
        "tier": tier,
        "streaming": True,
    }
