"""Attorney portal auth helpers — parallel auth stack for the Sprint A attorney portal.

Kept intentionally separate from `auth.py` (which handles client users) so the legacy
attorney system (account_type='attorney' on the users collection) can stay in place.
Collections used:
  - attorneys
  - attorney_invitations
  - attorney_sessions  (type='session' or 'magic_link')
"""
import os
import secrets
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from fastapi import Header, Request, HTTPException
from db import db

logger = logging.getLogger(__name__)

SESSION_DURATION_DAYS = int(os.environ.get("ATTORNEY_SESSION_DURATION_DAYS", "30"))
MAGIC_LINK_DURATION_MINUTES = int(os.environ.get("ATTORNEY_MAGIC_LINK_DURATION_MINUTES", "15"))
SESSION_COOKIE_NAME = "attorney_session"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def generate_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


async def create_session(attorney_id: str, session_type: str = "session") -> tuple[str, datetime]:
    """Create a session row in `attorney_sessions`. Returns (token, expires_at)."""
    token = generate_token(32)
    if session_type == "magic_link":
        expires_at = _now() + timedelta(minutes=MAGIC_LINK_DURATION_MINUTES)
    else:
        expires_at = _now() + timedelta(days=SESSION_DURATION_DAYS)
    await db.attorney_sessions.insert_one({
        "attorney_id": attorney_id,
        "token": token,
        "type": session_type,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": _now().isoformat(),
    })
    return token, expires_at


async def get_attorney_from_session(token: str | None) -> dict | None:
    """Return the attorney doc for a valid session token, else None.

    Only accepts `type='session'` tokens (magic_link tokens are consumed elsewhere).
    """
    if not token:
        return None
    sess = await db.attorney_sessions.find_one({"token": token, "type": "session"}, {"_id": 0})
    if not sess:
        return None
    if _parse_ts(sess["expires_at"]) < _now():
        return None
    attorney = await db.attorneys.find_one({"id": sess["attorney_id"]}, {"_id": 0})
    return attorney


async def consume_magic_link(token: str) -> dict | None:
    """Validate + consume a magic_link token. Returns the attorney doc or None."""
    if not token:
        return None
    sess = await db.attorney_sessions.find_one({"token": token, "type": "magic_link"}, {"_id": 0})
    if not sess or sess.get("used"):
        return None
    if _parse_ts(sess["expires_at"]) < _now():
        return None
    await db.attorney_sessions.update_one(
        {"token": token}, {"$set": {"used": True, "used_at": _now().isoformat()}}
    )
    return await db.attorneys.find_one({"id": sess["attorney_id"]}, {"_id": 0})


async def delete_session(token: str) -> None:
    if token:
        await db.attorney_sessions.delete_one({"token": token, "type": "session"})


def _extract_token(authorization: str | None, request: Request | None) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        return authorization[len("Bearer "):]
    if request is not None:
        return request.cookies.get(SESSION_COOKIE_NAME)
    return None


