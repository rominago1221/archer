"""Sprint B — Attorney portal case endpoints.

Mounted under `/api/attorneys/cases/*` (portal, parallel to legacy).
All routes go through `attorney_required` + ownership check on assignments.

EVERY attorney-facing response MUST go through `serialize_case_for_attorney()`
from utils.case_serializer — that's the single source of truth for
anonymization. Do not bypass.
"""
import os
import asyncio
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from db import db
from utils.attorney_auth import attorney_required
from utils.attorney_audit import log_attorney_access
from utils.case_serializer import (
    serialize_case_for_attorney,
    serialize_row_for_inbox,
    serialize_row_for_active,
    serialize_row_for_completed,
    client_snapshot_from_user,
    calculate_earnings_breakdown,
)
from services.attorney_matching import (
    increment_active_cases,
    record_response_time,
    log_matching_event,
    notify_attorney_accepted,
)
from storage import get_object, put_object
from routes.attorney_routes import send_email, APP_URL

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attorneys/cases")


MAX_LETTER_BYTES = 10 * 1024 * 1024  # 10 MB
DECLINE_REASONS = {"outside_specialty", "conflict_of_interest", "overloaded", "other"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _parse(ts):
    if not ts:
        return None
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


async def _require_assignment(assignment_id: str, attorney: dict) -> dict:
    a = await db.case_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if a.get("attorney_id") != attorney["id"]:
        raise HTTPException(status_code=403, detail="Not your assignment")
    return a


async def _fetch_case_and_docs(case_id: str) -> tuple[dict, list[dict]]:
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0}) or {}
    docs = await db.documents.find({"case_id": case_id}, {"_id": 0}).to_list(50)
    return case, docs


# =========================================================================
# Request models
# =========================================================================

class DeclineRequest(BaseModel):
    reason: Literal["outside_specialty", "conflict_of_interest", "overloaded", "other"]
    notes: Optional[str] = None


# =========================================================================
# GET /attorneys/cases/inbox
# =========================================================================

@router.get("/inbox")
async def inbox(
    type: str = "all",
    sort: str = "urgency",
    attorney: dict = Depends(attorney_required),
):
    """Pending assignments for the current attorney."""
    q = {"attorney_id": attorney["id"], "status": "pending"}
    if type in ("attorney_letter", "live_counsel"):
        q["service_type"] = type
    elif type == "letter":
        q["service_type"] = "attorney_letter"

    items = await db.case_assignments.find(q, {"_id": 0}).to_list(200)

    # Expire any assignments whose window has passed, in place.
    fresh = []
    now = _now()
    expired_ids = []
    for a in items:
        exp = _parse(a.get("expires_at"))
        if exp and exp < now:
            expired_ids.append(a["id"])
        else:
            fresh.append(a)
    if expired_ids:
        await db.case_assignments.update_many(
            {"id": {"$in": expired_ids}},
            {"$set": {"status": "expired", "updated_at": _now_iso()}},
        )

    if sort == "recent":
        fresh.sort(key=lambda a: a.get("assigned_at") or "", reverse=True)
    else:
        fresh.sort(key=lambda a: a.get("expires_at") or "")

    rows = [serialize_row_for_inbox(a) for a in fresh]
    expiring_soon = sum(1 for r in rows if r["is_urgent"])
    return {
        "cases": rows,
        "stats": {
            "pending_count": len(rows),
            "expiring_soon_count": expiring_soon,
        },
    }


# =========================================================================
# GET /attorneys/cases/active
# =========================================================================

@router.get("/active")
async def active_cases(attorney: dict = Depends(attorney_required)):
    items = await db.case_assignments.find(
        {"attorney_id": attorney["id"], "status": "accepted"},
        {"_id": 0},
    ).to_list(200)
    items.sort(key=lambda a: a.get("deadline_at") or "")
    return {"cases": [serialize_row_for_active(a) for a in items]}


# =========================================================================
# GET /attorneys/cases/completed
# =========================================================================

@router.get("/completed")
async def completed_cases(attorney: dict = Depends(attorney_required)):
    items = await db.case_assignments.find(
        {"attorney_id": attorney["id"], "status": "completed"},
        {"_id": 0},
    ).to_list(500)
    items.sort(key=lambda a: a.get("completed_at") or "", reverse=True)
    return {"cases": [serialize_row_for_completed(a) for a in items]}


