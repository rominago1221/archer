"""APScheduler tick for marketplace maintenance.

Wired from `backend/jobs/scheduler.py`. Runs every hour to expire old
listings whose 72h TTL elapsed without an attorney unlock.
"""
from __future__ import annotations

import logging

from routes.marketplace_routes import expire_old_listings

logger = logging.getLogger(__name__)


async def run_marketplace_tick() -> None:
    """Cron callable — no return value; logs internally."""
    stats = await expire_old_listings()
    if stats.get("expired_count", 0) > 0:
        logger.info(f"marketplace_tick: {stats}")
