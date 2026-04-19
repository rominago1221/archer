"""
Monthly hard-reset of subscription credits.

Cron: 1st of month at 00:00 UTC. Registered from `jobs/scheduler.py`.

Rules
──────
• Free tier: balance unchanged (500 one-time at signup, no reset).
• Solo / Pro with status ∈ {active, trialing}: subscription_credits set to
  the tier allowance (1 000 / 4 000). Pack credits untouched.
• pro_perks_usage NEVER reset (welcome Live Counsel is lifetime).
• A `reset` row is written to credit_transactions for each user touched.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from constants.credits import TIER_CREDITS
from db import db
from services.credits import next_first_of_month, _utcnow

logger = logging.getLogger(__name__)


async def reset_monthly_credits() -> dict:
    now = _utcnow()
    reset_count = 0
    failures: list[str] = []

    subs = await db.subscriptions.find({
        "status": {"$in": ["active", "trialing"]},
        "tier":   {"$in": ["solo", "pro"]},
    }).to_list(None)

    for sub in subs:
        user_id = sub.get("user_id")
        tier = sub.get("tier")
        if not user_id or tier not in TIER_CREDITS:
            continue
        allowance = TIER_CREDITS[tier]
        try:
            bal = await db.credit_balances.find_one({"user_id": user_id})
            if bal is None:
                continue
            old_sub = bal["subscription_credits"]
            new_sub = allowance
            new_total = new_sub + bal["pack_credits"]
            await db.credit_balances.update_one(
                {"user_id": user_id},
                {"$set": {
                    "subscription_credits": new_sub,
                    "total_credits":        new_total,
                    "last_reset_at":        now,
                    "next_reset_at":        next_first_of_month(now),
                    "updated_at":           now,
                }},
            )
            await db.credit_transactions.insert_one({
                "user_id":        user_id,
                "type":           "reset",
                "amount":         new_sub - old_sub,
                "balance_before": old_sub + bal["pack_credits"],
                "balance_after":  new_total,
                "source":         "monthly_reset",
                "metadata":       {"tier": tier},
                "created_at":     now,
            })
            reset_count += 1
        except Exception as e:
            logger.exception(f"Failed reset for user {user_id}: {e}")
            failures.append(user_id)

    logger.info(
        f"Credit reset: {reset_count} users reset, {len(failures)} failures"
    )
    return {"reset_count": reset_count, "failures": failures}
