"""Sprint D — Stripe Connect webhook endpoint (/api/webhooks/stripe, plural).

This is DISTINCT from the legacy `/api/webhook/stripe` (singular) which is
handled by emergentintegrations for Pro-plan checkouts and attorney calls.

Events handled here (all via native `stripe` SDK):
  - account.updated
  - payment_intent.succeeded  (Sprint D: client paid for attorney letter)
  - transfer.failed
  - payout.paid
  - payout.failed
"""
from __future__ import annotations
import os
import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException

import stripe

from db import db
from services.stripe_connect import (
    mark_onboarding_completed, get_iban_last4,
    notify_attorney_stripe_ready, notify_admin_attorney_ready,
)

logger = logging.getLogger(__name__)
router = APIRouter()

WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Event handlers
# ---------------------------------------------------------------------------

async def handle_account_updated(account):
    """Stripe signals a Connect account change (KYC done, IBAN added, etc.)."""
    account_id = account.get("id") if isinstance(account, dict) else account.id
    attorney = await db.attorneys.find_one({"stripe_account_id": account_id}, {"_id": 0})
    if not attorney:
        logger.warning(f"account.updated: no attorney for account {account_id}")
        return

    charges_enabled = bool(account.get("charges_enabled") if isinstance(account, dict)
                           else getattr(account, "charges_enabled", False))
    payouts_enabled = bool(account.get("payouts_enabled") if isinstance(account, dict)
                           else getattr(account, "payouts_enabled", False))
    details_submitted = bool(account.get("details_submitted") if isinstance(account, dict)
                             else getattr(account, "details_submitted", False))
    complete = charges_enabled and payouts_enabled and details_submitted

    if complete and not attorney.get("stripe_onboarding_completed"):
        iban = get_iban_last4(account)
        await mark_onboarding_completed(attorney["id"], iban_last4=iban)
        asyncio.create_task(notify_attorney_stripe_ready(attorney, iban_last4=iban))
        asyncio.create_task(notify_admin_attorney_ready(attorney))
        logger.info(f"account.updated: attorney {attorney['id']} now Stripe-ready")


async def handle_payment_intent_succeeded(pi):
    """Client paid for an attorney letter → trigger Sprint C matching."""
    metadata = pi.get("metadata") if isinstance(pi, dict) else (pi.metadata or {})
    case_id = metadata.get("case_id") if metadata else None
    service_type = (metadata.get("service_type") if metadata else None) or "attorney_letter"
    if not case_id:
        logger.warning("payment_intent.succeeded without case_id metadata — ignoring")
        return

    amount = pi.get("amount") if isinstance(pi, dict) else pi.amount
    pi_id = pi.get("id") if isinstance(pi, dict) else pi.id

    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        logger.error(f"payment_intent.succeeded: case {case_id} not found")
        return
    # Idempotent: if already marked paid, skip
    if case.get("payment_status") == "paid":
        logger.info(f"payment already recorded for case {case_id}, skipping trigger")
        return

    await db.cases.update_one(
        {"case_id": case_id},
        {"$set": {
            "payment_status": "paid",
            "payment_intent_id": pi_id,
            "amount_paid_cents": amount,
            "paid_at": _now_iso(),
            "attorney_status": "waiting_assignment",
            "updated_at": _now_iso(),
        }},
    )

    from services.attorney_matching import assign_case_to_attorney
    try:
        await assign_case_to_attorney(case_id, service_type=service_type, notify=True)
    except Exception:
        logger.exception(f"auto-matching failed for case {case_id} after payment")


async def handle_payout_paid(payout):
    pid = payout.get("id") if isinstance(payout, dict) else payout.id
    await db.payouts.update_many(
        {"stripe_payout_id": pid},
        {"$set": {"status": "paid", "paid_at": _now_iso()}},
    )


async def handle_payout_failed(payout):
    pid = payout.get("id") if isinstance(payout, dict) else payout.id
    failure_msg = (payout.get("failure_message") if isinstance(payout, dict)
                   else getattr(payout, "failure_message", None)) or "Unknown"
    result = await db.payouts.update_one(
        {"stripe_payout_id": pid},
        {"$set": {"status": "failed", "failure_reason": failure_msg}},
    )
    # Best-effort: email admin + attorney
    if result.matched_count:
        doc = await db.payouts.find_one({"stripe_payout_id": pid}, {"_id": 0})
        attorney = await db.attorneys.find_one({"id": doc["attorney_id"]}, {"_id": 0}) if doc else None
        if attorney and attorney.get("email"):
            from routes.attorney_routes import send_email
            asyncio.create_task(send_email(
                attorney["email"],
                "⚠️ Problème avec votre versement",
                f"<p>Maître {attorney.get('first_name','')},</p>"
                f"<p>Votre versement a échoué pour la raison suivante :</p>"
                f"<p><b>{failure_msg}</b></p>"
                f"<p>Veuillez vérifier vos informations bancaires sur Stripe.</p>",
            ))


async def handle_transfer_failed(transfer):
    tid = transfer.get("id") if isinstance(transfer, dict) else transfer.id
    failure = (transfer.get("failure_message") if isinstance(transfer, dict)
               else getattr(transfer, "failure_message", None)) or "Unknown"
    await db.payouts.update_many(
        {"stripe_transfer_id": tid},
        {"$set": {"status": "failed", "failure_reason": failure}},
    )
    logger.error(f"transfer.failed {tid}: {failure}")


EVENT_HANDLERS = {
    "account.updated": handle_account_updated,
    "payment_intent.succeeded": handle_payment_intent_succeeded,
    "payout.paid": handle_payout_paid,
    "payout.failed": handle_payout_failed,
    "transfer.failed": handle_transfer_failed,
}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/webhooks/stripe")
async def stripe_connect_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if not WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET is not set — refusing webhook")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.warning(f"Invalid Stripe webhook signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type") if isinstance(event, dict) else event.type
    handler = EVENT_HANDLERS.get(event_type)
    if handler is None:
        return {"received": True, "ignored": True, "type": event_type}

    data_object = event["data"]["object"] if isinstance(event, dict) else event.data.object
    try:
        await handler(data_object)
    except Exception:
        logger.exception(f"handler for {event_type} failed")
        # 200 response prevents Stripe retries from piling up; we rely on logs
    return {"received": True, "type": event_type}
