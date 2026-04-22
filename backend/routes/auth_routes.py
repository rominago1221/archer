"""Auth & Profile route handlers."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import uuid
import httpx
import logging
from datetime import datetime, timezone, timedelta
from db import db
from auth import hash_password, verify_password, get_current_user, create_session_response
from models import User, EmailRegister, EmailLogin, ProfileUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/auth/session")
async def create_session(request: Request):
    """Exchange session_id from Emergent Auth for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=30.0
            )
            response.raise_for_status()
            auth_data = response.json()
    except Exception as e:
        logger.error(f"Emergent Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid session_id")

    email = auth_data.get("email")
    name = auth_data.get("name", email.split("@")[0] if email else "User")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")

    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "plan": "pro" if email in ("romain@nestorconfidential.com", "debe.romain@gmail.com") else "free",
            "state_of_residence": None, "phone": None,
            "notif_risk_score": True, "notif_deadlines": True, "notif_calls": True,
            "notif_lawyers": False, "notif_promo": False,
            "data_sharing": True, "improve_ai": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "session_token": session_token, "user_id": user_id,
        "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    response = JSONResponse(content={"user": user_doc, "session_token": session_token})
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7 * 24 * 60 * 60)
    return response


@router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user.model_dump()


@router.post("/auth/logout")
async def logout(request: Request):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    return response


@router.post("/auth/register")
async def register_email(body: EmailRegister):
    email = body.email.strip().lower()
    password = body.password.strip()
    name = body.name.strip()
    plan = body.plan if body.plan in ["free", "pro"] else "free"
    # FREEZE US — default BE (au lieu de US). Les users qui envoient
    # explicitement "US" sont acceptes en base (pour ne pas casser les
    # attorneys US) mais les endpoints d'analyse les rejettent.
    # A M6+, retirer le freeze et restaurer le support US complet.
    jurisdiction = body.jurisdiction if body.jurisdiction in ["US", "BE"] else (body.country if body.country in ["US", "BE"] else "BE")

    if not email or not password or not name:
        raise HTTPException(status_code=400, detail="Email, password and name are required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    # FREEZE US — default language = fr-BE pour un user BE sans language explicite.
    _default_language = "fr-BE" if jurisdiction == "BE" else "en"
    user_doc = {
        "user_id": user_id, "email": email, "name": name, "picture": None,
        "password_hash": hash_password(password), "auth_provider": "email",
        "plan": plan, "country": jurisdiction, "jurisdiction": jurisdiction,
        "region": body.region, "language": body.language or _default_language,
        "account_type": body.account_type if body.account_type in ("client", "attorney") else "client",
        "state_of_residence": None, "phone": None,
        "notif_risk_score": True, "notif_deadlines": True, "notif_calls": True,
        "notif_lawyers": False, "notif_promo": False,
        "data_sharing": True, "improve_ai": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return await create_session_response(user_id, user_doc, clear_old=False)


@router.post("/auth/login")
async def login_email(body: EmailLogin):
    email = body.email.strip().lower()
    password = body.password.strip()
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    stored_hash = user_doc.get("password_hash")
    if not stored_hash:
        raise HTTPException(status_code=401, detail="This account uses social login. Please sign in with Google, Apple, or Facebook.")

    if not verify_password(password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return await create_session_response(user_doc["user_id"], user_doc)


# ── Profile ──

@router.put("/profile")
async def update_profile(update: ProfileUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "jurisdiction" in update_data:
        update_data["country"] = update_data["jurisdiction"]
    if update_data:
        await db.users.update_one({"user_id": current_user.user_id}, {"$set": update_data})
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return user_doc


@router.put("/profile/plan")
async def update_plan(plan: str = "pro", current_user: User = Depends(get_current_user)):
    if plan not in ["free", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    await db.users.update_one({"user_id": current_user.user_id}, {"$set": {"plan": plan}})
    return {"message": f"Plan updated to {plan}"}
