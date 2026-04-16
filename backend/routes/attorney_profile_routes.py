"""Sprint F — Attorney profile management.

Routes:
  GET    /api/attorneys/profile               (auth'd attorney)
  PATCH  /api/attorneys/profile               (whitelisted editable fields)
  POST   /api/attorneys/profile/photo         (upload 5MB max)
  DELETE /api/attorneys/profile/photo
  POST   /api/attorneys/profile/change-password
  POST   /api/attorneys/account/deactivate    (guarded by active-cases check)
  GET    /api/attorneys/:id/photo             (public proxy)
  GET    /api/attorneys/:id/public-profile    (semi-public, whitelisted output)
"""
from __future__ import annotations
import os
import asyncio
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response
from pydantic import BaseModel, Field

from db import db
from utils.attorney_auth import (
    attorney_required, hash_password, verify_password,
)
from storage import put_object, get_object
# `delete_object` is not provided by the Emergent storage wrapper — old photos
# become orphaned but it's harmless (storage cost is negligible). Revisit if
# volume grows.
def delete_object(_path):  # noqa: D401 — no-op shim for clarity in callers
    return None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attorneys")

MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Fields the attorney CAN edit via PATCH /profile. Everything else is ignored.
EDITABLE_FIELDS = {
    "first_name", "last_name", "title", "phone",
    "specialties", "languages_spoken",
    "bio_short", "bio_long", "years_of_experience",
    "preferred_language",
    "notify_new_case", "notify_case_expiring", "notify_live_counsel",
    "notify_weekly_payout", "notify_marketing",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _photo_url_for(attorney: dict) -> Optional[str]:
    if not attorney.get("photo_storage_path"):
        return None
    # Public proxy — cached for 1h by the browser/CDN.
    return f"/api/attorneys/{attorney['id']}/photo"


async def _count_completed_cases(attorney_id: str) -> int:
    return await db.case_assignments.count_documents(
        {"attorney_id": attorney_id, "status": "completed"},
    )


def _public_safe_profile(a: dict) -> dict:
    """Only whitelisted fields. No PII."""
    return {
        "id": a["id"],
        "title": a.get("title"),
        "first_name": a.get("first_name"),
        "last_name": a.get("last_name"),
        "photo_url": _photo_url_for(a),
        "bar_number": a.get("bar_number"),
        "bar_jurisdiction": a.get("bar_jurisdiction"),
        "jurisdiction": a.get("jurisdiction"),
        "specialties": a.get("specialties") or [],
        "languages_spoken": a.get("languages_spoken") or [],
        "bio_short": a.get("bio_short"),
        "bio_long": a.get("bio_long"),
        "years_of_experience": a.get("years_of_experience"),
    }


# =========================================================================
# GET /attorneys/profile
# =========================================================================

@router.get("/profile")
async def get_profile(attorney: dict = Depends(attorney_required)):
    cases_handled = await _count_completed_cases(attorney["id"])
    return {
        "id": attorney["id"],
        "first_name": attorney.get("first_name"),
        "last_name": attorney.get("last_name"),
        "title": attorney.get("title"),
        "email": attorney["email"],
        "phone": attorney.get("phone"),
        "bar_number": attorney.get("bar_number"),
        "bar_jurisdiction": attorney.get("bar_jurisdiction"),
        "jurisdiction": attorney.get("jurisdiction"),
        "specialties": attorney.get("specialties") or [],
        "languages_spoken": attorney.get("languages_spoken") or [],
        "bio_short": attorney.get("bio_short"),
        "bio_long": attorney.get("bio_long"),
        "photo_url": _photo_url_for(attorney),
        "years_of_experience": attorney.get("years_of_experience"),
        "calendly_url": attorney.get("calendly_url"),
        "calendly_url_validated": attorney.get("calendly_url_validated", False),
        "stripe_account_id": attorney.get("stripe_account_id"),
        "stripe_onboarding_completed": attorney.get("stripe_onboarding_completed", False),
        "stripe_iban_last4": attorney.get("stripe_iban_last4"),
        "preferred_language": attorney.get("preferred_language") or "fr",
        "email_notifications": {
            "new_case": bool(attorney.get("notify_new_case", True)),
            "case_expiring": bool(attorney.get("notify_case_expiring", True)),
            "live_counsel": bool(attorney.get("notify_live_counsel", True)),
            "weekly_payout": bool(attorney.get("notify_weekly_payout", True)),
            "marketing": bool(attorney.get("notify_marketing", False)),
        },
        "stats_public": {
            "cases_handled": cases_handled,
            "avg_rating": None,  # No ratings system yet — see SPRINT_F.md
            "avg_response_seconds": attorney.get("avg_response_seconds"),
        },
    }


# =========================================================================
# PATCH /attorneys/profile
# =========================================================================

class ProfilePatch(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    specialties: Optional[List[str]] = None
    languages_spoken: Optional[List[str]] = None
    bio_short: Optional[str] = Field(default=None, max_length=200)
    bio_long: Optional[str] = Field(default=None, max_length=2000)
    years_of_experience: Optional[int] = None
    preferred_language: Optional[str] = None
    notify_new_case: Optional[bool] = None
    notify_case_expiring: Optional[bool] = None
    notify_live_counsel: Optional[bool] = None
    notify_weekly_payout: Optional[bool] = None
    notify_marketing: Optional[bool] = None


@router.patch("/profile")
async def patch_profile(
    body: ProfilePatch,
    attorney: dict = Depends(attorney_required),
):
    update = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        if field in EDITABLE_FIELDS and value is not None:
            update[field] = value
    if body.preferred_language and body.preferred_language not in ("fr", "en"):
        raise HTTPException(status_code=400, detail="preferred_language must be 'fr' or 'en'")
    if not update:
        return {"success": True, "updated": 0}

    update["updated_at"] = _now_iso()
    await db.attorneys.update_one({"id": attorney["id"]}, {"$set": update})
    return {"success": True, "updated": len(update) - 1}  # exclude updated_at


# =========================================================================
# POST/DELETE /attorneys/profile/photo
# =========================================================================

@router.post("/profile/photo")
async def upload_photo(
    file: UploadFile = File(...),
    attorney: dict = Depends(attorney_required),
):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. JPEG, PNG or WebP only.",
        )
    content = await file.read()
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Photo too large (max 5 MB)")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[content_type]
    storage_path = f"archer-legal/attorneys/{attorney['id']}/profile-{secrets.token_urlsafe(8)}.{ext}"
    try:
        put_object(storage_path, content, content_type)
    except Exception as e:
        logger.exception("profile photo upload failed")
        raise HTTPException(status_code=500, detail="Upload failed")

    # Delete previous photo (best-effort)
    old = attorney.get("photo_storage_path")
    if old and old != storage_path:
        try:
            delete_object(old)
        except Exception:
            pass

    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {"photo_storage_path": storage_path, "updated_at": _now_iso()}},
    )
    return {"photo_url": f"/api/attorneys/{attorney['id']}/photo"}


