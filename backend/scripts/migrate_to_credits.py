"""
One-shot migration: give every existing user a credit balance (seeded from
their current plan) plus a 500-credit welcome bonus that lives in the
pack bucket (never expires).

Users with `plan == "pro"` additionally receive the lifetime Welcome
Live Counsel perk — unless they already have one (anti-fraud guard).

Idempotent: reruns skip users who already have a `credit_balances` doc.
"""
from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow `python backend/scripts/migrate_to_credits.py` from the repo root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db import db  # noqa: E402
from constants.credits import TIER_CREDITS  # noqa: E402
from services.credits import next_first_of_month, _utcnow  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("migrate_to_credits")

MIGRATION_BONUS = 500  # pack credits, never reset


async def migrate_existing_users() -> dict:
    total = migrated = skipped = failed = 0
    now = _utcnow()

    async for user in db.users.find({}):
        total += 1
        user_id = user.get("user_id")
        if not user_id:
            continue

        # Skip if balance already exists
        if await db.credit_balances.find_one({"user_id": user_id}):
            skipped += 1
            continue

        # Resolve tier from the user doc (legacy uses `plan`).
        tier = (user.get("plan") or "free").lower()
        if tier not in TIER_CREDITS:
            tier = "free"
        seed_sub = TIER_CREDITS[tier]
        seed_total = seed_sub + MIGRATION_BONUS

        try:
            await db.credit_balances.insert_one({
                "user_id":              user_id,
                "subscription_credits": seed_sub,
                "pack_credits":         MIGRATION_BONUS,
                "total_credits":        seed_total,
                "last_reset_at":        now,
                "next_reset_at":        next_first_of_month(now),
                "updated_at":           now,
            })
            await db.credit_transactions.insert_one({
                "user_id":        user_id,
                "type":           "earn",
                "amount":         seed_total,
                "balance_before": 0,
                "balance_after":  seed_total,
                "source":         "migration_bonus",
                "metadata":       {
                    "tier":           tier,
                    "migration_date": now.isoformat(),
                },
                "created_at":     now,
            })

            # Pro users: grant lifetime Welcome Live Counsel perk (idempotent).
            if tier == "pro":
                existing = await db.pro_perks_usage.find_one({
                    "user_id":   user_id,
                    "perk_type": "welcome_live_counsel",
                })
                if not existing:
                    await db.pro_perks_usage.insert_one({
                        "user_id":    user_id,
                        "perk_type":  "welcome_live_counsel",
                        "granted_at": now,
                        "used_at":    None,
                        "case_id":    None,
                        "lawyer_id":  None,
                        "booking_id": None,
                    })
            migrated += 1
            if migrated % 50 == 0:
                logger.info(f"  … migrated {migrated} users so far")
        except Exception:
            logger.exception(f"Migration failed for user {user_id}")
            failed += 1

    logger.info(
        f"Done. total={total} migrated={migrated} skipped={skipped} failed={failed}"
    )
    return {"total": total, "migrated": migrated, "skipped": skipped, "failed": failed}


if __name__ == "__main__":
    result = asyncio.run(migrate_existing_users())
    print(result)
