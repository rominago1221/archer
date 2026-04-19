"""
Dedicated webhook for the credit-ledger / subscription flows:

    POST /api/webhook/stripe-subscriptions

Handles (independently of the legacy emergentintegrations one-shot webhook
at /api/webhook/stripe, which stays untouched and continues to fulfil
per-case Attorney-Letter / Live-Counsel payments):

    checkout.session.completed          — pack purchase
    customer.subscription.created       — user subscription created
                                          lawyer subscription created
    customer.subscription.updated       — plan change, cancel_at_period_end
    customer.subscription.deleted       — hard cancellation
    invoice.payment_succeeded           — monthly renewal succeeded
    invoice.payment_failed              — renewal / trial failed

Dispatch is driven by the `kind` field stored in Checkout Session metadata
(`credit_pack` | `user_subscription` | `lawyer_subscription`) or, for
subscription-object webhooks, by `subscription.metadata.kind`.

The raw `stripe` SDK is used here (not emergentintegrations) because
subscriptions require event types not covered by the legacy wrapper.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any

import stripe
from fastapi import APIRouter, HTTPException, Request

from constants.credits import TIER_CREDITS, get_pack
from db import db
from services.credits import (
    _utcnow,
    add_credits,
    ensure_balance_initialised,
    grant_welcome_perk_on_pro_upgrade,
    next_first_of_month,
)

logger = logging.getLogger(__name__)

router = APIRouter()

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS") \
    or os.environ.get("STRIPE_WEBHOOK_SECRET", "")

if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY


@router.post("/webhook/stripe-subscriptions")
async def stripe_subscriptions_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.warning(f"Invalid Stripe signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Dev mode — no secret, trust the payload (disallowed in prod by config).
        import json as _json
        try:
            event = _json.loads(payload)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    event_type = event.get("type") if isinstance(event, dict) else event["type"]
    data_object = (event.get("data", {}) if isinstance(event, dict) else event["data"])["object"]

    logger.info(f"Stripe sub-webhook received: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(data_object)
        elif event_type == "customer.subscription.created":
            await _handle_subscription_created(data_object)
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(data_object)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(data_object)
        elif event_type == "invoice.payment_succeeded":
            await _handle_invoice_paid(data_object)
        elif event_type == "invoice.payment_failed":
            await _handle_invoice_failed(data_object)
        else:
            logger.info(f"Unhandled event type: {event_type}")
    except Exception:
        logger.exception(f"Error handling {event_type}")
        # 200 anyway so Stripe doesn't retry for our bugs; we've logged.

    return {"received": True}


# ── Checkout: one-shot pack fulfilment ─────────────────────────────────
async def _handle_checkout_completed(session: dict):
    metadata = session.get("metadata") or {}
    kind = metadata.get("kind")
    if kind == "credit_pack":
        user_id = metadata.get("user_id")
        pack_code = metadata.get("pack_code")
        pack = get_pack(pack_code or "")
        if not user_id or not pack:
            logger.warning(f"Pack checkout with bad metadata: {metadata}")
            return
        # Idempotency: have we already credited this session?
        already = await db.credit_transactions.find_one({
            "user_id": user_id,
            "source": "pack_purchase",
            "metadata.stripe_session_id": session.get("id"),
        })
        if already:
            logger.info(f"Pack session {session.get('id')} already credited; skipping")
            return
        await add_credits(
            user_id=user_id,
            pack_delta=pack["credits"],
            source="pack_purchase",
            tx_type="earn",
            metadata={
                "pack_id":            pack["code"],
                "stripe_session_id":  session.get("id"),
                "stripe_payment_id":  session.get("payment_intent"),
            },
        )
        logger.info(f"Credited {pack['credits']} pack credits to user {user_id}")
    elif kind == "user_subscription":
        # The subscription.created event carries the real period window;
        # we just log here and let the subscription event handle state.
        logger.info(f"User subscription checkout completed: user={metadata.get('user_id')} tier={metadata.get('tier')}")
    elif kind == "lawyer_subscription":
        logger.info(f"Lawyer subscription checkout completed: attorney={metadata.get('attorney_id')}")
    else:
        logger.info(f"Unhandled checkout.session.completed kind={kind}")


# ── Subscription lifecycle ─────────────────────────────────────────────
async def _handle_subscription_created(sub: dict):
    metadata = sub.get("metadata") or {}
    kind = metadata.get("kind") or (
        "lawyer_subscription" if metadata.get("attorney_id") else "user_subscription"
    )
    if kind == "user_subscription":
        await _upsert_user_subscription(sub, is_new=True)
    elif kind == "lawyer_subscription":
        await _upsert_lawyer_subscription(sub, is_new=True)


async def _handle_subscription_updated(sub: dict):
    metadata = sub.get("metadata") or {}
    kind = metadata.get("kind") or (
        "lawyer_subscription" if metadata.get("attorney_id") else "user_subscription"
    )
    if kind == "user_subscription":
        await _upsert_user_subscription(sub, is_new=False)
    elif kind == "lawyer_subscription":
        await _upsert_lawyer_subscription(sub, is_new=False)


async def _handle_subscription_deleted(sub: dict):
    metadata = sub.get("metadata") or {}
    kind = metadata.get("kind") or (
        "lawyer_subscription" if metadata.get("attorney_id") else "user_subscription"
    )
    now = _utcnow()
    if kind == "user_subscription":
        user_id = metadata.get("user_id")
        if user_id:
            await db.subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {
                    "status":     "cancelled",
                    "updated_at": now,
                    "cancel_at_period_end": False,
                }},
            )
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"plan": "free"}},
            )
    elif kind == "lawyer_subscription":
        attorney_id = metadata.get("attorney_id")
        if attorney_id:
            await db.attorneys.update_one(
                {"id": attorney_id},
                {"$set": {
                    "subscription_status":    "cancelled",
                    "is_active_for_routing":  False,
                    "updated_at":             now,
                }},
            )
            await db.lawyer_subscription_events.insert_one({
                "lawyer_id":      attorney_id,
                "event_type":     "cancelled",
                "amount":         None,
                "stripe_event_id": sub.get("id"),
                "metadata":       {},
                "created_at":     now,
            })


async def _handle_invoice_paid(invoice: dict):
    sub_id = invoice.get("subscription")
    if not sub_id:
        return
    # Pull the subscription object to resolve metadata.
    try:
        sub = stripe.Subscription.retrieve(sub_id)
    except Exception:
        logger.exception("Could not retrieve subscription on invoice.paid")
        return
    sub_dict = sub if isinstance(sub, dict) else sub.to_dict_recursive()
    metadata = sub_dict.get("metadata") or {}
    kind = metadata.get("kind") or (
        "lawyer_subscription" if metadata.get("attorney_id") else "user_subscription"
    )
    now = _utcnow()

    if kind == "user_subscription":
        user_id = metadata.get("user_id")
        tier = metadata.get("tier") or "solo"
        if not user_id:
            return
        # Refill subscription bucket to the tier allowance.
        await _refill_user_for_tier(user_id, tier, source="subscription_renewal")
        await db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {"status": "active", "updated_at": now}},
        )

    elif kind == "lawyer_subscription":
        attorney_id = metadata.get("attorney_id")
        if not attorney_id:
            return
        await db.attorneys.update_one(
            {"id": attorney_id},
            {"$set": {
                "subscription_status":     "active",
                "is_active_for_routing":   True,
                "updated_at":              now,
            }},
        )
        await db.lawyer_subscription_events.insert_one({
            "lawyer_id":        attorney_id,
            "event_type":       "payment_succeeded",
            "amount":           (invoice.get("amount_paid") or 0) / 100,
            "stripe_event_id":  invoice.get("id"),
            "metadata":         {"invoice_id": invoice.get("id")},
            "created_at":       now,
        })


async def _handle_invoice_failed(invoice: dict):
    sub_id = invoice.get("subscription")
    if not sub_id:
        return
    try:
        sub = stripe.Subscription.retrieve(sub_id)
    except Exception:
        logger.exception("Could not retrieve subscription on invoice.failed")
        return
    sub_dict = sub if isinstance(sub, dict) else sub.to_dict_recursive()
    metadata = sub_dict.get("metadata") or {}
    kind = metadata.get("kind") or (
        "lawyer_subscription" if metadata.get("attorney_id") else "user_subscription"
    )
    now = _utcnow()

    if kind == "user_subscription":
        user_id = metadata.get("user_id")
        if user_id:
            await db.subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {"status": "past_due", "updated_at": now}},
            )
    elif kind == "lawyer_subscription":
        attorney_id = metadata.get("attorney_id")
        if attorney_id:
            await db.attorneys.update_one(
                {"id": attorney_id},
                {"$set": {
                    "subscription_status": "past_due",
                    "updated_at":          now,
                }},
            )
            await db.lawyer_subscription_events.insert_one({
                "lawyer_id":        attorney_id,
                "event_type":       "payment_failed",
                "amount":           None,
                "stripe_event_id":  invoice.get("id"),
                "metadata":         {"invoice_id": invoice.get("id")},
                "created_at":       now,
            })


# ── Helpers ────────────────────────────────────────────────────────────
async def _refill_user_for_tier(user_id: str, tier: str, source: str):
    """Set subscription_credits to the tier allowance. Pack credits untouched."""
    allowance = TIER_CREDITS.get(tier, 0)
    bal = await ensure_balance_initialised(user_id, tier=tier)
    now = _utcnow()
    old_sub = bal["subscription_credits"]
    new_sub = allowance
    delta = new_sub - old_sub
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
        "type":           "earn",
        "amount":         delta,
        "balance_before": old_sub + bal["pack_credits"],
        "balance_after":  new_total,
        "source":         source,
        "metadata":       {"tier": tier},
        "created_at":     now,
    })


async def _upsert_user_subscription(sub: dict, is_new: bool):
    metadata = sub.get("metadata") or {}
    user_id = metadata.get("user_id")
    tier = metadata.get("tier") or "solo"
    if not user_id:
        logger.warning("Subscription event without user_id in metadata")
        return
    now = _utcnow()
    period_start = _ts(sub.get("current_period_start"))
    period_end = _ts(sub.get("current_period_end"))
    cancel_at_period_end = bool(sub.get("cancel_at_period_end"))
    status_stripe = sub.get("status")
    status = "active" if status_stripe in ("active", "trialing") else (status_stripe or "active")

    await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id":                 user_id,
            "tier":                    tier,
            "status":                  status,
            "stripe_subscription_id":  sub.get("id"),
            "stripe_customer_id":      sub.get("customer"),
            "current_period_start":    period_start,
            "current_period_end":      period_end,
            "cancel_at_period_end":    cancel_at_period_end,
            "updated_at":              now,
        },
         "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    # Mirror tier on user doc (legacy code uses user.plan).
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"plan": tier}},
    )
    # Grant Pro welcome perk on first-ever Pro upgrade.
    if tier == "pro":
        await grant_welcome_perk_on_pro_upgrade(user_id)

    if is_new:
        # Fresh subscription — seed the subscription bucket.
        await _refill_user_for_tier(user_id, tier, source="subscription_renewal")


async def _upsert_lawyer_subscription(sub: dict, is_new: bool):
    metadata = sub.get("metadata") or {}
    attorney_id = metadata.get("attorney_id")
    if not attorney_id:
        logger.warning("Lawyer subscription event without attorney_id")
        return
    now = _utcnow()
    period_end = _ts(sub.get("current_period_end"))
    trial_end = _ts(sub.get("trial_end"))
    cancel_at_period_end = bool(sub.get("cancel_at_period_end"))
    status_stripe = sub.get("status")
    # "trialing" is a specific state; map to our vocabulary.
    if status_stripe == "trialing":
        status = "trial"
    elif status_stripe == "active":
        status = "active"
    elif status_stripe in ("past_due", "unpaid"):
        status = "past_due"
    elif status_stripe in ("canceled", "incomplete_expired"):
        status = "cancelled"
    else:
        status = status_stripe or "inactive"

    is_active_for_routing = status in ("trial", "active")

    await db.attorneys.update_one(
        {"id": attorney_id},
        {"$set": {
            "subscription_status":              status,
            "subscription_id":                  sub.get("id"),
            "subscription_customer_id":         sub.get("customer"),
            "subscription_current_period_end":  period_end,
            "subscription_cancel_at_period_end": cancel_at_period_end,
            "trial_ends_at":                    trial_end,
            "is_active_for_routing":            is_active_for_routing,
            "updated_at":                       now,
        }},
    )
    if is_new:
        await db.lawyer_subscription_events.insert_one({
            "lawyer_id":       attorney_id,
            "event_type":      "trial_started" if status == "trial" else "subscription_activated",
            "amount":          None,
            "stripe_event_id": sub.get("id"),
            "metadata":        {"status": status_stripe},
            "created_at":      now,
        })


def _ts(v: Any) -> datetime | None:
    if not v:
        return None
    if isinstance(v, datetime):
        return v
    try:
        return datetime.fromtimestamp(int(v), tz=timezone.utc).replace(tzinfo=None)
    except Exception:
        return None
