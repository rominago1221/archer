"""Sprint A — Attorney Portal auth + profile routes.

Mounted under `/api/attorneys/*` (plural) to coexist with the legacy
`/api/attorney/*` (singular) endpoints in `attorney_routes.py`.
"""
import os
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr

from db import db
from utils.attorney_auth import (
    hash_password, verify_password, create_session, consume_magic_link,
    delete_session, attorney_required, ensure_indexes,
    SESSION_COOKIE_NAME, SESSION_DURATION_DAYS, MAGIC_LINK_DURATION_MINUTES,
)
from routes.attorney_routes import send_email, APP_URL, ADMIN_EMAIL

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attorneys")

ALLOWED_SPECIALTIES = {
    "logement", "travail", "famille", "consommation",
    "penal_routier", "civil", "administratif", "assurance",
}
ALLOWED_JURISDICTIONS = {"BE", "US"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts) -> datetime:
    if isinstance(ts, datetime):
        dt = ts
    else:
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _public_attorney(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "email": doc["email"],
        "first_name": doc.get("first_name"),
        "last_name": doc.get("last_name"),
        "photo_url": doc.get("photo_url"),
        "bio": doc.get("bio"),
        "bar_association": doc.get("bar_association"),
        "bar_number": doc.get("bar_number"),
        "year_admitted": doc.get("year_admitted"),
        "jurisdiction": doc.get("jurisdiction"),
        "specialties": doc.get("specialties", []),
        "available_for_cases": doc.get("available_for_cases", True),
        "status": doc.get("status"),
        "stripe_onboarding_completed": doc.get("stripe_onboarding_completed", False),
        "calendly_url": doc.get("calendly_url"),
        "rating_avg": doc.get("rating_avg"),
        "cases_completed": doc.get("cases_completed", 0),
    }


def _set_session_cookie(response: JSONResponse, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_DURATION_DAYS * 24 * 60 * 60,
    )


# =====================================================================
# Models
# =====================================================================

class JoinRequest(BaseModel):
    invitation_code: str
    password: str = Field(min_length=8)
    bar_association: str
    bar_number: str
    year_admitted: int
    jurisdiction: str
    specialties: List[str]
    bio: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MagicLinkRequest(BaseModel):
    email: EmailStr


class AvailabilityRequest(BaseModel):
    available: bool


# =====================================================================
# Email templates
# =====================================================================

def _email_signup_received(first_name: str) -> tuple[str, str]:
    subject = "Votre inscription Archer a bien été reçue"
    html = f"""
    <p>Bonjour Maître {first_name},</p>
    <p>Votre inscription au réseau d'avocats partenaires Archer a bien été enregistrée.</p>
    <p>Notre équipe vérifie actuellement vos informations de barreau.</p>
    <p>Vous recevrez un email de confirmation sous 48h ouvrées dès que votre compte sera activé.</p>
    <p>À très vite,<br/>L'équipe Archer</p>
    """
    return subject, html


def _email_admin_notification(attorney: dict) -> tuple[str, str]:
    subject = f"Nouvel avocat à valider : Maître {attorney.get('first_name','')} {attorney.get('last_name','')}"
    html = f"""
    <p>Un nouvel avocat vient de s'inscrire :</p>
    <ul>
      <li><b>Nom</b> : Maître {attorney.get('first_name','')} {attorney.get('last_name','')}</li>
      <li><b>Email</b> : {attorney.get('email','')}</li>
      <li><b>Barreau</b> : {attorney.get('bar_association','')}</li>
      <li><b>Numéro Bar</b> : {attorney.get('bar_number','')}</li>
      <li><b>Année admission</b> : {attorney.get('year_admitted','')}</li>
      <li><b>Juridiction</b> : {attorney.get('jurisdiction','')}</li>
      <li><b>Spécialités</b> : {", ".join(attorney.get('specialties', []))}</li>
      <li><b>Bio</b> : {attorney.get('bio') or '—'}</li>
    </ul>
    <p>ID à activer : <code>{attorney.get('id')}</code></p>
    <p>Pour activer : passer <code>status</code> à <code>"active"</code> dans la collection <code>attorneys</code>.</p>
    """
    return subject, html


