"""
Credit ledger service — the single entry point through which every credit
movement flows. Frontend never computes costs on its own; it always calls
`GET /api/credits/balance` or relies on the backend to deduct after success.

Key invariants
──────────────
• `credit_balances` has exactly one doc per user_id (upserted).
• `subscription_credits` + `pack_credits` == `total_credits`. Always.
• Spend priority: subscription first, then packs. (Packs are the non-expiring
  reserve, so we drain the refreshable bucket first.)
• Deduct AFTER the work succeeds (analysis / refinement). Free on errors.
• Welcome Live Counsel perk is granted ONCE per user_id, ever. Anti-fraud
  re-signup check in `grant_welcome_perk_on_pro_upgrade`.

Mongo does not support multi-document transactions on the free tier. The
deduction here uses a conditional update (findAndModify with $gte guard)
so two concurrent spends cannot double-spend. The transaction log is
written after the balance is successfully updated.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from constants.credits import (
    CREDIT_COSTS,
    TIER_CREDITS,
    CREDIT_PACKS,
    get_pack,
    history_label,
)
from db import db

logger = logging.getLogger(__name__)


# ── Exceptions ─────────────────────────────────────────────────────────
class CreditError(Exception):
    """Base class for credit-ledger errors."""


class CreditBalanceNotFound(CreditError):
    def __init__(self, user_id: str):
        super().__init__(f"No credit balance for user {user_id}")
        self.user_id = user_id


class CreditInsufficientError(CreditError):
    def __init__(self, available: int, required: int):
        super().__init__(f"Insufficient credits: {available} < {required}")
        self.available = available
        self.required = required


# ── Time helpers ───────────────────────────────────────────────────────
def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def next_first_of_month(now: Optional[datetime] = None) -> datetime:
    """Next 1st of month at 00:00 UTC (exclusive of `now`)."""
    if now is None:
        now = _utcnow()
    year = now.year + (1 if now.month == 12 else 0)
    month = 1 if now.month == 12 else now.month + 1
    return datetime(year, month, 1, 0, 0, 0)


# ── Pricing ────────────────────────────────────────────────────────────
def calculate_credit_cost(
    action_type: str,
    user_tier: str,
    has_ocr: bool = False,
) -> int:
    """
    Compute the total credit cost for an action, including OCR premium and
    the Pro multi-agent add-on. Analysis actions are the only ones that get
    the OCR / Pro uplift. Other actions (refinement, switch_jurisdiction)
    keep their base cost.
    """
    base = CREDIT_COSTS.get(action_type, 200)
    total = base
    is_analysis = action_type.startswith("analysis")
    if is_analysis and has_ocr:
        total += CREDIT_COSTS["ocr_premium"]
    if is_analysis and user_tier == "pro":
        total += CREDIT_COSTS["multi_agent_pro"]
    return total


def detect_analysis_complexity(documents: list[dict]) -> str:
    """
    Choose `analysis_standard | medium | multi_doc` from document stats.
    `documents` = list of {page_count?: int, extracted_text?: str}.
    """
    if not documents:
        return "analysis_standard"
    if len(documents) >= 2:
        return "analysis_multi_doc"
    main = documents[0] or {}
    pages = int(main.get("page_count") or 0)
    chars = len(main.get("extracted_text") or "")
    if pages > 5 or chars > 8000:
        return "analysis_medium"
    return "analysis_standard"


# ── Balance read ───────────────────────────────────────────────────────
async def get_balance(user_id: str) -> dict:
    """Return the current balance doc, creating a zeroed one if missing."""
    doc = await db.credit_balances.find_one({"user_id": user_id}, {"_id": 0})
    if doc is None:
        now = _utcnow()
        doc = {
            "user_id": user_id,
            "subscription_credits": 0,
            "pack_credits": 0,
            "total_credits": 0,
            "last_reset_at": now,
            "next_reset_at": next_first_of_month(now),
            "updated_at": now,
        }
        await db.credit_balances.insert_one(dict(doc))
    return doc


async def check_credits_available(user_id: str, amount: int) -> int:
    """Raise if the user cannot afford `amount`. Returns current total."""
    bal = await get_balance(user_id)
    total = bal["subscription_credits"] + bal["pack_credits"]
    if total < amount:
        raise CreditInsufficientError(total, amount)
    return total


# ── Ledger mutation ────────────────────────────────────────────────────
async def _log_transaction(
    user_id: str,
    tx_type: str,
    amount: int,
    balance_before: int,
    balance_after: int,
    source: str,
    metadata: Optional[dict] = None,
) -> dict:
    doc = {
        "transaction_id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": tx_type,
        "amount": amount,
        "balance_before": balance_before,
        "balance_after": balance_after,
        "source": source,
        "metadata": metadata or {},
        "created_at": _utcnow(),
    }
    await db.credit_transactions.insert_one(dict(doc))
    return doc


async def deduct_credits(
    user_id: str,
    amount: int,
    source: str,
    metadata: Optional[dict] = None,
) -> dict:
    """
    Atomically decrement the user's balance by `amount`, consuming
    subscription credits first, then pack credits. Writes a `spend`
    transaction row. Raises `CreditInsufficientError` on shortfall.
    """
    if amount < 0:
        raise ValueError("deduct_credits amount must be >= 0")
    if amount == 0:
        bal = await get_balance(user_id)
        return {
            "new_balance": bal["total_credits"],
            "subscription_credits": bal["subscription_credits"],
            "pack_credits": bal["pack_credits"],
        }

    bal = await get_balance(user_id)
    total_available = bal["subscription_credits"] + bal["pack_credits"]
    if total_available < amount:
        raise CreditInsufficientError(total_available, amount)

    sub_debit = min(amount, bal["subscription_credits"])
    pack_debit = amount - sub_debit
    new_sub = bal["subscription_credits"] - sub_debit
    new_pack = bal["pack_credits"] - pack_debit
    new_total = new_sub + new_pack
    now = _utcnow()

    # Conditional update: only apply if the buckets haven't changed under us.
    result = await db.credit_balances.update_one(
        {
            "user_id": user_id,
            "subscription_credits": bal["subscription_credits"],
            "pack_credits": bal["pack_credits"],
        },
        {
            "$set": {
                "subscription_credits": new_sub,
                "pack_credits": new_pack,
                "total_credits": new_total,
                "updated_at": now,
            }
        },
    )
    if result.matched_count == 0:
        # Lost an optimistic race; retry once.
        return await deduct_credits(user_id, amount, source, metadata)

    await _log_transaction(
        user_id=user_id,
        tx_type="spend",
        amount=-amount,
        balance_before=total_available,
        balance_after=new_total,
        source=source,
        metadata=metadata,
    )

    logger.info(
        f"Credits spent: user={user_id} amount={amount} source={source} "
        f"sub={sub_debit} pack={pack_debit} new_total={new_total}"
    )
    return {
        "new_balance": new_total,
        "subscription_credits": new_sub,
        "pack_credits": new_pack,
    }


async def add_credits(
    user_id: str,
    *,
    subscription_delta: int = 0,
    pack_delta: int = 0,
    source: str,
    tx_type: str = "earn",
    metadata: Optional[dict] = None,
) -> dict:
    """Add credits to either bucket. Used for pack purchases, resets, grants."""
    bal = await get_balance(user_id)
    now = _utcnow()
    new_sub = bal["subscription_credits"] + subscription_delta
    new_pack = bal["pack_credits"] + pack_delta
    new_total = new_sub + new_pack
    await db.credit_balances.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "subscription_credits": new_sub,
                "pack_credits": new_pack,
                "total_credits": new_total,
                "updated_at": now,
            }
        },
    )
    total_delta = subscription_delta + pack_delta
    await _log_transaction(
        user_id=user_id,
        tx_type=tx_type,
        amount=total_delta,
        balance_before=bal["subscription_credits"] + bal["pack_credits"],
        balance_after=new_total,
        source=source,
        metadata=metadata,
    )
    return {
        "new_balance": new_total,
        "subscription_credits": new_sub,
        "pack_credits": new_pack,
    }


# ── Initial provisioning ───────────────────────────────────────────────
async def ensure_balance_initialised(user_id: str, tier: str = "free") -> dict:
    """Create the balance doc if it doesn't exist yet, seeding per tier."""
    existing = await db.credit_balances.find_one({"user_id": user_id})
    if existing:
        return existing
    seed = TIER_CREDITS.get(tier, 0)
    now = _utcnow()
    doc = {
        "user_id": user_id,
        "subscription_credits": seed,
        "pack_credits": 0,
        "total_credits": seed,
        "last_reset_at": now,
        "next_reset_at": next_first_of_month(now),
        "updated_at": now,
    }
    await db.credit_balances.insert_one(dict(doc))
    if seed > 0:
        await _log_transaction(
            user_id=user_id,
            tx_type="earn",
            amount=seed,
            balance_before=0,
            balance_after=seed,
            source=f"signup_{tier}",
            metadata={"tier": tier},
        )
    return doc


