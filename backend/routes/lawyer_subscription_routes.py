"""
Attorney-facing subscription API (€99/month Belgium partner plan).

    POST   /api/lawyers/me/subscribe                create Stripe Checkout
    GET    /api/lawyers/me/subscription             status + payment method
    POST   /api/lawyers/me/subscription/cancel      cancel at period end
    POST   /api/lawyers/me/subscription/reactivate  resume after cancel
    POST   /api/lawyers/me/subscription/payment-method  update card

    GET    /api/lawyers/me/welcome-counsels         cumulative + monthly counter

The subscription lives on the Archer platform Stripe account (NOT on the
Connect account — Connect is for payouts only).  Trial length is 30 days
if the attorney has `early_access = true`, else immediate billing.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import db
from utils.attorney_auth import attorney_required as get_current_attorney

logger = logging.getLogger(__name__)

router = APIRouter()

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY

APP_URL = os.environ.get("APP_URL", "https://archer.legal").rstrip("/")
LAWYER_PRICE_ENV = "STRIPE_PRICE_LAWYER_BE_MONTHLY"
TRIAL_DAYS = 30


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _lawyer_price_id() -> str:
    price = os.environ.get(LAWYER_PRICE_ENV, "")
    if not price:
        raise HTTPException(
            status_code=503,
            detail=f"Lawyer subscription Stripe price not set (env {LAWYER_PRICE_ENV})",
        )
    return price


# ── Subscribe (create Stripe Checkout) ─────────────────────────────────
@router.post("/lawyers/me/subscribe")
async def lawyer_subscribe(attorney=Depends(get_current_attorney)):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    price_id = _lawyer_price_id()
    attorney_id = attorney["id"]

    # Ensure a Stripe Customer exists for this attorney on the platform account.
    customer_id = attorney.get("subscription_customer_id")
    if not customer_id:
        customer = stripe.Customer.create(
            email=attorney.get("email"),
            name=f"{attorney.get('first_name','')} {attorney.get('last_name','')}".strip(),
            metadata={"attorney_id": attorney_id, "kind": "lawyer"},
        )
        customer_id = customer.id
        await db.attorneys.update_one(
            {"id": attorney_id},
            {"$set": {"subscription_customer_id": customer_id}},
        )

    trial_days = TRIAL_DAYS if attorney.get("early_access") else 0

    subscription_data: dict = {
        "metadata": {
            "kind":         "lawyer_subscription",
            "attorney_id":  attorney_id,
        }
    }
    if trial_days:
        subscription_data["trial_period_days"] = trial_days

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{APP_URL}/attorneys/dashboard?subscription=success",
            cancel_url=f"{APP_URL}/attorneys/dashboard?subscription=cancel",
            metadata={
                "kind":         "lawyer_subscription",
                "attorney_id":  attorney_id,
            },
            subscription_data=subscription_data,
            payment_method_collection="always" if trial_days else "if_required",
        )
    except Exception as e:
        logger.exception("Lawyer subscription checkout failed")
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "checkout_url":  session.url,
        "session_id":    session.id,
        "trial_days":    trial_days,
    }


# ── Status ─────────────────────────────────────────────────────────────
@router.get("/lawyers/me/subscription")
async def lawyer_subscription_status(attorney=Depends(get_current_attorney)):
    attorney_doc = await db.attorneys.find_one({"id": attorney["id"]}, {"_id": 0})
    if not attorney_doc:
        raise HTTPException(status_code=404, detail="Attorney not found")

    status = attorney_doc.get("subscription_status") or "inactive"
    sub_id = attorney_doc.get("subscription_id")

    payment_method = None
    if STRIPE_API_KEY and sub_id:
        try:
            sub = stripe.Subscription.retrieve(sub_id, expand=["default_payment_method"])
            pm = sub.get("default_payment_method") or {}
            card = (pm.get("card") or {}) if isinstance(pm, dict) else {}
            if card:
                payment_method = {"brand": card.get("brand"), "last4": card.get("last4")}
        except Exception:
            logger.warning(f"Could not fetch payment method for sub {sub_id}")

    return {
        "status":                 status,
        "current_period_end":     attorney_doc.get("subscription_current_period_end"),
        "cancel_at_period_end":   attorney_doc.get("subscription_cancel_at_period_end", False),
        "amount":                 99,
        "currency":               "EUR",
        "is_active_for_routing":  attorney_doc.get("is_active_for_routing", False),
        "early_access":           attorney_doc.get("early_access", False),
        "trial_ends_at":          attorney_doc.get("trial_ends_at"),
        "payment_method":         payment_method,
    }


class CancelBody(BaseModel):
    reason: Optional[str] = None


@router.post("/lawyers/me/subscription/cancel")
async def lawyer_subscription_cancel(
    body: CancelBody, attorney=Depends(get_current_attorney)
):
    attorney_doc = await db.attorneys.find_one({"id": attorney["id"]})
    sub_id = (attorney_doc or {}).get("subscription_id")
    if not sub_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    try:
        stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    now = _utcnow()
    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {
            "subscription_cancel_at_period_end": True,
            "updated_at": now,
        }},
    )
    await db.lawyer_subscription_events.insert_one({
        "lawyer_id":  attorney["id"],
        "event_type": "cancelled",
        "amount":     None,
        "stripe_event_id": sub_id,
        "metadata":   {"reason": body.reason},
        "created_at": now,
    })
    return {"ok": True, "cancel_at_period_end": True}


@router.post("/lawyers/me/subscription/reactivate")
async def lawyer_subscription_reactivate(attorney=Depends(get_current_attorney)):
    attorney_doc = await db.attorneys.find_one({"id": attorney["id"]})
    sub_id = (attorney_doc or {}).get("subscription_id")
    if not sub_id:
        raise HTTPException(status_code=400, detail="No subscription to reactivate")
    try:
        stripe.Subscription.modify(sub_id, cancel_at_period_end=False)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    now = _utcnow()
    await db.attorneys.update_one(
        {"id": attorney["id"]},
        {"$set": {
            "subscription_cancel_at_period_end": False,
            "updated_at": now,
        }},
    )
    await db.lawyer_subscription_events.insert_one({
        "lawyer_id":  attorney["id"],
        "event_type": "reactivated",
        "amount":     None,
        "stripe_event_id": sub_id,
        "metadata":   {},
        "created_at": now,
    })
    return {"ok": True, "cancel_at_period_end": False}


class PaymentMethodBody(BaseModel):
    payment_method_id: str


@router.post("/lawyers/me/subscription/payment-method")
async def lawyer_update_payment_method(
    body: PaymentMethodBody, attorney=Depends(get_current_attorney)
):
    attorney_doc = await db.attorneys.find_one({"id": attorney["id"]})
    customer_id = (attorney_doc or {}).get("subscription_customer_id")
    sub_id = (attorney_doc or {}).get("subscription_id")
    if not customer_id or not sub_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    try:
        stripe.PaymentMethod.attach(body.payment_method_id, customer=customer_id)
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": body.payment_method_id},
        )
        stripe.Subscription.modify(sub_id, default_payment_method=body.payment_method_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {"ok": True}


# ── Welcome Live Counsel counter ───────────────────────────────────────
@router.get("/lawyers/me/welcome-counsels")
async def lawyer_welcome_counsels(attorney=Depends(get_current_attorney)):
    doc = await db.lawyer_welcome_perks_usage.find_one(
        {"lawyer_id": attorney["id"]}, {"_id": 0}
    )
    if not doc:
        return {
            "total_offered":     0,
            "this_month":        0,
            "last_offered_at":   None,
        }
    current_month = _utcnow().strftime("%Y-%m")
    this_month = doc.get("welcome_live_counsels_this_month", 0) \
        if doc.get("current_month") == current_month else 0
    return {
        "total_offered":   doc.get("welcome_live_counsels_offered", 0),
        "this_month":      this_month,
        "last_offered_at": doc.get("last_offered_at"),
    }
