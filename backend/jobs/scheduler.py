"""APScheduler wiring for the attorney portal maintenance loop."""
import os
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from jobs.portal_maintenance import run_tick
from jobs.weekly_payouts import process_weekly_payouts

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
    _scheduler.start()
    logger.info(
        f"Scheduler started (portal_maintenance every {interval}min, "
        f"weekly_payouts={'on' if payouts_enabled else 'off'})"
    )


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
