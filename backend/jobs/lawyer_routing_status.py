"""
Hourly housekeeping for attorney subscription state.

Two passes:
  1) Expired trials with no linked Stripe subscription → status=inactive,
     is_active_for_routing=False (attorney never entered payment info).
  2) past_due subscriptions older than 7 days → force is_active_for_routing=False
     so we stop routing new cases. Does NOT cancel the Stripe sub — webhook
     drives that.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from db import db
from services.credits import _utcnow

logger = logging.getLogger(__name__)


async def update_lawyer_routing_status() -> dict:
    now = _utcnow()
    expired_trials = 0
    past_due_disabled = 0

    # 1) trial expired, never linked → inactive
    async for lawyer in db.attorneys.find({
        "subscription_status": "trial",
        "trial_ends_at":       {"$lt": now},
    }):
        if lawyer.get("subscription_id"):
            # Stripe-managed — trial ending is handled by subscription.updated
            continue
        await db.attorneys.update_one(
            {"id": lawyer["id"]},
            {"$set": {
                "subscription_status":   "inactive",
                "is_active_for_routing": False,
                "updated_at":            now,
            }},
        )
        await db.lawyer_subscription_events.insert_one({
            "lawyer_id":      lawyer["id"],
            "event_type":     "trial_expired",
            "amount":         None,
            "stripe_event_id": None,
            "metadata":       {},
            "created_at":     now,
        })
        expired_trials += 1

    # 2) past_due > 7d → disable routing
    cutoff = now - timedelta(days=7)
    async for lawyer in db.attorneys.find({
        "subscription_status": "past_due",
        "subscription_current_period_end": {"$lt": cutoff},
        "is_active_for_routing": True,
    }):
        await db.attorneys.update_one(
            {"id": lawyer["id"]},
            {"$set": {
                "is_active_for_routing": False,
                "updated_at":            now,
            }},
        )
        await db.lawyer_subscription_events.insert_one({
            "lawyer_id":      lawyer["id"],
            "event_type":     "routing_disabled",
            "amount":         None,
            "stripe_event_id": None,
            "metadata":       {"reason": "past_due_over_7_days"},
            "created_at":     now,
        })
        past_due_disabled += 1

    logger.info(
        f"Lawyer routing status tick: expired_trials={expired_trials} "
        f"past_due_disabled={past_due_disabled}"
    )
    return {
        "expired_trials":    expired_trials,
        "past_due_disabled": past_due_disabled,
    }
