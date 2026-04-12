"""Authentication helpers — password hashing, session management, user resolution."""
import uuid
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Header, Request, Depends
from fastapi.responses import JSONResponse
from db import db
from models import User

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


async def get_current_user(authorization: str = Header(None), request: Request = None) -> User:
    session_token = None
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    if not session_token and request:
        session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    return User(**user_doc)


async def create_session_response(user_id: str, user_doc: dict, clear_old: bool = True) -> JSONResponse:
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if clear_old:
        await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)

    safe_user = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}
    response = JSONResponse(content={"user": safe_user, "session_token": session_token})
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60
    )
    return response
