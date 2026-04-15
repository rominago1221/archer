"""Phase 2 — Client notifications.

A lightweight notification system for the client dashboard. Powers the
NotificationBell + LetterReadyBanner UI. Notifications are written by other
endpoints (e.g. the attorney upload-letter handler) via `create_notification()`.

Collection: `client_notifications`
Type enum: letter_ready | case_accepted | case_assigned | live_counsel_reminder
           | document_extracted | other
"""
from __future__ import annotations
import asyncio
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional, Literal, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from db import db
from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)
router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Internal helper — used by other route modules to fire a notification.
# ---------------------------------------------------------------------------

NotificationType = Literal[
    "letter_ready", "case_accepted", "case_assigned",
    "live_counsel_reminder", "document_extracted", "other",
]


async def create_notification(
    *, client_user_id: str, type: str, title: str, message: str,
    case_id: Optional[str] = None, action_url: Optional[str] = None,
) -> str:
    """Insert a notification doc. Best-effort: never raises."""
    try:
        nid = secrets.token_urlsafe(12)
        await db.client_notifications.insert_one({
            "id": nid,
            "client_id": client_user_id,
            "type": type,
            "title": title,
            "message": message,
            "case_id": case_id,
            "action_url": action_url,
            "read": False,
            "created_at": _now_iso(),
        })
        return nid
    except Exception:
        logger.exception("create_notification failed")
        return ""


async def ensure_indexes() -> None:
    await db.client_notifications.create_index(
        [("client_id", 1), ("read", 1), ("created_at", -1)],
    )
    await db.client_notifications.create_index("id", unique=True)


# ---------------------------------------------------------------------------
# GET /api/notifications
# ---------------------------------------------------------------------------

@router.get("/notifications")
async def list_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
):
    limit = max(1, min(limit, 100))
    q: dict = {"client_id": current_user.user_id}
    if unread_only:
        q["read"] = False
    rows = await db.client_notifications.find(q, {"_id": 0}).sort(
        "created_at", -1,
    ).to_list(limit)
    unread_count = await db.client_notifications.count_documents({
        "client_id": current_user.user_id, "read": False,
    })
    return {"notifications": rows, "unread_count": unread_count}


# ---------------------------------------------------------------------------
# PATCH /api/notifications/:id/mark-read
# ---------------------------------------------------------------------------

@router.patch("/notifications/{notification_id}/mark-read")
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    result = await db.client_notifications.update_one(
        {"id": notification_id, "client_id": current_user.user_id},
        {"$set": {"read": True, "read_at": _now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


# ---------------------------------------------------------------------------
# POST /api/notifications/mark-all-read
# ---------------------------------------------------------------------------

@router.post("/notifications/mark-all-read")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    result = await db.client_notifications.update_many(
        {"client_id": current_user.user_id, "read": False},
        {"$set": {"read": True, "read_at": _now_iso()}},
    )
    return {"success": True, "marked": result.modified_count}
