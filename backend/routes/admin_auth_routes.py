"""Admin authentication routes.

POST /api/admin/auth/login
POST /api/admin/auth/logout
GET  /api/admin/auth/me
POST /api/admin/auth/change-password
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from db import db
from utils.admin_auth import (
    admin_required,
    hash_password,
    verify_password,
    create_admin_token,
    log_admin_action,
    _check_rate_limit,
    _record_attempt,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/auth")


class LoginInput(BaseModel):
    email: str
    password: str


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
async def admin_login(body: LoginInput, request: Request):
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)

    admin = await db.admins.find_one({"email": body.email.lower().strip()}, {"_id": 0})
    if not admin or not admin.get("is_active", True):
        _record_attempt(ip)
        logger.warning(f"Admin login failed: unknown email {body.email} from {ip}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(body.password, admin["password_hash"]):
        _record_attempt(ip)
        logger.warning(f"Admin login failed: wrong password for {body.email} from {ip}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_admin_token(admin["id"], admin["email"])

    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}},
    )
    await log_admin_action(admin, "login", ip_address=ip)

    return {
        "access_token": token,
        "admin": {
            "id": admin["id"],
            "email": admin["email"],
            "full_name": admin.get("full_name"),
            "role": admin.get("role"),
        },
    }


@router.post("/logout")
async def admin_logout(admin: dict = Depends(admin_required)):
    # Stateless JWT — nothing to invalidate server-side.
    # Frontend deletes the token.
    return {"status": "logged_out"}


@router.get("/me")
async def admin_me(admin: dict = Depends(admin_required)):
    return {
        "admin": {
            "id": admin["id"],
            "email": admin["email"],
            "full_name": admin.get("full_name"),
            "role": admin.get("role"),
            "last_login_at": admin.get("last_login_at"),
        },
    }


@router.post("/change-password")
async def admin_change_password(
    body: ChangePasswordInput,
    admin: dict = Depends(admin_required),
):
    if len(body.new_password) < 12:
        raise HTTPException(status_code=400, detail="Password must be at least 12 characters")

    if not verify_password(body.current_password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password incorrect")

    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    await log_admin_action(admin, "change_password")

    return {"status": "password_changed"}