# =========================================================================
# GET /attorneys/cases/:assignment_id
# =========================================================================

@router.get("/{assignment_id}")
async def case_detail(
    assignment_id: str,
    request: Request,
    attorney: dict = Depends(attorney_required),
):
    a = await _require_assignment(assignment_id, attorney)

    # Auto-expire pending assignments whose window passed.
    if a.get("status") == "pending":
        exp = _parse(a.get("expires_at"))
        if exp and exp < _now():
            await db.case_assignments.update_one(
                {"id": a["id"]},
                {"$set": {"status": "expired", "updated_at": _now_iso()}},
            )
            a["status"] = "expired"

    case, docs = await _fetch_case_and_docs(a["case_id"])
    payload = serialize_case_for_attorney(a, case, docs)
    asyncio.create_task(log_attorney_access(
        attorney["id"], assignment_id, "viewed",
        {"status": a.get("status")},
    ))
    return payload


# =========================================================================
# POST /attorneys/cases/:id/accept
# =========================================================================

@router.post("/{assignment_id}/accept")
async def accept_case(assignment_id: str, attorney: dict = Depends(attorney_required)):
    a = await _require_assignment(assignment_id, attorney)
    status = a.get("status")
    if status != "pending":
        if status == "expired":
            raise HTTPException(status_code=410, detail="Assignment expired")
        raise HTTPException(status_code=409, detail=f"Assignment is {status}")

    exp = _parse(a.get("expires_at"))
    if exp and exp < _now():
        await db.case_assignments.update_one(
            {"id": a["id"]},
            {"$set": {"status": "expired", "updated_at": _now_iso()}},
        )
        raise HTTPException(status_code=410, detail="Assignment expired")

    # Snapshot client PII at accept time — privilege is locked here.
    user = await db.users.find_one({"user_id": a.get("client_user_id")}, {"_id": 0}) or {}
    snapshot = client_snapshot_from_user(user)

    now = _now()
    accepted_at = now.isoformat()
    deadline_at = (now + timedelta(hours=4)).isoformat()

    await db.case_assignments.update_one(
        {"id": a["id"]},
        {"$set": {
            "status": "accepted",
            "accepted_at": accepted_at,
            "deadline_at": deadline_at,
            "client_snapshot": snapshot,
            "updated_at": accepted_at,
        }},
    )
    asyncio.create_task(log_attorney_access(
        attorney["id"], assignment_id, "accepted",
        {"privilege_locked_at": accepted_at},
    ))

    # Sprint C — update attorney response-time metric
    assigned_at_dt = _parse(a.get("assigned_at"))
    if assigned_at_dt:
        response_seconds = (now - assigned_at_dt).total_seconds()
        asyncio.create_task(record_response_time(attorney["id"], response_seconds))
    asyncio.create_task(log_matching_event(
        a.get("case_id"), attorney["id"], "accepted",
        metadata={"assignment_id": assignment_id},
    ))
    asyncio.create_task(notify_attorney_accepted(attorney, {**a, "deadline_at": deadline_at,
                                                           "case_number": a.get("case_number")}))

    # Notify client + admin (best-effort)
    if user.get("email"):
        subject = "Your case has been accepted by an Archer attorney"
        name = f"{attorney.get('first_name','')} {attorney.get('last_name','')}".strip()
        html = f"<p>Good news — Maître {name} has just accepted your case.</p>" \
               f"<p>Your signed attorney letter will be delivered within 4 hours.</p>"
        asyncio.create_task(send_email(user["email"], subject, html))
    admin_notify = os.environ.get("ADMIN_NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL")
    if admin_notify:
        asyncio.create_task(send_email(
            admin_notify,
            f"[Archer] Assignment accepted — {a.get('case_number')}",
            f"<p>Attorney {attorney.get('email')} accepted assignment {a['id']}.</p>",
        ))

    return {
        "success": True,
        "assignment_id": a["id"],
        "status": "accepted",
        "deadline_at": deadline_at,
        "client_revealed": True,
    }


# =========================================================================
# POST /attorneys/cases/:id/decline
# =========================================================================

