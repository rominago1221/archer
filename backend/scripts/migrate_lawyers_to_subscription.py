"""
One-shot: initialise the subscription fields on every existing attorney
(status=inactive, early_access=True, is_active_for_routing=False) so
they receive 30 days gratuits when they subscribe.

Idempotent: attorneys with an existing `subscription_status` are skipped.

After running, send the transactional onboarding email separately
(see backend/services/email_notifications.py → notify_lawyer_migration).
"""
from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db import db  # noqa: E402
from services.credits import _utcnow  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("migrate_lawyers")


async def migrate_existing_lawyers() -> dict:
    total = migrated = skipped = 0
    now = _utcnow()
    ids_migrated: list[str] = []

    async for lawyer in db.attorneys.find({}):
        total += 1
        if lawyer.get("subscription_status"):
            skipped += 1
            continue

        await db.attorneys.update_one(
            {"id": lawyer["id"]},
            {"$set": {
                "early_access":                     True,
                "subscription_status":              "inactive",
                "is_active_for_routing":            False,
                "trial_ends_at":                    None,
                "subscription_id":                  None,
                "subscription_customer_id":         None,
                "subscription_current_period_end":  None,
                "subscription_cancel_at_period_end": False,
                "updated_at":                       now,
            }},
        )
        logger.info(f"  migrated attorney {lawyer['id']} (early_access=True)")
        ids_migrated.append(lawyer["id"])
        migrated += 1

    logger.info(f"Done. total={total} migrated={migrated} skipped={skipped}")
    return {"total": total, "migrated": migrated, "skipped": skipped, "ids": ids_migrated}


if __name__ == "__main__":
    result = asyncio.run(migrate_existing_lawyers())
    print(result)