def _email_magic_link(first_name: str, url: str) -> tuple[str, str]:
    subject = "Votre lien de connexion Archer"
    html = f"""
    <p>Bonjour Maître {first_name or ''},</p>
    <p>Cliquez sur le lien ci-dessous pour vous connecter à votre dashboard avocat :</p>
    <p><a href="{url}">{url}</a></p>
    <p>Ce lien est valable {MAGIC_LINK_DURATION_MINUTES} minutes et ne peut être utilisé qu'une seule fois.</p>
    <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    <p>L'équipe Archer</p>
    """
    return subject, html


# =====================================================================
# Endpoints
# =====================================================================

@router.get("/invitation/{code}")
async def check_invitation(code: str):
    inv = await db.attorney_invitations.find_one({"code": code}, {"_id": 0})
    if not inv:
        return JSONResponse(status_code=404, content={"valid": False, "error": "not_found"})
    if inv.get("used"):
        return JSONResponse(status_code=410, content={"valid": False, "error": "used"})
    if _parse(inv["expires_at"]) < _now():
        return JSONResponse(status_code=410, content={"valid": False, "error": "expired"})
    return {
        "valid": True,
        "email": inv.get("email"),
        "first_name": inv.get("first_name"),
        "last_name": inv.get("last_name"),
    }


