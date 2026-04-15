"""Sprint D — Client Stripe Checkout for the "attorney letter" service.

Creates a Stripe Checkout Session in native `stripe`. The client completes
payment on Stripe Checkout → Stripe fires `payment_intent.succeeded` to our
webhook (`/api/webhooks/stripe`) → handler sets `case.payment_status="paid"`
and triggers the Sprint C matching algorithm.

Note: this is DISTINCT from the legacy /api/payments/checkout which uses
emergentintegrations for Pro plan + attorney call bookings.
"""
from __future__ import annotations
import os
import asyncio
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal

import stripe

from db import db
from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)
router = APIRouter()

stripe.api_key = os.environ.get("STRIPE_API_KEY")


# Pricing per Sprint D spec
PRICING = {
    "BE": {"currency": "eur", "amount_cents": 3900},  # €39
    "US": {"currency": "usd", "amount_cents": 4900},  # $49
}


class CheckoutRequest(BaseModel):
    service_type: Literal["attorney_letter"] = "attorney_letter"


def _app_url() -> str:
    return os.environ.get("APP_URL", "https://archer.legal").rstrip("/")


@router.post("/cases/{case_id}/checkout/attorney-letter")
async def checkout_attorney_letter(
    case_id: str,
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
):
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.get("user_id") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your case")
    if case.get("payment_status") == "paid":
        raise HTTPException(status_code=409, detail="Already paid")

    country = (current_user.country or "BE").upper()
    pricing = PRICING.get(country, PRICING["BE"])

    def _create_session():
        return stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": pricing["currency"],
                    "product_data": {
                        "name": "Attorney Letter — signed by a partner attorney",
                        "description": f"Case #{case_id[-4:]}",
                    },
                    "unit_amount": pricing["amount_cents"],
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{_app_url()}/cases/{case_id}?payment=success",
            cancel_url=f"{_app_url()}/cases/{case_id}?payment=cancelled",
            metadata={
                "case_id": case_id,
                "service_type": body.service_type,
                "user_id": current_user.user_id,
            },
            payment_intent_data={
                "metadata": {
                    "case_id": case_id,
                    "service_type": body.service_type,
                    "user_id": current_user.user_id,
                },
            },
        )

    try:
        session = await asyncio.to_thread(_create_session)
    except Exception as e:
        logger.exception("stripe checkout session create failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "amount_cents": pricing["amount_cents"],
        "currency": pricing["currency"],
    }