@router.post("/{assignment_id}/decline")
async def decline_case(
    assignment_id: str,
    body: DeclineRequest,
    attorney: dict = Depends(attorney_required),
):
    a = await _require_assignment(assignment_id, attorney)
    if a.get("status") != "pending":
        raise HTTPException(status_code=409, detail=f"Assignment is {a.get('status')}")

    notes = (body.notes or "").strip()[:200]
    now_iso = _now_iso()
    await db.case_assignments.update_one(
        {"id": a["id"]},
        {"$set": {
            "status": "declined",
            "declined_at": now_iso,
            "decline_reason": body.reason,
            "decline_notes": notes or None,
            "updated_at": now_iso,
        }},
    )
    asyncio.create_task(log_attorney_access(
        attorney["id"], assignment_id, "declined",
        {"reason": body.reason},
    ))
    # Sprint C — decrement active counter + log event + trigger reassignment
    asyncio.create_task(increment_active_cases(attorney["id"], -1))
    asyncio.create_task(log_matching_event(
        a.get("case_id"), attorney["id"], "declined",
        metadata={"assignment_id": assignment_id, "reason": body.reason},
    ))
    # Trigger reassignment asynchronously (exclude everyone who already saw this case)
    async def _reassign_after_decline():
        try:
            previous = await db.case_assignments.find(
                {"case_id": a["case_id"]}, {"attorney_id": 1, "_id": 0},
            ).to_list(50)
            exclude = list({p["attorney_id"] for p in previous if p.get("attorney_id")})
            from services.attorney_matching import assign_case_to_attorney
            await assign_case_to_attorney(a["case_id"],
                                          exclude_attorney_ids=exclude,
                                          service_type=a.get("service_type") or "attorney_letter")
        except Exception as e:
            logger.error(f"reassign after decline failed: {e}")
    asyncio.create_task(_reassign_after_decline())

    # Consecutive-decline warning (non-conflict_of_interest)
    if body.reason != "conflict_of_interest":
        recent = await db.case_assignments.find(
            {"attorney_id": attorney["id"], "status": "declined"},
            {"_id": 0, "decline_reason": 1, "declined_at": 1},
        ).sort("declined_at", -1).to_list(3)
        if len(recent) >= 3 and all(r.get("decline_reason") != "conflict_of_interest" for r in recent):
            admin_notify = os.environ.get("ADMIN_NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL")
            if admin_notify:
                asyncio.create_task(send_email(
                    admin_notify,
                    f"[Archer] Attorney {attorney.get('email')} declined 3 in a row",
                    f"<p>Latest reasons: {[r.get('decline_reason') for r in recent]}</p>",
                ))

    # Reassignment algorithm = Sprint C. For now we flag for reassignment.
    return {
        "success": True,
        "reassigned": False,
        "next_attorney_notified": False,
    }


# =========================================================================
# GET /attorneys/cases/:id/documents/:doc_id/preview
# =========================================================================