@router.post("/join", status_code=201)
async def join(req: JoinRequest):
    inv = await db.attorney_invitations.find_one({"code": req.invitation_code}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if inv.get("used"):
        raise HTTPException(status_code=410, detail="Invitation already used")
    if _parse(inv["expires_at"]) < _now():
        raise HTTPException(status_code=410, detail="Invitation expired")

    if req.jurisdiction not in ALLOWED_JURISDICTIONS:
        raise HTTPException(status_code=400, detail="Invalid jurisdiction")
    if len(req.specialties) == 0 or len(req.specialties) > 3:
        raise HTTPException(status_code=400, detail="Specialties must be 1 to 3")
    for s in req.specialties:
        if s not in ALLOWED_SPECIALTIES:
            raise HTTPException(status_code=400, detail=f"Invalid specialty: {s}")
    if req.bio and len(req.bio) > 240:
        raise HTTPException(status_code=400, detail="Bio max 240 chars")

    existing = await db.attorneys.find_one({"email": inv["email"]})
    if existing:
        raise HTTPException(status_code=409, detail="Attorney already exists for this email")

    attorney_id = str(uuid.uuid4())
    now = _now_iso()
    attorney_doc = {
        "id": attorney_id,
        "email": inv["email"],
        "password_hash": hash_password(req.password),
        "first_name": inv.get("first_name"),
        "last_name": inv.get("last_name"),
        "photo_url": None,
        "bio": req.bio,
        "bar_association": req.bar_association,
        "bar_number": req.bar_number,
        "year_admitted": req.year_admitted,
        "jurisdiction": req.jurisdiction,
        "specialties": req.specialties,
        "status": "pending",
        "verified_at": None,
        "verified_by": None,
        "available_for_cases": True,
        "stripe_account_id": None,
        "stripe_onboarding_completed": False,
        "calendly_url": None,
        "rating_avg": None,
        "cases_completed": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.attorneys.insert_one(attorney_doc)
    await db.attorney_invitations.update_one(
        {"code": req.invitation_code},
        {"$set": {"used": True, "used_at": now, "attorney_id": attorney_id}},
    )

    first = attorney_doc.get("first_name") or ""
    subj, html = _email_signup_received(first)
    import asyncio
    asyncio.create_task(send_email(attorney_doc["email"], subj, html))
    admin_notify = os.environ.get("ADMIN_NOTIFY_EMAIL", ADMIN_EMAIL)
    subj2, html2 = _email_admin_notification(attorney_doc)
    asyncio.create_task(send_email(admin_notify, subj2, html2))

    return {
        "success": True,
        "message": "Account created, pending verification",
        "attorney_id": attorney_id,
    }


@router.post("/login")
async def login(req: LoginRequest):
    # Temporary structured logging — surfaces in Emergent logs so we can see
    # exactly which step rejects a login attempt without guessing. Remove
    # once the demo flow is proven stable.
    email_in = req.email or ""
    email_lower = email_in.lower()
    attorney = await db.attorneys.find_one({"email": email_lower}, {"_id": 0}) \
        or await db.attorneys.find_one({"email": email_in}, {"_id": 0})
    if not attorney:
        # Last-resort case-insensitive lookup — diagnostic only, do NOT use
        # for auth decision (keeps the lower/exact contract above intact).
        ci_doc = await db.attorneys.find_one(
            {"email": {"$regex": f"^{re.escape(email_in)}$", "$options": "i"}},
            {"_id": 0, "email": 1, "id": 1, "status": 1},
        )
        logger.warning(
            "attorney_login_fail step=lookup email_in=%r email_lower=%r "
            "ci_match=%s ci_email=%r",
            email_in, email_lower, bool(ci_doc),
            (ci_doc or {}).get("email"),
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    pwd_hash = attorney.get("password_hash") or ""
    if not verify_password(req.password, pwd_hash):
        logger.warning(
            "attorney_login_fail step=verify_password email=%r id=%r "
            "hash_prefix=%r hash_len=%d password_len=%d",
            attorney.get("email"), attorney.get("id"),
            pwd_hash[:7], len(pwd_hash), len(req.password or ""),
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    status = attorney.get("status")
    if status != "active":
        logger.warning(
            "attorney_login_fail step=status email=%r id=%r status=%r",
            attorney.get("email"), attorney.get("id"), status,
        )
        raise HTTPException(status_code=403, detail="Account not yet verified")

    token, _ = await create_session(attorney["id"], session_type="session")
    logger.info("attorney_login_ok email=%r id=%r", attorney.get("email"), attorney.get("id"))
    response = JSONResponse(content={"success": True, "attorney": _public_attorney(attorney)})
    _set_session_cookie(response, token)
    return response


@router.post("/login/magic-link")
async def magic_link(req: MagicLinkRequest):
    attorney = await db.attorneys.find_one({"email": req.email}, {"_id": 0})
    if attorney and attorney.get("status") == "active":
        token, _ = await create_session(attorney["id"], session_type="magic_link")
        url = f"{APP_URL}/attorneys/login/verify?token={token}"
        subj, html = _email_magic_link(attorney.get("first_name") or "", url)
        import asyncio
        asyncio.create_task(send_email(attorney["email"], subj, html))
    return {"success": True, "message": "If this email exists, a magic link was sent"}


@router.get("/login/verify-magic/{token}")
async def verify_magic(token: str):
    attorney = await consume_magic_link(token)
    if not attorney:
        raise HTTPException(status_code=410, detail="Magic link invalid or expired")
    session_token, _ = await create_session(attorney["id"], session_type="session")
    response = JSONResponse(content={"success": True, "attorney": _public_attorney(attorney)})
    _set_session_cookie(response, session_token)
    return response


@router.post("/logout")
async def logout(request: Request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[len("Bearer "):]
    await delete_session(token)
    response = JSONResponse(content={"success": True})
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return response


@router.get("/me")
async def get_me(attorney: dict = Depends(attorney_required)):
    return _public_attorney(attorney)


@router.patch("/availability")
async def update_availability(req: AvailabilityRequest, attorney: dict = Depends(attorney_required)):
    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {"available_for_cases": bool(req.available), "updated_at": _now_iso()}},
    )
    return {"success": True, "available_for_cases": bool(req.available)}
