"""Sprint E — Daily.co service wrapper for Live Counsel video calls.

All calls use the synchronous `requests` library. Invoke via
`asyncio.to_thread()` from async code.

Note: `enable_recording` is intentionally OFF for MVP (GDPR + attorney-client
privilege). Rebrand with a consent flow before enabling.
"""
from __future__ import annotations
import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
import requests

logger = logging.getLogger(__name__)

DAILY_API_KEY = os.environ.get("DAILY_CO_API_KEY")
DAILY_API_BASE = os.environ.get("DAILY_CO_API_BASE", "https://api.daily.co/v1")


def _headers() -> dict:
    if not DAILY_API_KEY:
        raise RuntimeError("DAILY_CO_API_KEY not configured")
    return {"Authorization": f"Bearer {DAILY_API_KEY}"}


def _to_ts(dt: datetime) -> int:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


def create_room(case_id: str, scheduled_at: datetime, *, lang: str = "fr") -> dict:
    """Create a private Daily.co room for a Live Counsel.

    The room auto-expires 2h after `scheduled_at` and ejects participants then.
    Returns {room_url, room_name, expires_at}.
    """
    expires = scheduled_at + timedelta(hours=2)
    room_name = f"archer-{case_id[-8:]}-{secrets.token_hex(4)}"
    resp = requests.post(
        f"{DAILY_API_BASE}/rooms",
        headers=_headers(),
        json={
            "name": room_name,
            "privacy": "private",
            "properties": {
                "max_participants": 2,
                "enable_chat": True,
                "enable_screenshare": True,
                # enable_recording intentionally omitted — see module docstring.
                "exp": _to_ts(expires),
                "eject_at_room_exp": True,
                "lang": lang if lang in ("en", "fr") else "en",
            },
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return {
        "room_url": data["url"],
        "room_name": data["name"],
        "expires_at": expires.isoformat(),
    }


def create_meeting_token(
    room_name: str,
    user_name: str,
    *,
    is_attorney: bool = False,
    valid_hours: int = 3,
) -> str:
    """Create a short-lived token so a participant can join the private room.

    Attorney is the `is_owner=True` party (can mute/eject).
    """
    expires = datetime.now(timezone.utc) + timedelta(hours=valid_hours)
    resp = requests.post(
        f"{DAILY_API_BASE}/meeting-tokens",
        headers=_headers(),
        json={
            "properties": {
                "room_name": room_name,
                "user_name": user_name,
                "is_owner": is_attorney,
                "exp": _to_ts(expires),
            },
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["token"]


def delete_room(room_name: Optional[str]) -> None:
    if not room_name:
        return
    try:
        requests.delete(
            f"{DAILY_API_BASE}/rooms/{room_name}",
            headers=_headers(),
            timeout=10,
        )
    except Exception as e:
        logger.warning(f"Failed to delete Daily.co room {room_name}: {e}")
