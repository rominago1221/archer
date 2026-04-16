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


async def mark_no_show_live_counsels() -> int:
    """Mark Live Counsel assignments as no_show when scheduled_at + 45min is past
    and neither party joined (call_started_at IS NULL).
    Notifies both client and attorney.
    """
    from routes.attorney_routes import send_email
    now = _now()
    threshold = (now - timedelta(minutes=45)).isoformat()
    rows = await db.case_assignments.find(
        {"service_type": "live_counsel", "status": "accepted",
         "scheduled_at": {"$lt": threshold},
         "call_started_at": None},
        {"_id": 0},
    ).to_list(200)

    for a in rows:
        await db.case_assignments.update_one(
            {"id": a["id"]},
            {"$set": {
                "status": "no_show",
                "completed_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }},
        )
        if a.get("attorney_id"):
            await increment_active_cases(a["attorney_id"], -1)
            await log_matching_event(
                a["case_id"], a["attorney_id"], "no_show",
                metadata={"assignment_id": a["id"], "service_type": "live_counsel"},
            )
        if a.get("daily_co_room_name"):
            try:
                from services.daily_co import delete_room
                await asyncio.to_thread(delete_room, a["daily_co_room_name"])
            except Exception:
                pass

        case = await db.cases.find_one({"case_id": a["case_id"]}, {"_id": 0}) or {}
        client = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0}) or {}
        attorney = await db.attorneys.find_one({"id": a.get("attorney_id")}, {"_id": 0}) or {}

        if client.get("email"):
            try:
                await send_email(
                    client["email"],
                    "Consultation manquée — Archer",
                    "<p>Votre consultation Live Counsel n'a pas eu lieu (aucune des "
                    "deux parties ne s'est connectée).</p>"
                    "<p>Contactez-nous pour planifier un nouveau créneau ou obtenir "
                    "un remboursement.</p>",
                )
            except Exception:
                logger.exception(f"no_show client email failed for {a['id']}")
        if attorney.get("email"):
            try:
                await send_email(
                    attorney["email"],
                    "No-show consultation — Archer",
                    f"<p>La consultation Live Counsel pour le dossier #{a['case_id'][-4:]} "
                    f"n'a pas eu lieu. L'assignation a été marquée comme no-show.</p>",
                )
            except Exception:
                logger.exception(f"no_show attorney email failed for {a['id']}")

    return len(rows)


async def refund_expired_unboooked_live_counsels() -> int:
    """Auto-refund Live Counsel payments when client paid but never booked
    within 7 days (status still awaiting_calendly_booking, scheduled_at IS NULL,
    paid_at > 7 days ago).
    Refunds via Stripe, notifies client, releases attorney.
    """
    from routes.attorney_routes import send_email
    import stripe as _stripe
    _stripe.api_key = os.environ.get("STRIPE_API_KEY")
    now = _now()
    cutoff = (now - timedelta(days=7)).isoformat()

    rows = await db.case_assignments.find(
        {"service_type": "live_counsel",
         "status": "awaiting_calendly_booking",
         "scheduled_at": None,
         "created_at": {"$lt": cutoff}},
        {"_id": 0},
    ).to_list(200)

    refunded = 0
    for a in rows:
        case = await db.cases.find_one({"case_id": a["case_id"]}, {"_id": 0}) or {}
        pi_id = case.get("payment_intent_id")

        # Attempt Stripe refund
        if pi_id:
            try:
                await asyncio.to_thread(_stripe.Refund.create, payment_intent=pi_id)
                await db.cases.update_one(
                    {"case_id": a["case_id"]},
                    {"$set": {
                        "payment_status": "refunded",
                        "refunded_at": now.isoformat(),
                        "updated_at": now.isoformat(),
                    }},
                )
            except Exception:
                logger.exception(f"stripe refund failed for case {a['case_id']} pi={pi_id}")
                continue

        # Mark assignment cancelled + release attorney
        await db.case_assignments.update_one(
            {"id": a["id"]},
            {"$set": {
                "status": "cancelled_refunded",
                "completed_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }},
        )
        if a.get("attorney_id"):
            await increment_active_cases(a["attorney_id"], -1)
            await log_matching_event(
                a["case_id"], a["attorney_id"], "cancelled_refunded",
                metadata={"assignment_id": a["id"], "reason": "7d_no_booking"},
            )

        # Notify client
        client = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0}) or {}
        if client.get("email"):
            try:
                await send_email(
                    client["email"],
                    "Remboursement Live Counsel — Archer",
                    "<p>Vous n'avez pas réservé de créneau pour votre consultation Live "
                    "Counsel dans les 7 jours suivant votre paiement.</p>"
                    "<p>Votre paiement de 149 € a été remboursé automatiquement. "
                    "Le remboursement apparaîtra sous 5 à 10 jours ouvrés.</p>"
                    "<p>Vous pouvez à tout moment relancer une consultation depuis "
                    "votre espace client.</p>",
                )
            except Exception:
                logger.exception(f"refund email failed for case {a['case_id']}")

        refunded += 1

    return refunded


_LAST_SIMILAR_STATS_AT: datetime | None = None


