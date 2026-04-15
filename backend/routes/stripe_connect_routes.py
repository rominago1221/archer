"""Sprint D — Stripe Connect Express endpoints for attorneys.

Mounted at /api/attorneys/stripe/*. Uses the native `stripe` package.
Gated by the attorney portal auth (Sprint A).
"""
from __future__ import annotations
import asyncio
import logging
from fastapi import APIRouter, HTTPException, Depends

from utils.attorney_auth import attorney_required
from services.stripe_connect import (
    create_express_account, create_onboarding_link,
    create_dashboard_login_link, retrieve_account, get_iban_last4,
    mark_onboarding_started, mark_onboarding_completed,
    notify_attorney_stripe_ready, notify_admin_attorney_ready,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attorneys/stripe")


@router.post("/onboarding/start")
async def start_onboarding(attorney: dict = Depends(attorney_required)):
    """Create (or reuse) the Stripe Connect account and return an onboarding URL."""
    try:
        account_id = attorney.get("stripe_account_id")
        if not account_id:
            account = await asyncio.to_thread(create_express_account, attorney)
            account_id = account.id
            await mark_onboarding_started(attorney["id"], account_id)
        url = await asyncio.to_thread(create_onboarding_link, account_id)
        return {"onboarding_url": url, "account_id": account_id}
    except Exception as e:
        logger.exception("stripe onboarding start failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")


@router.get("/onboarding/status")
async def onboarding_status(attorney: dict = Depends(attorney_required)):
    account_id = attorney.get("stripe_account_id")
    if not account_id:
        return {"status": "not_started"}
    try:
        account = await asyncio.to_thread(retrieve_account, account_id)
    except Exception as e:
        logger.exception("stripe account retrieve failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    charges_enabled = bool(getattr(account, "charges_enabled", False))
    payouts_enabled = bool(getattr(account, "payouts_enabled", False))
    details_submitted = bool(getattr(account, "details_submitted", False))
    complete = charges_enabled and payouts_enabled and details_submitted

    requirements = []
    try:
        req = account.get("requirements") or {}
        requirements = req.get("currently_due") or []
    except Exception:
        pass

    if complete and not attorney.get("stripe_onboarding_completed"):
        iban_last4 = get_iban_last4(account)
        await mark_onboarding_completed(attorney["id"], iban_last4=iban_last4)
        asyncio.create_task(notify_attorney_stripe_ready({**attorney,
                                                         "stripe_iban_last4": iban_last4},
                                                        iban_last4=iban_last4))
        asyncio.create_task(notify_admin_attorney_ready(attorney))

    return {
        "status": "complete" if complete else "incomplete",
        "charges_enabled": charges_enabled,
        "payouts_enabled": payouts_enabled,
        "details_submitted": details_submitted,
        "requirements": requirements,
        "iban_last4": get_iban_last4(account),
    }


@router.get("/dashboard-link")
async def dashboard_link(attorney: dict = Depends(attorney_required)):
    account_id = attorney.get("stripe_account_id")
    if not account_id:
        raise HTTPException(status_code=400, detail="Stripe account not connected")
    try:
        url = await asyncio.to_thread(create_dashboard_login_link, account_id)
        return {"dashboard_url": url}
    except Exception as e:
        logger.exception("stripe dashboard link failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
