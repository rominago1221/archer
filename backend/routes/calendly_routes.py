"""Sprint E — Calendly connect/disconnect for attorneys (simple URL, no OAuth)."""
from __future__ import annotations
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from db import db
from utils.attorney_auth import attorney_required

router = APIRouter(prefix="/attorneys/calendly")

CALENDLY_URL_PATTERN = re.compile(r"^https://calendly\.com/[\w\-]+/[\w\-]+/?$")


class ConnectRequest(BaseModel):
    calendly_url: str


@router.post("/connect")
async def connect(body: ConnectRequest, attorney: dict = Depends(attorney_required)):
    url = body.calendly_url.strip()
    if not CALENDLY_URL_PATTERN.match(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid Calendly URL. Expected format: https://calendly.com/your-name/30min",
        )
    url = url.rstrip("/")
    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {
            "calendly_url": url,
            "calendly_url_validated": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"success": True, "calendly_url": url}


@router.post("/disconnect")
async def disconnect(attorney: dict = Depends(attorney_required)):
    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {
            "calendly_url": None,
            "calendly_url_validated": False,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"success": True}