async def attorney_required(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict:
    """FastAPI dependency — returns the active attorney doc or raises 401/403."""
    token = _extract_token(authorization, request)
    attorney = await get_attorney_from_session(token)
    if not attorney:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if attorney.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account not active")
    return attorney


async def ensure_indexes() -> None:
    """Create indexes for the attorney portal collections. Safe to call repeatedly."""
    await db.attorneys.create_index("email", unique=True)
    await db.attorneys.create_index("id", unique=True)
    await db.attorney_invitations.create_index("code", unique=True)
    await db.attorney_sessions.create_index("token", unique=True)
    await db.attorney_sessions.create_index("attorney_id")
    # Sprint B — case assignments + audit log
    await db.case_assignments.create_index("id", unique=True)
    await db.case_assignments.create_index([("attorney_id", 1), ("status", 1)])
    await db.case_assignments.create_index("case_id")
    await db.case_assignments.create_index("expires_at")
    await db.attorney_case_access_log.create_index([("attorney_id", 1), ("created_at", -1)])
    await db.attorney_case_access_log.create_index("assignment_id")
    # Sprint C — matching log
    await db.attorney_matching_log.create_index([("case_id", 1), ("created_at", -1)])
    await db.attorney_matching_log.create_index([("action", 1), ("created_at", -1)])


async def migrate_sprint_c_fields() -> None:
    """Idempotent backfill for Sprint C fields (active_cases_count,
    avg_response_seconds, case.attorney_status). Only sets values on
    documents where the field is missing.
    """
    await db.attorneys.update_many(
        {"active_cases_count": {"$exists": False}},
        {"$set": {"active_cases_count": 0}},
    )
    await db.attorneys.update_many(
        {"avg_response_seconds": {"$exists": False}},
        {"$set": {"avg_response_seconds": None}},
    )
    await db.cases.update_many(
        {"attorney_status": {"$exists": False}},
        {"$set": {"attorney_status": None}},
    )
    await db.case_assignments.update_many(
        {"expiring_email_sent": {"$exists": False}},
        {"$set": {"expiring_email_sent": False}},
    )


async def migrate_sprint_d_fields() -> None:
    """Idempotent backfill for Sprint D fields on attorneys and cases."""
    await db.attorneys.update_many(
        {"stripe_onboarding_started_at": {"$exists": False}},
        {"$set": {"stripe_onboarding_started_at": None}},
    )
    await db.attorneys.update_many(
        {"stripe_onboarding_completed_at": {"$exists": False}},
        {"$set": {"stripe_onboarding_completed_at": None}},
    )
    await db.attorneys.update_many(
        {"stripe_iban_last4": {"$exists": False}},
        {"$set": {"stripe_iban_last4": None}},
    )
    await db.cases.update_many(
        {"payment_status": {"$exists": False}},
        {"$set": {"payment_status": None}},
    )
    # Sprint D — payouts table indexes
    await db.payouts.create_index([("attorney_id", 1), ("created_at", -1)])
    await db.payouts.create_index("stripe_transfer_id")
    await db.payouts.create_index("stripe_payout_id")


async def migrate_sprint_e_fields() -> None:
    """Idempotent backfill for Sprint E (Live Counsel) fields."""
    await db.attorneys.update_many(
        {"calendly_url": {"$exists": False}},
        {"$set": {"calendly_url": None}},
    )
    await db.attorneys.update_many(
        {"calendly_url_validated": {"$exists": False}},
        {"$set": {"calendly_url_validated": False}},
    )
    await db.case_assignments.update_many(
        {"scheduled_at": {"$exists": False}},
        {"$set": {"scheduled_at": None}},
    )
    await db.case_assignments.update_many(
        {"daily_co_room_url": {"$exists": False}},
        {"$set": {"daily_co_room_url": None, "daily_co_room_name": None,
                  "calendly_event_url": None, "calendly_invitee_uri": None,
                  "call_started_at": None, "call_ended_at": None,
                  "reminder_1h_sent": False, "reminder_10min_sent": False}},
    )
    # Indexes for live counsel queries
    await db.case_assignments.create_index(
        [("attorney_id", 1), ("service_type", 1), ("scheduled_at", 1)],
    )
    await db.case_assignments.create_index("scheduled_at")
    await db.case_assignments.create_index("calendly_invitee_uri")


async def migrate_sprint_f_fields() -> None:
    """Idempotent backfill for Sprint F — profile extended fields."""
    defaults = {
        "title": None,
        "bar_jurisdiction": None,
        "languages_spoken": [],
        "bio_short": None,
        "bio_long": None,
        "photo_storage_path": None,
        "years_of_experience": None,
        "preferred_language": "fr",
        "notify_new_case": True,
        "notify_case_expiring": True,
        "notify_live_counsel": True,
        "notify_weekly_payout": True,
        "notify_marketing": False,
        "password_changed_at": None,
    }
    for field, default in defaults.items():
        await db.attorneys.update_many(
            {field: {"$exists": False}},
            {"$set": {field: default}},
        )