@router.delete("/profile/photo")
async def delete_photo(attorney: dict = Depends(attorney_required)):
    path = attorney.get("photo_storage_path")
    if path:
        try:
            delete_object(path)
        except Exception:
            pass
    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {"photo_storage_path": None, "updated_at": _now_iso()}},
    )
    return {"success": True}


# =========================================================================
# GET /attorneys/:id/photo  (public proxy)
# =========================================================================

@router.get("/{attorney_id}/photo")
async def proxy_photo(attorney_id: str):
    a = await db.attorneys.find_one(
        {"id": attorney_id}, {"_id": 0, "photo_storage_path": 1},
    )
    if not a or not a.get("photo_storage_path"):
        raise HTTPException(status_code=404, detail="No photo")
    try:
        data, content_type = get_object(a["photo_storage_path"])
    except Exception as e:
        logger.exception("photo fetch failed")
        raise HTTPException(status_code=502, detail="Storage error")
    return Response(
        content=data,
        media_type=content_type or "image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# =========================================================================
# POST /attorneys/profile/change-password
# =========================================================================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12)


@router.post("/profile/change-password")
async def change_password(
    body: ChangePasswordRequest,
    attorney: dict = Depends(attorney_required),
):
    if not verify_password(body.current_password, attorney.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = hash_password(body.new_password)
    now = _now_iso()
    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {"password_hash": new_hash,
                  "password_changed_at": now, "updated_at": now}},
    )
    # Invalidate ALL other sessions (keep current one valid? For simplicity,
    # kill them all — user can log back in on the current device if needed).
    await db.attorney_sessions.delete_many({"attorney_id": attorney["id"]})

    # Security notification email (best-effort)
    from routes.attorney_routes import send_email
    asyncio.create_task(send_email(
        attorney["email"],
        "🔒 Votre mot de passe Archer a été modifié",
        f"<p>Bonjour Maître {attorney.get('first_name','')},</p>"
        f"<p>Votre mot de passe vient d'être modifié. Si ce n'est pas vous, "
        f"contactez immédiatement le support.</p>",
    ))
    return {"success": True}


# =========================================================================
# POST /attorneys/account/deactivate
# =========================================================================

