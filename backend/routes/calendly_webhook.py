"""Sprint E — Calendly webhook for invitee.created / invitee.canceled.

The tracking link convention used by the frontend: the iframe URL includes
`?utm_content=<case_id>`. Calendly echoes this in the webhook payload under
`payload.tracking.utm_content`.
"""
from __future__ import annotations
import os
import json
import hmac
import hashlib
import logging
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException

from db import db
from services.daily_co import create_room, delete_room

logger = logging.getLogger(__name__)
router = APIRouter()

CALENDLY_WEBHOOK_SIGNING_KEY = os.environ.get("CALENDLY_WEBHOOK_SIGNING_KEY", "")


def _verify_signature(payload: bytes, header: str | None) -> bool:
    if not CALENDLY_WEBHOOK_SIGNING_KEY:
        logger.error("CALENDLY_WEBHOOK_SIGNING_KEY is not configured")
        return False
    if not header:
        return False
    # Calendly format: "t=<timestamp>,v1=<signature>"
    try:
        parts = dict(kv.split("=", 1) for kv in header.split(","))
        t = parts.get("t", "")
        v1 = parts.get("v1", "")
    except Exception:
        return False
    if not t or not v1:
        return False
    signed = f"{t}.".encode() + payload
    expected = hmac.new(
        CALENDLY_WEBHOOK_SIGNING_KEY.encode(),
        signed,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, v1)


def _parse_iso(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/webhooks/calendly")
async def calendly_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("calendly-webhook-signature")
    if not _verify_signature(payload, sig):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        event = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("event")
    body = event.get("payload") or {}

    if event_type == "invitee.created":
        await _handle_booking(body)
    elif event_type == "invitee.canceled":
        await _handle_cancellation(body)

    return {"received": True, "event": event_type}


async def _extract_assignment_id(body: dict) -> str | None:
    """Sprint E (v2): utm_content MUST carry the case_assignment_id set by
    the post-payment redirect. Native Calendly param, passed through in the
    webhook payload at `payload.tracking.utm_content`. No fallback — if
    missing, log and flag for manual investigation.
    """
    tracking = body.get("tracking") or {}
    return tracking.get("utm_content") or None


async def _handle_booking(body: dict):
    assignment_id = await _extract_assignment_id(body)
    if not assignment_id:
        logger.error(
            f"⚠️ Calendly booking without utm_content (case_assignment_id). "
            f"email={body.get('email')} — manual review required."
        )
        return

    assignment = await db.case_assignments.find_one(
        {"id": assignment_id, "service_type": "live_counsel"},
        {"_id": 0},
    )
    if not assignment:
        logger.error(
            f"⚠️ Calendly booking for unknown assignment_id={assignment_id} "
            f"(email={body.get('email')}) — manual review required."
        )
        return
    if assignment.get("status") not in ("awaiting_calendly_booking", "accepted"):
        logger.warning(
            f"Calendly booking for assignment {assignment_id} with "
            f"unexpected status={assignment.get('status')} — skipping"
        )
        return
    case_id = assignment["case_id"]

    scheduled_event = body.get("scheduled_event") or {}
    start_time = scheduled_event.get("start_time")
    if not start_time:
        logger.error(f"Calendly booking missing start_time for case {case_id}")
        return
    scheduled_at = _parse_iso(start_time)

    # Create Daily.co room
    try:
        room = await asyncio.to_thread(create_room, case_id, scheduled_at)
    except Exception as e:
        logger.exception(f"Daily.co room creation failed for case {case_id}: {e}")
        # Still record the scheduled time; room will be created lazily at join
        room = None

    update = {
        "status": "accepted",  # transition awaiting_calendly_booking → accepted
        "accepted_at": _now_iso(),
        "scheduled_at": scheduled_at.isoformat(),
        "calendly_event_url": scheduled_event.get("uri"),
        "calendly_invitee_uri": body.get("uri"),
        "updated_at": _now_iso(),
    }
    if room:
        update["daily_co_room_url"] = room["room_url"]
        update["daily_co_room_name"] = room["room_name"]
    await db.case_assignments.update_one({"id": assignment["id"]}, {"$set": update})
    # Log the transition in the matching audit
    from services.attorney_matching import log_matching_event
    await log_matching_event(
        case_id, assignment["attorney_id"], "accepted",
        metadata={"assignment_id": assignment["id"],
                  "service_type": "live_counsel",
                  "via": "calendly_booking"},
    )

    # Notify both parties
    from routes.attorney_routes import send_email
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0}) or {}
    client = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0}) or {}
    attorney = await db.attorneys.find_one({"id": assignment["attorney_id"]}, {"_id": 0}) or {}

    pretty = scheduled_at.strftime("%A %d %B %Y, %H:%M UTC")

    if client.get("email"):
        subj = f"✓ Consultation programmée — {pretty}"
        html = (
            f"<p>Bonjour,</p>"
            f"<p>Votre consultation avec Maître {attorney.get('first_name','')} "
            f"{attorney.get('last_name','')} est confirmée :</p>"
            f"<p>📅 {pretty}<br/>⏱ Durée : 30 min<br/>🎥 Visioconférence sécurisée</p>"
            f"<p>Vous recevrez le lien de la consultation 1h avant le rendez-vous.</p>"
        )
        asyncio.create_task(send_email(client["email"], subj, html))

    if attorney.get("email"):
        subj = f"🔔 Nouveau Live Counsel — Cas #{assignment.get('case_number')}"
        html = (
            f"<p>Un client vient de booker une consultation :</p>"
            f"<p>📅 {pretty}<br/>📂 Cas #{assignment.get('case_number')} · "
            f"{(assignment.get('case_snapshot') or {}).get('type','—')}</p>"
            f"<p>Vous recevrez le lien Daily.co 1h avant le call.</p>"
        )
        asyncio.create_task(send_email(attorney["email"], subj, html))


async def _handle_cancellation(body: dict):
    invitee_uri = body.get("uri")
    if not invitee_uri:
        return
    assignment = await db.case_assignments.find_one(
        {"calendly_invitee_uri": invitee_uri},
        {"_id": 0},
    )
    if not assignment:
        return
    # Free the slot: clear scheduled_at + room + reminder flags (a new booking
    # will re-create everything cleanly).
    if assignment.get("daily_co_room_name"):
        try:
            await asyncio.to_thread(delete_room, assignment["daily_co_room_name"])
        except Exception:
            pass
    await db.case_assignments.update_one(
        {"id": assignment["id"]},
        {"$set": {
            "scheduled_at": None,
            "daily_co_room_url": None,
            "daily_co_room_name": None,
            "calendly_event_url": None,
            "calendly_invitee_uri": None,
            "reminder_1h_sent": False,
            "reminder_10min_sent": False,
            "updated_at": _now_iso(),
        }},
    )
    logger.info(f"Live counsel canceled for assignment {assignment['id']}")
