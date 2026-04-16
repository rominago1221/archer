"""Admin authentication system — separate from client/attorney auth.

Table: admins (MongoDB collection)
JWT: 4h expiry, HS256
Rate limiting: in-memory, 5 attempts/IP/15min
"""
from __future__ import annotations
import os
import time
import uuid
import logging
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from db import db

logger = logging.getLogger(__name__)

ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET", os.environ.get("ATTORNEY_SESSION_SECRET", "admin-fallback-secret-change-me"))
ADMIN_JWT_EXPIRY_HOURS = 4

security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# In-memory rate limiting for admin login
# ---------------------------------------------------------------------------
_login_attempts: dict[str, list[float]] = {}
_blocked_ips: dict[str, float] = {}
RATE_LIMIT_WINDOW = 900  # 15 minutes
RATE_LIMIT_MAX = 5
BLOCK_DURATION = 3600  # 1 hour


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    # Check if IP is blocked
    if ip in _blocked_ips:
        if now < _blocked_ips[ip]:
            raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
        del _blocked_ips[ip]

    # Clean old attempts
    if ip in _login_attempts:
        _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < RATE_LIMIT_WINDOW]

    # Check count
    if len(_login_attempts.get(ip, [])) >= RATE_LIMIT_MAX:
        _blocked_ips[ip] = now + BLOCK_DURATION
        logger.warning(f"Admin login: IP {ip} blocked for 1h after {RATE_LIMIT_MAX} failed attempts")
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 1 hour.")


def _record_attempt(ip: str) -> None:
    _login_attempts.setdefault(ip, []).append(time.time())


# ---------------------------------------------------------------------------
# Password utilities
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT utilities
# ---------------------------------------------------------------------------
def create_admin_token(admin_id: str, email: str) -> str:
    payload = {
        "sub": admin_id,
        "email": email,
        "type": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=ADMIN_JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm="HS256")


def decode_admin_token(token: str) -> dict:
    try:
        return jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin token")


# ---------------------------------------------------------------------------
# Dependency: admin_required
# ---------------------------------------------------------------------------
async def admin_required(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """FastAPI dependency that verifies the request has a valid admin JWT.
    Returns the admin document from DB."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Admin access required")

    payload = decode_admin_token(credentials.credentials)
    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="Not an admin token")

    admin = await db.admins.find_one(
        {"id": payload["sub"], "is_active": True}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found or deactivated")

    return admin


# ---------------------------------------------------------------------------
# Audit logging
# ---------------------------------------------------------------------------
async def log_admin_action(
    admin: dict,
    action: str,
    entity_type: str = None,
    entity_id: str = None,
    metadata: dict = None,
    ip_address: str = None,
    user_agent: str = None,
) -> None:
    doc = {
        "id": f"alog_{uuid.uuid4().hex[:12]}",
        "admin_id": admin["id"],
        "admin_email": admin.get("email"),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_audit_log.insert_one(doc)