# ── Welcome Live Counsel perk (Pro) ────────────────────────────────────
async def grant_welcome_perk_on_pro_upgrade(user_id: str) -> bool:
    """
    Idempotent. Returns True if a new perk was granted, False if one already
    existed (anti-fraud re-signup guard).
    """
    existing = await db.pro_perks_usage.find_one({
        "user_id": user_id,
        "perk_type": "welcome_live_counsel",
    })
    if existing:
        logger.info(f"User {user_id} already had welcome_live_counsel perk — skipped")
        return False

    await db.pro_perks_usage.insert_one({
        "user_id": user_id,
        "perk_type": "welcome_live_counsel",
        "granted_at": _utcnow(),
        "used_at": None,
        "case_id": None,
        "lawyer_id": None,
        "booking_id": None,
    })
    logger.info(f"Granted welcome_live_counsel perk to user {user_id}")
    return True


async def get_welcome_perk(user_id: str) -> Optional[dict]:
    return await db.pro_perks_usage.find_one(
        {"user_id": user_id, "perk_type": "welcome_live_counsel"},
        {"_id": 0},
    )


async def consume_welcome_perk(
    user_id: str,
    case_id: Optional[str],
    lawyer_id: str,
    booking_id: str,
) -> bool:
    """
    Mark the user's welcome perk as used. Returns True if successfully
    consumed, False if the user has no perk or it was already used.
    """
    now = _utcnow()
    res = await db.pro_perks_usage.update_one(
        {
            "user_id": user_id,
            "perk_type": "welcome_live_counsel",
            "used_at": None,
        },
        {
            "$set": {
                "used_at": now,
                "case_id": case_id,
                "lawyer_id": lawyer_id,
                "booking_id": booking_id,
            }
        },
    )
    return res.modified_count == 1