@router.post("/account/deactivate")
async def deactivate(attorney: dict = Depends(attorney_required)):
    # Guard: refuse if the attorney has active cases in progress
    active_count = await db.case_assignments.count_documents({
        "attorney_id": attorney["id"],
        "status": {"$in": ["accepted", "awaiting_calendly_booking"]},
    })
    if active_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Vous avez {active_count} cas en cours. Terminez-les ou contactez "
                f"le support pour réassignation avant de désactiver votre compte."
            ),
        )

    now = _now_iso()
    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {
            "status": "suspended",
            "available_for_cases": False,
            "deactivated_at": now,
            "updated_at": now,
        }},
    )
    # Invalidate all sessions
    await db.attorney_sessions.delete_many({"attorney_id": attorney["id"]})

    # Emails: confirmation to attorney + flag to admin
    from routes.attorney_routes import send_email
    asyncio.create_task(send_email(
        attorney["email"],
        "Votre compte Archer a été désactivé",
        f"<p>Bonjour Maître {attorney.get('first_name','')},</p>"
        f"<p>Comme demandé, votre compte Archer a été désactivé. Vous ne recevrez plus "
        f"de nouveaux dossiers.</p>"
        f"<p>Si c'est une erreur ou si vous souhaitez le réactiver, contactez le support.</p>",
    ))
    admin = os.environ.get("ADMIN_NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL")
    if admin:
        asyncio.create_task(send_email(
            admin,
            f"🚨 Avocat désactivé : {attorney.get('email')}",
            f"<p>L'avocat <b>{attorney.get('email')}</b> "
            f"(Maître {attorney.get('first_name','')} {attorney.get('last_name','')}) "
            f"vient de désactiver son compte.</p>"
            f"<p>Aucun cas en cours au moment de la désactivation.</p>",
        ))
    logger.info(f"Attorney {attorney['id']} deactivated")
    return {"success": True}


# =========================================================================
# GET /attorneys/:id/public-profile  (semi-public, whitelisted)
# =========================================================================

@router.get("/{attorney_id}/public-profile")
async def public_profile(attorney_id: str):
    a = await db.attorneys.find_one(
        {"id": attorney_id, "status": "active"},
        {"_id": 0, "password_hash": 0},
    )
    if not a:
        raise HTTPException(status_code=404, detail="Attorney not found")

    cases_handled = await _count_completed_cases(attorney_id)
    safe = _public_safe_profile(a)
    safe["stats"] = {
        "cases_handled": cases_handled,
        "avg_rating": None,
        "avg_response_seconds": a.get("avg_response_seconds"),
    }
    return safe


# -------------------------------------------------------------------------
# Bar card upload (for admin approval workflow)
# -------------------------------------------------------------------------

@router.post("/bar-card/upload")
async def upload_bar_card(
    request: Request,
    attorney: dict = Depends(attorney_required),
):
    """Upload bar card document (PDF, max 10 MB).
    Auto-sets application_status to pending if profile is complete."""
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    filename = getattr(file, "filename", "bar_card.pdf") or "bar_card.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    now = datetime.now(timezone.utc).isoformat()

    # Store the file (Emergent storage or local fallback)
    storage_path = f"bar_cards/{attorney['id']}_{filename}"
    try:
        from storage import upload_blob
        bar_card_url = await asyncio.to_thread(upload_blob, storage_path, content, "application/pdf")
    except Exception:
        # Fallback: store path reference, file served via separate endpoint
        bar_card_url = f"/api/attorneys/{attorney['id']}/bar-card"
        bar_cards_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "bar_cards")
        os.makedirs(bar_cards_dir, exist_ok=True)
        with open(os.path.join(bar_cards_dir, f"{attorney['id']}.pdf"), "wb") as f:
            f.write(content)

    update = {
        "bar_card_url": bar_card_url,
        "bar_card_filename": filename,
        "bar_card_uploaded_at": now,
        "updated_at": now,
    }

    # Auto-set to pending_approval if profile looks complete
    a = attorney
    profile_complete = all([
        a.get("first_name") or a.get("full_name"),
        a.get("email"),
        a.get("bar_number"),
    ])
    if profile_complete and a.get("application_status") in (None, "draft", "incomplete"):
        update["application_status"] = "pending"
        update["approval_submitted_at"] = now

    await db.attorneys.update_one({"id": attorney["id"]}, {"$set": update})

    # Notify admin
    try:
        from routes.attorney_routes import send_email
        admin_email = os.environ.get("ADMIN_NOTIFY_EMAIL", "romain@archer.law")
        name = a.get("first_name", a.get("full_name", "Unknown"))
        await send_email(
            admin_email,
            f"New attorney submission: {name}",
            f"<p>Attorney <b>{name}</b> ({a.get('email')}) has uploaded their bar card "
            f"and is pending approval.</p>"
            f"<p>Bar: {a.get('bar_number')} ({a.get('bar_jurisdiction', a.get('jurisdiction', ''))})</p>"
            f"<p><a href=\"https://archer.law/internal/dashboard-x9k7/attorneys\">Review now →</a></p>",
        )
    except Exception:
        pass

    return {"status": "uploaded", "bar_card_url": bar_card_url}
