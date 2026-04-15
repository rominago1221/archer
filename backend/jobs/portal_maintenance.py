"""Sprint C — Consolidated 1-min cron for the attorney portal.

Each tick does TWO jobs in sequence:
  (a) Expire pending assignments past their window, then attempt reassignment.
  (b) Send the "15 minutes left" warning for still-pending assignments whose
      remaining window is under the threshold. Idempotent via `expiring_email_sent`.

Runs inside the FastAPI async event loop via APScheduler AsyncIOScheduler.
"""
from __future__ import annotations
import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta

from db import db
from services.attorney_matching import (
    assign_case_to_attorney,
    log_matching_event,
    increment_active_cases,
    notify_attorney_expiring,
)

logger = logging.getLogger(__name__)

EXPIRING_WARNING_MINUTES = int(os.environ.get("ASSIGNMENT_EXPIRING_WARNING_MINUTES", "15"))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts):
    if not ts:
        return None
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# (a) Expire + reassign
# ---------------------------------------------------------------------------

async def expire_and_reassign() -> int:
    """Returns the number of assignments processed (for logging)."""
    now = _now()
    expired = await db.case_assignments.find(
        {"status": "pending", "expires_at": {"$lt": now.isoformat()}},
        {"_id": 0},
    ).to_list(500)

    processed = 0
    for a in expired:
        processed += 1
        await db.case_assignments.update_one(
            {"id": a["id"]},
            {"$set": {"status": "expired", "updated_at": now.isoformat()}},
        )
        # Decrement the attorney's active counter (was incremented at assignment)
        if a.get("attorney_id"):
            await increment_active_cases(a["attorney_id"], -1)
        await log_matching_event(
            a["case_id"], a.get("attorney_id"), "expired_no_response",
            metadata={"assignment_id": a["id"]},
        )

        # Rebuild exclude list (everyone who already had a shot at this case)
        previous = await db.case_assignments.find(
            {"case_id": a["case_id"]}, {"attorney_id": 1, "_id": 0},
        ).to_list(50)
        exclude = list({p["attorney_id"] for p in previous if p.get("attorney_id")})

        new_assignment = await assign_case_to_attorney(
            a["case_id"],
            exclude_attorney_ids=exclude,
            service_type=a.get("service_type") or "attorney_letter",
        )
        if not new_assignment:
            logger.warning(f"portal_maintenance: case {a['case_id']} unmatched after expiry")
    return processed


# ---------------------------------------------------------------------------
# (b) 15-minute warnings
# ---------------------------------------------------------------------------

async def send_expiring_warnings() -> int:
    now = _now()
    threshold = now + timedelta(minutes=EXPIRING_WARNING_MINUTES)
    cursor = db.case_assignments.find(
        {
            "status": "pending",
            "expiring_email_sent": {"$ne": True},
            "expires_at": {"$lte": threshold.isoformat(), "$gt": now.isoformat()},
        },
        {"_id": 0},
    )
    sent = 0
    async for a in cursor:
        attorney = await db.attorneys.find_one({"id": a["attorney_id"]}, {"_id": 0})
        if not attorney:
            continue
        try:
            await notify_attorney_expiring(attorney, a)
        except Exception as e:
            logger.error(f"expiring warning email failed for {a['id']}: {e}")
            continue
        await db.case_assignments.update_one(
            {"id": a["id"]},
            {"$set": {"expiring_email_sent": True}},
        )
        sent += 1
    return sent


# ---------------------------------------------------------------------------
# Health alert — if > 10% of today's assignments are unmatched
# ---------------------------------------------------------------------------

_LAST_HEALTH_ALERT_AT: datetime | None = None


async def maybe_send_health_alert() -> None:
    """Sends an email at most once per hour if the unmatched ratio is > 10%."""
    global _LAST_HEALTH_ALERT_AT
    now = _now()
    if _LAST_HEALTH_ALERT_AT and (now - _LAST_HEALTH_ALERT_AT) < timedelta(hours=1):
        return

    since = (now - timedelta(hours=24)).isoformat()
    total = await db.attorney_matching_log.count_documents(
        {"created_at": {"$gte": since},
         "action": {"$in": ["auto_matched", "no_match"]}},
    )
    if total < 10:
        return
    unmatched = await db.attorney_matching_log.count_documents(
        {"created_at": {"$gte": since}, "action": "no_match"},
    )
    if unmatched * 10 > total:  # > 10%
        from routes.attorney_routes import send_email
        admin = os.environ.get("ADMIN_NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL")
        if admin:
            try:
                await send_email(
                    admin,
                    "🚨 Archer: >10% unmatched cases in 24h",
                    f"<p>{unmatched}/{total} assignments over the last 24h had no matching attorney. "
                    f"Check /admin/matching and consider recruiting more attorneys.</p>",
                )
                _LAST_HEALTH_ALERT_AT = now
            except Exception as e:
                logger.error(f"health alert email failed: {e}")


# ---------------------------------------------------------------------------
# The single tick function registered with the scheduler
# ---------------------------------------------------------------------------