async def recompute_similar_cases_stats() -> int:
    """Daily cron: precompute similar cases stats per case_type + jurisdiction.
    Stored in similar_cases_stats collection for fast reads.
    Runs at most once per 23 hours."""
    global _LAST_SIMILAR_STATS_AT
    now = _now()
    if _LAST_SIMILAR_STATS_AT and (now - _LAST_SIMILAR_STATS_AT) < timedelta(hours=23):
        return 0

    pipeline = [
        {"$match": {"case_outcome": {"$in": ["won", "lost", "settled"]},
                     "is_publicly_anonymizable": {"$ne": False}}},
        {"$group": {
            "_id": {"case_type": "$type", "jurisdiction": "$country"},
            "total_similar": {"$sum": 1},
            "won_count": {"$sum": {"$cond": [{"$eq": ["$case_outcome", "won"]}, 1, 0]}},
            "settled_count": {"$sum": {"$cond": [{"$eq": ["$case_outcome", "settled"]}, 1, 0]}},
        }},
    ]
    results = await db.cases.aggregate(pipeline).to_list(200)
    updated = 0
    for r in results:
        total = r["total_similar"]
        won = r["won_count"]
        win_rate = round((won / total) * 100, 1) if total > 0 else 0
        await db.similar_cases_stats.update_one(
            {"case_type": r["_id"]["case_type"], "jurisdiction": r["_id"]["jurisdiction"]},
            {"$set": {
                "case_type": r["_id"]["case_type"],
                "jurisdiction": r["_id"]["jurisdiction"],
                "total_similar": total,
                "won_count": won,
                "settled_count": r["settled_count"],
                "win_rate_percent": win_rate,
                "computed_at": now.isoformat(),
            }},
            upsert=True,
        )
        updated += 1

    _LAST_SIMILAR_STATS_AT = now
    if updated:
        logger.info(f"similar_cases_stats: recomputed {updated} type/jurisdiction combos")
    return updated


_LAST_DAILY_DIGEST_AT: datetime | None = None


async def send_admin_daily_digest() -> int:
    """Daily digest email to all active admins (runs at most once per 22h)."""
    global _LAST_DAILY_DIGEST_AT
    now = _now()
    if _LAST_DAILY_DIGEST_AT and (now - _LAST_DAILY_DIGEST_AT) < timedelta(hours=22):
        return 0

    # Only send between 4:00-5:00 UTC (8:00 Dubai)
    if now.hour != 4:
        return 0

    from routes.attorney_routes import send_email

    yesterday_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0).isoformat()
    today_start = now.replace(hour=0, minute=0, second=0).isoformat()

    new_customers = await db.users.count_documents({
        "created_at": {"$gte": yesterday_start, "$lt": today_start},
        "account_type": {"$ne": "attorney"},
    })
    new_cases = await db.cases.count_documents({"created_at": {"$gte": yesterday_start, "$lt": today_start}})
    paid_cases = await db.cases.find(
        {"paid_at": {"$gte": yesterday_start, "$lt": today_start}},
        {"amount_paid_cents": 1, "_id": 0},
    ).to_list(500)
    revenue = sum(c.get("amount_paid_cents", 0) for c in paid_cases)
    attorneys_pending = await db.attorneys.count_documents({"application_status": "pending"})

    admins = await db.admins.find({"is_active": True}, {"email": 1, "id": 1, "_id": 0}).to_list(10)
    sent = 0
    for admin in admins:
        settings = await db.admin_notification_settings.find_one({"admin_id": admin["id"]})
        if settings and not settings.get("notify_daily_digest", True):
            continue
        try:
            await send_email(
                admin["email"],
                f"Archer Daily Digest — {now.strftime('%d %b %Y')}",
                f"<h2>Daily Digest</h2>"
                f"<table style='font-size:14px;border-collapse:collapse;'>"
                f"<tr><td style='padding:6px 16px 6px 0;color:#6b7280;'>New customers</td>"
                f"<td style='font-weight:700;'>{new_customers}</td></tr>"
                f"<tr><td style='padding:6px 16px 6px 0;color:#6b7280;'>New cases</td>"
                f"<td style='font-weight:700;'>{new_cases}</td></tr>"
                f"<tr><td style='padding:6px 16px 6px 0;color:#6b7280;'>Revenue</td>"
                f"<td style='font-weight:700;color:#16a34a;'>"
                f"{'%.2f' % (revenue / 100)} EUR</td></tr>"
                f"<tr><td style='padding:6px 16px 6px 0;color:#6b7280;'>Attorneys pending</td>"
                f"<td style='font-weight:700;color:{'#b91c1c' if attorneys_pending else '#16a34a'};'>"
                f"{attorneys_pending}</td></tr>"
                f"</table>"
                f"<p style='margin-top:20px;'>"
                f"<a href='https://archer.law/internal/dashboard-x9k7' "
                f"style='display:inline-block;background:#0a0a0f;color:#fff;"
                f"padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;'>"
                f"Open Dashboard</a></p>",
            )
            sent += 1
        except Exception:
            logger.exception(f"daily digest failed for {admin['email']}")

    _LAST_DAILY_DIGEST_AT = now
    if sent:
        logger.info(f"admin daily digest sent to {sent} admins")
    return sent


async def run_tick() -> None:
    """Invoked every minute by APScheduler. Catches everything."""
    try:
        processed = await expire_and_reassign()
        sent = await send_expiring_warnings()
        reminders = await send_live_counsel_reminders()
        completed = await mark_completed_live_counsels()
        no_shows = await mark_no_show_live_counsels()
        refunds = await refund_expired_unboooked_live_counsels()
        if processed or sent or reminders or completed or no_shows or refunds:
            logger.info(
                f"portal_maintenance tick: expired={processed} warnings={sent} "
                f"lc_reminders={reminders} lc_completed={completed} "
                f"lc_no_shows={no_shows} lc_refunds={refunds}"
            )
    except Exception:
        logger.exception("portal_maintenance tick failed")
    try:
        await maybe_send_health_alert()
    except Exception:
        logger.exception("health alert check failed")
    try:
        await recompute_similar_cases_stats()
    except Exception:
        logger.exception("similar cases stats recompute failed")
    try:
        await send_admin_daily_digest()
    except Exception:
        logger.exception("admin daily digest failed")