@router.get("/{assignment_id}/documents/{doc_id}/preview")
async def preview_document(
    assignment_id: str,
    doc_id: str,
    request: Request,
    attorney: dict = Depends(attorney_required),
):
    a = await _require_assignment(assignment_id, attorney)
    is_accepted = a.get("status") in ("accepted", "completed")

    doc = await db.documents.find_one(
        {"document_id": doc_id, "case_id": a["case_id"]},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    is_main = bool(doc.get("is_key_document"))
    if not is_accepted and not is_main:
        raise HTTPException(status_code=403, detail="Document locked until acceptance")

    if not doc.get("storage_path"):
        raise HTTPException(status_code=404, detail="File not available")

    try:
        data, content_type = get_object(doc["storage_path"])
    except Exception as e:
        logger.error(f"preview fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Storage fetch failed")

    asyncio.create_task(log_attorney_access(
        attorney["id"], assignment_id, "downloaded_doc",
        {"document_id": doc_id, "ip": request.client.host if request.client else None},
    ))
    return Response(
        content=data,
        media_type=content_type or "application/pdf",
        headers={"Content-Disposition": f"inline; filename={doc.get('file_name', 'document.pdf')}"},
    )


# =========================================================================
# POST /attorneys/cases/:id/upload-letter
# =========================================================================

@router.post("/{assignment_id}/upload-letter")
async def upload_signed_letter(
    assignment_id: str,
    file: UploadFile = File(...),
    attorney: dict = Depends(attorney_required),
):
    a = await _require_assignment(assignment_id, attorney)
    if a.get("status") != "accepted":
        raise HTTPException(status_code=409, detail="Case must be accepted before upload")

    content = await file.read()
    if len(content) > MAX_LETTER_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
    if (file.content_type or "").lower() not in ("application/pdf", "application/x-pdf"):
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    storage_path = f"archer-legal/attorneys/{attorney['id']}/signed/{secrets.token_urlsafe(12)}.pdf"
    try:
        put_object(storage_path, content, "application/pdf")
    except Exception as e:
        logger.error(f"upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

    now = _now()
    now_iso = now.isoformat()
    # Next Monday 09:00 UTC
    days_until_monday = (7 - now.weekday()) % 7 or 7
    payout_scheduled = (now + timedelta(days=days_until_monday)).replace(
        hour=9, minute=0, second=0, microsecond=0
    ).isoformat()

    await db.case_assignments.update_one(
        {"id": a["id"]},
        {"$set": {
            "signed_letter_storage_path": storage_path,
            "signed_letter_uploaded_at": now_iso,
            "status": "completed",
            "completed_at": now_iso,
            "payout_scheduled_at": payout_scheduled,
            "updated_at": now_iso,
        }},
    )
    asyncio.create_task(log_attorney_access(
        attorney["id"], assignment_id, "uploaded_letter",
        {"size_bytes": len(content)},
    ))
    # Sprint C — case completed, decrement active counter
    asyncio.create_task(increment_active_cases(attorney["id"], -1))
    asyncio.create_task(log_matching_event(
        a.get("case_id"), attorney["id"], "completed",
        metadata={"assignment_id": assignment_id},
    ))
    client = a.get("client_snapshot") or {}
    attorney_full = f"Maître {attorney.get('first_name','')} {attorney.get('last_name','')}".strip()
    case_number = a.get("case_number") or (a.get("case_id", "") or "")[-4:]
    first_name = client.get("first_name") or ""

    # Phase 2 — upgraded email with explicit CTA + named attorney + case number
    if client.get("email"):
        view_url = f"{os.environ.get('APP_URL','https://archer.legal').rstrip('/')}/cases/{a.get('case_id')}"
        subject = (f"Votre lettre d'avocat est prête, {first_name}".strip(", ")
                   if first_name else "Votre lettre d'avocat est prête")
        html = (
            f"<p>Bonjour{(' ' + first_name) if first_name else ''},</p>"
            f"<p><b>{attorney_full}</b> a signé votre lettre pour le dossier "
            f"<b>#{case_number}</b>.</p>"
            f"<p style='margin:24px 0;'>"
            f"<a href='{view_url}' "
            f"style='display:inline-block; background:#1a56db; color:white; "
            f"text-decoration:none; padding:12px 24px; border-radius:8px; "
            f"font-weight:500;'>Voir ma lettre →</a>"
            f"</p>"
            f"<p style='color:#6b7280; font-size:13px;'>"
            f"Vous pouvez aussi la télécharger depuis votre dashboard Archer.</p>"
        )
        asyncio.create_task(send_email(client["email"], subject, html))

    # Phase 2 — in-app notification (powers NotificationBell + LetterReadyBanner)
    client_user_id = a.get("client_user_id")
    if client_user_id:
        from routes.client_notifications_routes import create_notification
        asyncio.create_task(create_notification(
            client_user_id=client_user_id,
            type="letter_ready",
            title="Votre lettre d'avocat est prête !",
            message=f"{attorney_full} a signé votre lettre pour le dossier #{case_number}.",
            case_id=a.get("case_id"),
            action_url=f"/cases/{a.get('case_id')}",
        ))

    return {
        "success": True,
        "status": "completed",
        "client_notified": bool(client.get("email")),
        "payout_scheduled_at": payout_scheduled,
    }


# =========================================================================
# GET /attorneys/cases/:id/signed-letter — stream the signed PDF back
# =========================================================================

@router.get("/{assignment_id}/signed-letter")
async def download_signed_letter(
    assignment_id: str,
    attorney: dict = Depends(attorney_required),
):
    a = await _require_assignment(assignment_id, attorney)
    path = a.get("signed_letter_storage_path")
    if not path:
        raise HTTPException(status_code=404, detail="No signed letter uploaded")
    data, content_type = get_object(path)
    return Response(
        content=data,
        media_type=content_type or "application/pdf",
        headers={"Content-Disposition": f"inline; filename=signed_letter_{a.get('case_number','')}.pdf"},
    )
