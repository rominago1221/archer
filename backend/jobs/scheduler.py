"""APScheduler wiring for the attorney portal maintenance loop."""
import os
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from jobs.portal_maintenance import run_tick
from jobs.weekly_payouts import process_weekly_payouts
from jobs.credit_reset import reset_monthly_credits
from jobs.lawyer_routing_status import update_lawyer_routing_status
from jobs.marketplace_maintenance import run_marketplace_tick
from jobs.attorney_daily_reminder import send_daily_attorney_reminders

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def is_enabled() -> bool:
    return os.environ.get("SCHEDULER_ENABLED", "true").lower() != "false"


def start_scheduler() -> None:
    """Start the singleton scheduler. Safe to call more than once."""
    global _scheduler
    if not is_enabled():
        logger.info("Scheduler disabled via SCHEDULER_ENABLED=false")
        return
    if _scheduler is not None and _scheduler.running:
        return
    interval = int(os.environ.get("MATCHING_REASSIGN_INTERVAL_MINUTES", "1"))
    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        run_tick, "interval", minutes=interval,
        id="portal_maintenance", coalesce=True, max_instances=1,
    )
    # Sprint D — weekly payouts cron, Mondays 09:00 UTC
    payouts_enabled = os.environ.get("WEEKLY_PAYOUTS_ENABLED", "true").lower() != "false"
    if payouts_enabled:
        _scheduler.add_job(
            process_weekly_payouts, "cron",
            day_of_week="mon", hour=9, minute=0,
            id="weekly_payouts", coalesce=True, max_instances=1,
        )
    # Credits sprint — monthly hard reset on the 1st, 00:00 UTC.
    credits_enabled = os.environ.get("CREDIT_RESET_ENABLED", "true").lower() != "false"
    if credits_enabled:
        _scheduler.add_job(
            reset_monthly_credits, "cron",
            day=1, hour=0, minute=0,
            id="credit_reset_monthly", coalesce=True, max_instances=1,
        )
    # Lawyer routing status — every hour (trial expiry + past_due sweep).
    lawyer_status_enabled = os.environ.get("LAWYER_STATUS_CRON_ENABLED", "true").lower() != "false"
    if lawyer_status_enabled:
        _scheduler.add_job(
            update_lawyer_routing_status, "cron",
            minute=0,  # every hour at :00
            id="lawyer_routing_status", coalesce=True, max_instances=1,
        )
    # Marketplace expiration — every hour at :15 (staggered from other hourly jobs).
    marketplace_enabled = os.environ.get("MARKETPLACE_EXPIRE_ENABLED", "true").lower() != "false"
    if marketplace_enabled:
        _scheduler.add_job(
            run_marketplace_tick, "cron",
            minute=15,
            id="marketplace_expire", coalesce=True, max_instances=1,
        )
    # Attorney daily reminder — every day at 09:00 UTC (11:00 Brussels in summer).
    daily_reminder_enabled = os.environ.get("ATTORNEY_DAILY_REMINDER_ENABLED", "true").lower() != "false"
    if daily_reminder_enabled:
        _scheduler.add_job(
            send_daily_attorney_reminders, "cron",
            hour=9, minute=0,
            id="attorney_daily_reminder", coalesce=True, max_instances=1,
        )
    _scheduler.start()
    logger.info(
        f"Scheduler started (portal_maintenance every {interval}min, "
        f"weekly_payouts={'on' if payouts_enabled else 'off'}, "
        f"credit_reset={'on' if credits_enabled else 'off'}, "
        f"lawyer_status={'on' if lawyer_status_enabled else 'off'}, "
        f"marketplace_expire={'on' if marketplace_enabled else 'off'}, "
        f"attorney_daily_reminder={'on' if daily_reminder_enabled else 'off'})"
    )


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
