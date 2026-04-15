"""Sprint D — Stripe Connect Express service wrappers.

Uses the native `stripe` package for Connect operations. Kept separate from
the legacy `emergentintegrations` checkout wrapper which powers the Pro plan
and attorney-call checkouts — we do NOT touch those.

All functions are synchronous (Stripe's Python SDK is sync). Callers should
run them via `asyncio.to_thread()` or equivalent when in an async context.
"""
from __future__ import annotations
import os
import logging
from datetime import datetime, timezone
from typing import Optional

import stripe

from db import db

logger = logging.getLogger(__name__)

stripe.api_key = os.environ.get("STRIPE_API_KEY")

RETURN_URL = os.environ.get(
    "STRIPE_CONNECT_RETURN_URL",
    "https://archer.legal/attorneys/onboarding/stripe/complete",
)
REFRESH_URL = os.environ.get(
    "STRIPE_CONNECT_REFRESH_URL",
    "https://archer.legal/attorneys/onboarding/stripe/refresh",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Account management
# ---------------------------------------------------------------------------

def create_express_account(attorney: dict) -> stripe.Account:
    """Create a new Stripe Connect Express account for an attorney."""
    jurisdiction = (attorney.get("jurisdiction") or "BE").upper()
    country_code = "BE" if jurisdiction == "BE" else "US"
    return stripe.Account.create(
        type="express",
        country=country_code,
        email=attorney["email"],
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
        business_type="individual",
        metadata={
            "attorney_id": attorney["id"],
            "archer_jurisdiction": jurisdiction,
        },
    )


def create_onboarding_link(account_id: str) -> str:
    link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=REFRESH_URL,
        return_url=RETURN_URL,
        type="account_onboarding",
    )
    return link.url


def create_dashboard_login_link(account_id: str) -> str:
    login_link = stripe.Account.create_login_link(account_id)
    return login_link.url


def retrieve_account(account_id: str) -> stripe.Account:
    return stripe.Account.retrieve(account_id)


def get_iban_last4(account: stripe.Account) -> Optional[str]:
    """Best-effort extract of the last 4 digits of the first external bank account."""
    try:
        ext = account.get("external_accounts") or {}
        data = ext.get("data") or []
        if not data:
            return None
        return data[0].get("last4")
    except Exception:
        return None


# ---------------------------------------------------------------------------
# DB mutations — always go through these so audit is consistent
# ---------------------------------------------------------------------------

async def mark_onboarding_started(attorney_id: str, account_id: str) -> None:
    await db.attorneys.update_one(
        {"id": attorney_id},
        {"$set": {
            "stripe_account_id": account_id,
            "stripe_onboarding_started_at": _now_iso(),
            "updated_at": _now_iso(),
        }},
    )


async def mark_onboarding_completed(attorney_id: str, *, iban_last4: Optional[str] = None) -> None:
    update = {
        "stripe_onboarding_completed": True,
        "stripe_onboarding_completed_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    if iban_last4:
        update["stripe_iban_last4"] = iban_last4
    await db.attorneys.update_one({"id": attorney_id}, {"$set": update})


# ---------------------------------------------------------------------------
# Emails
# ---------------------------------------------------------------------------

def _app_url() -> str:
    return os.environ.get("APP_URL", "https://archer.legal").rstrip("/")


async def notify_attorney_stripe_ready(attorney: dict, iban_last4: Optional[str] = None) -> None:
    from routes.attorney_routes import send_email
    iban_blurb = f"(IBAN se terminant par ···{iban_last4})" if iban_last4 else ""
    url = f"{_app_url()}/attorneys/dashboard"
    subject = "✓ Votre compte Stripe est actif — vous pouvez recevoir des cases"
    html = (
        f"<p>Maître {attorney.get('first_name','')},</p>"
        f"<p>Bonne nouvelle ! Votre compte Stripe Connect est validé. {iban_blurb}</p>"
        f"<p>Vous allez maintenant recevoir des cases automatiquement, et vos paiements "
        f"seront versés chaque lundi sur votre compte.</p>"
        f"<p><a href=\"{url}\">Accéder à mon dashboard →</a></p>"
        f"<p>L'équipe Archer</p>"
    )
    await send_email(attorney["email"], subject, html)


async def notify_admin_attorney_ready(attorney: dict) -> None:
    from routes.attorney_routes import send_email
    admin = os.environ.get("ADMIN_NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL")
    if not admin:
        return
    subject = f"🟢 Nouvel avocat Stripe-ready : Maître {attorney.get('first_name','')} {attorney.get('last_name','')}"
    html = (
        f"<p>L'avocat <b>{attorney.get('email')}</b> vient de compléter son onboarding Stripe Connect.</p>"
        f"<p>Il/elle est maintenant éligible au matching automatique.</p>"
        f"<p>Spécialités : {', '.join(attorney.get('specialties') or [])}<br/>"
        f"Jurisdiction : {attorney.get('jurisdiction')}</p>"
    )
    await send_email(admin, subject, html)