async def send_live_counsel_reminders() -> int:
    """Sprint E — 1h and 10min reminders for upcoming Live Counsel calls.
    Idempotent via reminder_1h_sent / reminder_10min_sent flags.
    """
    from routes.attorney_routes import send_email
    now = _now()
    sent = 0

    async def _send(assignment: dict, when: str) -> None:
        case = await db.cases.find_one({"case_id": assignment["case_id"]}, {"_id": 0}) or {}
        client = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0}) or {}
        attorney = await db.attorneys.find_one({"id": assignment["attorney_id"]}, {"_id": 0}) or {}
        scheduled = _parse(assignment["scheduled_at"])
        pretty = scheduled.strftime("%H:%M UTC") if scheduled else "—"
        room = assignment.get("daily_co_room_url") or ""
        if when == "1h":
            subj = "⏰ Votre consultation commence dans 1h"
            body = (
                f"<p>Votre consultation Archer commence à <b>{pretty}</b>.</p>"
                f"<p>🎥 Lien de la consultation : <a href=\"{room}\">{room}</a></p>"
                f"<p>Pensez à tester votre micro/caméra et à préparer vos documents.</p>"
            )
        else:
            subj = "🔴 Consultation dans 10 min — Rejoindre maintenant"
            body = (
                f"<p>Votre consultation commence dans 10 minutes.</p>"
                f"<p style=\"margin:24px 0;\">"
                f"<a href=\"{room}\" style=\"display:inline-block; background:#1a56db; "
                f"color:white; text-decoration:none; padding:12px 24px; border-radius:8px; "
                f"font-weight:500;\">Rejoindre maintenant →</a></p>"
            )
        for email in (client.get("email"), attorney.get("email")):
            if email:
                try:
                    await send_email(email, subj, body)
                except Exception:
                    logger.exception(f"live counsel {when} email failed for {email}")

    # 1h window: [55min, 65min]
    for a in await db.case_assignments.find(
        {"service_type": "live_counsel", "status": "accepted",
         "reminder_1h_sent": {"$ne": True},
         "scheduled_at": {
             "$gte": (now + timedelta(minutes=55)).isoformat(),
             "$lte": (now + timedelta(minutes=65)).isoformat(),
         }},
        {"_id": 0},
    ).to_list(200):
        await _send(a, "1h")
        await db.case_assignments.update_one(
            {"id": a["id"]}, {"$set": {"reminder_1h_sent": True}},
        )
        sent += 1

    # 10min window: [8min, 12min]
    for a in await db.case_assignments.find(
        {"service_type": "live_counsel", "status": "accepted",
         "reminder_10min_sent": {"$ne": True},
         "scheduled_at": {
             "$gte": (now + timedelta(minutes=8)).isoformat(),
             "$lte": (now + timedelta(minutes=12)).isoformat(),
         }},
        {"_id": 0},
    ).to_list(200):
        await _send(a, "10min")
        await db.case_assignments.update_one(
            {"id": a["id"]}, {"$set": {"reminder_10min_sent": True}},
        )
        sent += 1

    return sent


async def mark_completed_live_counsels() -> int:
    """Sprint E — auto-close Live Counsel calls 30 min past scheduled_at.
    Only closes calls where at least one participant joined (call_started_at set).
    """
    from routes.attorney_routes import send_email
    from services.attorney_matching import increment_active_cases, log_matching_event
    from services.daily_co import delete_room
    now = _now()
    threshold = (now - timedelta(minutes=30)).isoformat()
    rows = await db.case_assignments.find(
        {"service_type": "live_counsel", "status": "accepted",
         "scheduled_at": {"$lt": threshold},
         "call_started_at": {"$ne": None}},
        {"_id": 0},
    ).to_list(200)

    for a in rows:
        await db.case_assignments.update_one(
            {"id": a["id"]},
            {"$set": {
                "status": "completed",
                "completed_at": now.isoformat(),
                "call_ended_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }},
        )
        if a.get("attorney_id"):
            await increment_active_cases(a["attorney_id"], -1)
            await log_matching_event(
                a["case_id"], a["attorney_id"], "completed",
                metadata={"assignment_id": a["id"], "service_type": "live_counsel"},
            )
        if a.get("daily_co_room_name"):
            try:
                import asyncio as _aio
                await _aio.to_thread(delete_room, a["daily_co_room_name"])
            except Exception:
                pass
        case = await db.cases.find_one({"case_id": a["case_id"]}, {"_id": 0}) or {}
        client = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0}) or {}
        if client.get("email"):
            try:
                await send_email(
                    client["email"],
                    "Merci ! Votre consultation est terminée",
                    "<p>Merci d'avoir utilisé Archer Live Counsel. "
                    "Nous espérons que votre consultation a été utile.</p>",
                )
            except Exception:
                pass
    return len(rows)


async def run_tick() -> None:
    """Invoked every minute by APScheduler. Catches everything."""
    try:
        processed = await expire_and_reassign()
        sent = await send_expiring_warnings()
        reminders = await send_live_counsel_reminders()
        completed = await mark_completed_live_counsels()
        if processed or sent or reminders or completed:
            logger.info(
                f"portal_maintenance tick: expired={processed} warnings={sent} "
                f"lc_reminders={reminders} lc_completed={completed}"
            )
    except Exception:
        logger.exception("portal_maintenance tick failed")
    try:
        await maybe_send_health_alert()
    except Exception:
        logger.exception("health alert check failed")
