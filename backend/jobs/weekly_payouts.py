"""Sprint D — Weekly payouts cron. Runs every Monday 09:00 UTC.

For each Stripe-ready attorney, aggregate completed case_assignments with
`paid_out_at IS NULL` and fire a single `stripe.Transfer.create`. Mark
assignments as paid and persist a row in `payouts`.

Idempotent: re-running the job will skip assignments that already have
`paid_out_at` set.
"""
from __future__ import annotations
import os
import asyncio
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

import stripe

from db import db

logger = logging.getLogger(__name__)

MIN_PAYOUT_CENTS = int(os.environ.get("PAYOUT_MIN_CENTS", "100"))  # skip micro-payouts


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _currency_for(attorney: dict) -> str:
    return "eur" if (attorney.get("jurisdiction") or "BE").upper() == "BE" else "usd"


async def process_weekly_payouts() -> dict:
    """Main entry point — called by the scheduler every Monday.

    Returns a summary dict for logging: {attorneys_paid, total_cents, failed}.
    """
    attorneys = await db.attorneys.find(
        {"stripe_onboarding_completed": True,
         "status": "active",
         "stripe_account_id": {"$ne": None}},
        {"_id": 0},
    ).to_list(1000)

    paid = 0
    failed = 0
    total_cents = 0
    for attorney in attorneys:
        try:
            amount = await _process_attorney_payout(attorney)
            if amount:
                paid += 1
                total_cents += amount
        except Exception as e:
            failed += 1
            logger.exception(f"payout failed for attorney {attorney['id']}: {e}")
            await _notify_admin_payout_failed(attorney, str(e))

    logger.info(f"weekly_payouts: paid={paid} failed={failed} total_cents={total_cents}")
    return {"attorneys_paid": paid, "failed": failed, "total_cents": total_cents}


async def _process_attorney_payout(attorney: dict) -> int:
    """Transfer funds for one attorney. Returns total cents transferred."""
    cursor = db.case_assignments.find(
        {"attorney_id": attorney["id"],
         "status": "completed",
         "paid_out_at": None},
        {"_id": 0},
    )
    assignments = await cursor.to_list(500)
    if not assignments:
        return 0

    total_cents = sum(int(a.get("your_payout_cents") or 0) for a in assignments)
    if total_cents < MIN_PAYOUT_CENTS:
        logger.info(f"attorney {attorney['id']}: skipping micro-payout "
                    f"{total_cents}¢ ({len(assignments)} assignments)")
        return 0

    currency = _currency_for(attorney)
    period_end = _now()
    period_start = period_end - timedelta(days=7)

    # Build the Transfer synchronously in a thread (Stripe SDK is sync)
    def _create_transfer():
        return stripe.Transfer.create(
            amount=total_cents,
            currency=currency,
            destination=attorney["stripe_account_id"],
            description=(
                f"Archer payout — {len(assignments)} cases — "
                f"week of {period_start.strftime('%Y-%m-%d')}"
            ),
            metadata={
                "attorney_id": attorney["id"],
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "assignment_count": str(len(assignments)),
            },
        )

    transfer = await asyncio.to_thread(_create_transfer)
    transfer_id = transfer.id if hasattr(transfer, "id") else transfer["id"]

    # Mark each assignment as paid, atomically per-assignment
    now_iso = _now_iso()
    for a in assignments:
        await db.case_assignments.update_one(
            {"id": a["id"]},
            {"$set": {
                "stripe_transfer_id": transfer_id,
                "paid_out_at": now_iso,
                "updated_at": now_iso,
            }},
        )

    # Record the payout row
    payout_id = secrets.token_urlsafe(12)
    await db.payouts.insert_one({
        "id": payout_id,
        "attorney_id": attorney["id"],
        "stripe_transfer_id": transfer_id,
        "stripe_payout_id": None,  # populated by payout.paid webhook later
        "amount_cents": total_cents,
        "currency": currency,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "assignment_count": len(assignments),
        "status": "pending",
        "failure_reason": None,
        "iban_last4": attorney.get("stripe_iban_last4"),
        "created_at": now_iso,
        "paid_at": None,
    })

    asyncio.create_task(_notify_attorney_payout_initiated(attorney, total_cents, len(assignments), currency))
    return total_cents


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def _format_money(cents: int, currency: str) -> str:
    symbol = "€" if currency == "eur" else "$"
    return f"{symbol}{cents/100:,.2f}"


async def _notify_attorney_payout_initiated(attorney: dict, cents: int,
                                             count: int, currency: str) -> None:
    from routes.attorney_routes import send_email
    iban_blurb = f"····{attorney['stripe_iban_last4']}" if attorney.get("stripe_iban_last4") else "—"
    subject = f"💰 Versement Archer en route — {_format_money(cents, currency)}"
    html = (
        f"<p>Maître {attorney.get('first_name','')},</p>"
        f"<p>Votre versement hebdomadaire est en route :</p>"
        f"<p>💰 Montant : <b>{_format_money(cents, currency)}</b><br/>"
        f"📂 Cases : {count} dossiers complétés cette semaine<br/>"
        f"📅 Arrivée prévue : 2-3 jours ouvrés<br/>"
        f"🏦 IBAN : {iban_blurb}</p>"
        f"<p><a href=\"{os.environ.get('APP_URL','https://archer.legal').rstrip('/')}"
        f"/attorneys/earnings\">Voir le détail dans Earnings →</a></p>"
        f"<p>L'équipe Archer</p>"
    )
    try:
        await send_email(attorney["email"], subject, html)
    except Exception:
        logger.exception(f"payout-initiated email failed for {attorney['email']}")


async def _notify_admin_payout_failed(attorney: dict, reason: str) -> None:
    from routes.attorney_routes import send_email
    admin = os.environ.get("ADMIN_NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL")
    if not admin:
        return
    subject = f"🚨 Payout failed for {attorney.get('email')}"
    html = (
        f"<p>Weekly payout crashed for attorney <b>{attorney.get('email')}</b>.</p>"
        f"<p>Reason: <code>{reason}</code></p>"
        f"<p>Manual investigation required.</p>"
    )
    try:
        await send_email(admin, subject, html)
    except Exception:
        logger.exception("admin payout-failed email failed")
