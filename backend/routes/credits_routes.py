"""
Public-facing credits API.

    GET  /api/credits/balance                  current user's balance
    GET  /api/credits/history?limit=&offset=   transaction feed (generic labels)
    POST /api/credits/packs/checkout           create a Stripe Checkout session
    GET  /api/credits/packs                    public pack catalog

Also exposes the subscription upgrade flow for the 3-tier plan:

    POST /api/subscriptions/checkout           {tier: "solo"|"pro"} → Stripe URL
    GET  /api/subscriptions/me                 current user sub state

Routes are registered on the shared /api router by including this module
from `server.py` during startup.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import stripe

from auth import get_current_user
from constants.credits import CREDIT_PACKS, get_pack, history_label, TIER_CREDITS
from db import db
from services.credits import (
    CreditInsufficientError,
    get_balance,
    get_welcome_perk,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Stripe setup ───────────────────────────────────────────────────────
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY

APP_URL = os.environ.get("APP_URL", "https://archer.legal").rstrip("/")


def _price_id_for_pack(pack_code: str) -> str:
    pack = get_pack(pack_code)
    if not pack:
        raise HTTPException(status_code=400, detail=f"Unknown pack code: {pack_code}")
    price_id = os.environ.get(pack["stripe_env"], "")
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail=f"Stripe price not configured for pack '{pack_code}'. "
                   f"Set env var {pack['stripe_env']}.",
        )
    return price_id


def _price_id_for_tier(tier: str) -> str:
    env_map = {
        "solo": "STRIPE_PRICE_SOLO_MONTHLY",
        "pro":  "STRIPE_PRICE_PRO_MONTHLY",
    }
    key = env_map.get(tier)
    if not key:
        raise HTTPException(status_code=400, detail=f"Unknown tier: {tier}")
    price_id = os.environ.get(key, "")
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail=f"Stripe price not configured for tier '{tier}'. Set env var {key}.",
        )
    return price_id


# ── Balance + history ──────────────────────────────────────────────────
@router.get("/credits/balance")
async def credits_balance(current_user=Depends(get_current_user)):
    bal = await get_balance(current_user.user_id)
    sub = await db.subscriptions.find_one(
        {"user_id": current_user.user_id}, {"_id": 0}
    )
    tier = (sub or {}).get("tier") or getattr(current_user, "plan", "free")
    perk = await get_welcome_perk(current_user.user_id)
    perk_available = bool(perk and perk.get("used_at") is None)
    return {
        "subscription_credits": bal["subscription_credits"],
        "pack_credits":         bal["pack_credits"],
        "total_credits":        bal["total_credits"],
        "tier":                 tier,
        "next_reset_at":        (bal.get("next_reset_at") or "").isoformat() + "Z"
                                if isinstance(bal.get("next_reset_at"), datetime) else None,
        "welcome_perks": {
            "welcome_live_counsel_available": perk_available,
        },
    }


@router.get("/credits/history")
async def credits_history(
    limit: int = 20,
    offset: int = 0,
    current_user=Depends(get_current_user),
):
    limit = max(1, min(100, int(limit)))
    offset = max(0, int(offset))
    cursor = (
        db.credit_transactions
        .find({"user_id": current_user.user_id}, {"_id": 0})
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )
    rows = await cursor.to_list(length=limit)
    total = await db.credit_transactions.count_documents({"user_id": current_user.user_id})
    language = getattr(current_user, "language", "en") or "en"
    return {
        "transactions": [
            {
                "id":         r.get("transaction_id") or str(r.get("_id") or ""),
                "type":       r["type"],
                "amount":     r["amount"],
                "label":      history_label(r.get("source", ""), language),
                "created_at": (r["created_at"].isoformat() + "Z")
                              if isinstance(r.get("created_at"), datetime) else r.get("created_at"),
            }
            for r in rows
        ],
        "total": total,
    }


# ── Pack catalog + checkout ────────────────────────────────────────────
@router.get("/credits/packs")
async def credits_packs():
    """Public pack catalogue — no cost-per-action disclosure."""
    return {
        "packs": [
            {
                "code":      p["code"],
                "name":      p["name"],
                "credits":   p["credits"],
                "price_eur": p["price_eur"],
                "price_usd": p["price_usd"],
            }
            for p in CREDIT_PACKS
        ]
    }


class PackCheckoutBody(BaseModel):
    pack_code: str


@router.post("/credits/packs/checkout")
async def credits_packs_checkout(
    body: PackCheckoutBody,
    request: Request,
    current_user=Depends(get_current_user),
):
    pack = get_pack(body.pack_code)
    if not pack:
        raise HTTPException(status_code=400, detail="Unknown pack")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    price_id = _price_id_for_pack(body.pack_code)
    client_ref = str(uuid.uuid4())

    success_url = f"{APP_URL}/dashboard?credits=success&pack={pack['code']}&ref={client_ref}"
    cancel_url  = f"{APP_URL}/dashboard?credits=cancel&ref={client_ref}"

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=client_ref,
            metadata={
                "kind":         "credit_pack",
                "pack_code":    pack["code"],
                "user_id":      current_user.user_id,
                "credits":      str(pack["credits"]),
            },
            customer_email=getattr(current_user, "email", None),
        )
    except Exception as e:
        logger.exception("Stripe checkout.Session.create failed for pack")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    return {"checkout_url": session.url, "session_id": session.id}


# ── Subscription upgrade (Solo / Pro) ──────────────────────────────────
class SubscriptionCheckoutBody(BaseModel):
    tier: str  # "solo" | "pro"


@router.post("/subscriptions/checkout")
async def subscriptions_checkout(
    body: SubscriptionCheckoutBody,
    current_user=Depends(get_current_user),
):
    if body.tier not in ("solo", "pro"):
        raise HTTPException(status_code=400, detail="Tier must be 'solo' or 'pro'")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    price_id = _price_id_for_tier(body.tier)
    success_url = f"{APP_URL}/dashboard?subscription=success&tier={body.tier}"
    cancel_url  = f"{APP_URL}/pricing?subscription=cancel"

    # Reuse the Stripe Customer if we already have one on file.
    sub_doc = await db.subscriptions.find_one({"user_id": current_user.user_id}, {"_id": 0})
    customer_id = (sub_doc or {}).get("stripe_customer_id")

    session_kwargs = dict(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "kind":    "user_subscription",
            "tier":    body.tier,
            "user_id": current_user.user_id,
        },
        subscription_data={
            "metadata": {
                "tier":    body.tier,
                "user_id": current_user.user_id,
            }
        },
    )
    if customer_id:
        session_kwargs["customer"] = customer_id
    else:
        session_kwargs["customer_email"] = getattr(current_user, "email", None)

    try:
        session = stripe.checkout.Session.create(**session_kwargs)
    except Exception as e:
        logger.exception("Stripe subscription checkout failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    return {"checkout_url": session.url, "session_id": session.id}


@router.get("/subscriptions/me")
async def subscription_me(current_user=Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not sub:
        return {
            "tier":   getattr(current_user, "plan", "free"),
            "status": "inactive",
        }
    return sub


class CancelBody(BaseModel):
    reason: Optional[str] = None


@router.post("/subscriptions/cancel")
async def subscription_cancel(
    body: CancelBody,
    current_user=Depends(get_current_user),
):
    sub = await db.subscriptions.find_one({"user_id": current_user.user_id})
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription")
    stripe_sub_id = sub.get("stripe_subscription_id")
    if not stripe_sub_id:
        raise HTTPException(status_code=400, detail="Subscription is not managed by Stripe")
    try:
        stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=True)
    except Exception as e:
        logger.exception("Failed to set cancel_at_period_end")
        raise HTTPException(status_code=502, detail=str(e))
    await db.subscriptions.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "cancel_at_period_end": True,
            "cancel_reason":        body.reason,
            "updated_at":           datetime.now(timezone.utc),
        }},
    )
    return {"ok": True, "cancel_at_period_end": True}
