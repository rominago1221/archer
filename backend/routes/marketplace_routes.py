"""Attorney marketplace — Commit 1: pricing + listing model + expiration.

Flow (full picture — other pieces land in subsequent commits):
  1. Client analyses a case (client-facing pipeline).
  2. publish_to_marketplace() creates an anonymized listing in
     `case_marketplace` (this commit).
  3. Attorneys browse the marketplace (commit 2).
  4. Attorney pays via Stripe Checkout to unlock (commit 2).
  5. Stripe webhook atomically flips `status` from "available" to "locked"
     and assigns the case to the attorney (commit 2).
  6. Listings unclaimed after 72h are auto-expired by the scheduler
     (this commit).

Collections:
  - db.case_marketplace  — anonymized listings visible to all attorneys.
  - db.cases             — owns the full case data; gains `marketplace_status`.
  - db.attorneys         — gains `acquired_cases`, `total_spent_cents`,
                           `email_preferences.daily_reminder`.
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException

from db import db
from config.case_pricing import (
    get_case_price,
    risk_level_for_score,
)
from utils.attorney_auth import attorney_required

logger = logging.getLogger(__name__)

router = APIRouter()
stripe.api_key = os.environ.get("STRIPE_API_KEY")

# Listings auto-expire after this many hours if no attorney unlocks them.
LISTING_TTL_HOURS = 72


def _app_url() -> str:
    return os.environ.get("APP_URL", "https://archer.legal").rstrip("/")


# ────────────────────────────────────────────────────────────────────────
# Case-type label + icon helpers
# ────────────────────────────────────────────────────────────────────────
# Kept here so the marketplace is self-contained (no frontend dep).
# Mirrors the frontend/src/constants/caseTypes.js families.
_CASE_TYPE_LABELS_FR = {
    "eviction": "Expulsion / Bail",
    "real_estate": "Immobilier / Copropriete",
    "housing": "Bail / Immobilier",
    "rental": "Bail / Immobilier",
    "lease": "Bail / Immobilier",
    "wrongful_termination": "Licenciement abusif",
    "severance": "Indemnite de depart",
    "workplace_discrimination": "Discrimination au travail",
    "harassment": "Harcelement",
    "employment": "Droit du travail",
    "labor": "Droit du travail",
    "dismissal": "Licenciement",
    "workplace": "Droit du travail",
    "consumer_disputes": "Litige consommation",
    "consumer": "Litige consommation",
    "telecom": "Litige telecom",
    "purchase": "Litige achat",
    "debt": "Dette / recouvrement",
    "insurance_disputes": "Litige assurance",
    "insurance": "Litige assurance",
    "tax_disputes": "Litige fiscal",
    "identity_theft": "Vol d'identite",
    "medical_malpractice": "Erreur medicale",
    "medical": "Erreur medicale",
    "disability_claims": "Invalidite",
    "family": "Famille / divorce",
    "divorce": "Divorce",
    "custody": "Garde d'enfants",
    "criminal": "Penal",
    "penal": "Penal",
    "immigration": "Immigration",
    "traffic": "Roulage / contravention",
    "driving": "Roulage / contravention",
    "contract": "Litige contractuel",
    "commercial": "Droit commercial",
    "banking": "Litige bancaire",
    "inheritance": "Succession",
    "neighbor": "Voisinage",
    "other": "Autre",
    "general": "Autre",
}

_CASE_TYPE_ICONS = {
    "eviction": "🏠", "real_estate": "🏢", "housing": "🏠",
    "rental": "🏠", "lease": "🏠",
    "wrongful_termination": "💼", "severance": "💼",
    "workplace_discrimination": "⚖️", "harassment": "🚨",
    "employment": "💼", "labor": "💼", "dismissal": "💼", "workplace": "💼",
    "consumer_disputes": "🛒", "consumer": "🛒", "telecom": "📞", "purchase": "🛒",
    "debt": "💳", "insurance_disputes": "☂️", "insurance": "☂️",
    "tax_disputes": "📄", "identity_theft": "🔑",
    "medical_malpractice": "🩺", "medical": "🩺", "disability_claims": "♿",
    "family": "👨‍👩‍👧", "divorce": "💔", "custody": "👶",
    "criminal": "⚖️", "penal": "⚖️",
    "immigration": "🌍",
    "traffic": "🚗", "driving": "🚗",
    "contract": "📑", "commercial": "🏢", "banking": "🏦",
    "inheritance": "📜", "neighbor": "🏘️",
    "other": "❓", "general": "❓",
}


def _case_type_label(case_type: str | None) -> str:
    key = (case_type or "other").lower().replace("-", "_").replace(" ", "_")
    return _CASE_TYPE_LABELS_FR.get(key, _CASE_TYPE_LABELS_FR["other"])


def _case_type_icon(case_type: str | None) -> str:
    key = (case_type or "other").lower().replace("-", "_").replace(" ", "_")
    return _CASE_TYPE_ICONS.get(key, _CASE_TYPE_ICONS["other"])


# ────────────────────────────────────────────────────────────────────────
# Anonymization — critical for GDPR compliance
# ────────────────────────────────────────────────────────────────────────
# Before purchase, attorneys must NEVER see client PII. We strip emails,
# phones, IBANs and common given/surname patterns from the public blurb.

_EMAIL_RE = re.compile(r"[\w\.\-+]+@[\w\-]+\.[\w\.\-]+")
# Belgian phones + intl formats — 6-12 digits possibly with +32 / space / dash.
_PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?){2,5}\d{2,4}")
# IBAN (BE / intl) — conservative pattern to avoid false positives.
_IBAN_RE = re.compile(r"\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){10,30}\b")
# "M. Jean Dupont", "Madame Marie Lecomte" etc. — strip the bigram after the title.
_NAME_AFTER_TITLE_RE = re.compile(
    r"\b(M\.|Mme\.?|Mlle\.?|Monsieur|Madame|Me\.?|Maitre)\s+([A-ZÀ-Ž][\wÀ-ž'\-]+(?:\s+[A-ZÀ-Ž][\wÀ-ž'\-]+){0,2})",
    flags=re.UNICODE,
)


def _anonymize_text(raw: str, max_len: int = 500) -> str:
    """Remove emails, phones, IBAN and named parties from a free-text blurb."""
    if not raw:
        return ""
    t = str(raw)
    t = _EMAIL_RE.sub("[email masqué]", t)
    t = _IBAN_RE.sub("[IBAN masqué]", t)
    # Phone regex is broad — only replace when it looks like a real phone number
    # (>= 8 digits after stripping non-digits) to avoid mangling article references.
    def _phone_sub(m):
        digits = re.sub(r"\D", "", m.group(0))
        if len(digits) >= 8:
            return "[tel masqué]"
        return m.group(0)
    t = _PHONE_RE.sub(_phone_sub, t)
    t = _NAME_AFTER_TITLE_RE.sub(r"[partie]", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    if len(t) > max_len:
        t = t[: max_len - 1].rstrip() + "…"
    return t


def _anonymous_title(case: dict, case_type_label: str) -> str:
    """Build a short anonymized title for the public listing card.
    Format: "<case_type_label> — <region>" with sanitized stakes when available."""
    region = (case.get("region") or case.get("country") or "").strip()
    base = case.get("title") or case.get("ai_summary") or case_type_label
    base = _anonymize_text(base, max_len=80)
    # Drop the leading article/pronoun so the card reads clean after truncation.
    base = re.sub(r"^(Le |La |L\'|Les |Un |Une |Mon |Ma )", "", base, flags=re.IGNORECASE)
    region_suffix = f" · {region}" if region else ""
    title = f"{base}{region_suffix}".strip()
    return title[:160] or case_type_label


def _anonymous_summary(case: dict) -> str:
    """Anonymized free-text summary, max 500 chars — no PII."""
    src = case.get("ai_summary") or case.get("summary") or ""
    return _anonymize_text(src, max_len=500)


def _region_for_listing(case: dict) -> str:
    """Region shown on the card — coarse enough to be non-identifying."""
    return (
        case.get("region")
        or case.get("city")
        or (case.get("country") or "Belgique")
    )


# ────────────────────────────────────────────────────────────────────────
# publish_to_marketplace — called from the analysis pipeline
# ────────────────────────────────────────────────────────────────────────
async def publish_to_marketplace(case_id: str) -> Optional[dict]:
    """Create (or refresh) a marketplace listing for a completed case analysis.

    Called at the end of the main analysis pipeline. No-op on duplicates
    (unique index on case_id). Returns the listing dict on insert, else None.

    Gating:
      - Only BE cases are listed (aligned with the M6 freeze).
      - Free-tier users' cases are NOT published (attorney marketplace is a
        paid-client feature — clients on Free don't get attorney leads).
    """
    if not case_id:
        return None

    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        logger.warning(f"publish_to_marketplace: case {case_id} not found")
        return None

    # Freeze US — BE-only marketplace for now.
    country = (case.get("country") or "BE").upper()
    if country != "BE":
        return None

    # Free-tier users don't expose their cases to paying attorneys.
    user = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0, "plan": 1})
    plan = (user or {}).get("plan", "free")
    if plan in (None, "free"):
        logger.info(f"publish_to_marketplace: skipping case {case_id} (free user)")
        return None

    # Idempotent — unique index on case_id guards against double publish.
    existing = await db.case_marketplace.find_one({"case_id": case_id}, {"_id": 0, "case_id": 1})
    if existing:
        return None

    case_type = case.get("type") or case.get("case_type") or "other"
    case_type_label = _case_type_label(case_type)
    case_type_icon = _case_type_icon(case_type)
    risk_score = int(case.get("risk_score") or 0)
    financial_stakes = 0
    fe = case.get("financial_exposure")
    if isinstance(fe, (int, float)):
        financial_stakes = int(fe)
    elif isinstance(fe, str):
        # Extract first number from strings like "EUR 2500 + frais".
        m = re.search(r"\d+", fe.replace(" ", ""))
        if m:
            try:
                financial_stakes = int(m.group(0))
            except ValueError:
                financial_stakes = 0

    now = datetime.now(timezone.utc)
    listing = {
        "listing_id": f"mkt_{uuid.uuid4().hex[:16]}",
        "case_id": case_id,
        "status": "available",
        # Anonymised public data (visible pre-purchase).
        "case_type": case_type,
        "case_type_label": case_type_label,
        "case_type_icon": case_type_icon,
        "region": _region_for_listing(case),
        "country": country,
        "title": _anonymous_title(case, case_type_label),
        "summary": _anonymous_summary(case),
        "financial_stakes": financial_stakes,
        "risk_score": risk_score,
        "risk_level": risk_level_for_score(risk_score),
        "document_count": int(case.get("document_count") or 0),
        "price_cents": get_case_price(case_type),
        # Lifecycle.
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=LISTING_TTL_HOURS)).isoformat(),
        # Tracking (FOMO + analytics).
        "view_count": 0,
        "current_viewers": [],  # list of attorney_ids (sets via $addToSet)
        # Ownership — populated by the Stripe webhook in commit 2.
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
    }
    try:
        await db.case_marketplace.insert_one(listing)
    except Exception as e:
        # Race with another publish_to_marketplace call → idempotent drop.
        logger.info(f"publish_to_marketplace: insert race on {case_id} ({e})")
        return None

    await db.cases.update_one(
        {"case_id": case_id},
        {"$set": {
            "marketplace_status": "listed",
            "marketplace_listing_id": listing["listing_id"],
        }},
    )
    logger.info(f"publish_to_marketplace: listed {case_id} @ {listing['price_cents']}¢")
    listing.pop("_id", None)
    return listing


# ────────────────────────────────────────────────────────────────────────
# Index setup — called from server startup
# ────────────────────────────────────────────────────────────────────────
async def ensure_marketplace_indexes() -> None:
    """Create indexes for db.case_marketplace. Safe to call repeatedly."""
    await db.case_marketplace.create_index("listing_id", unique=True)
    await db.case_marketplace.create_index("case_id", unique=True)
    await db.case_marketplace.create_index([("status", 1), ("country", 1), ("created_at", -1)])
    await db.case_marketplace.create_index("expires_at")
    await db.case_marketplace.create_index("locked_by")


# ────────────────────────────────────────────────────────────────────────
# Expiration cron — called by scheduler every hour
# ────────────────────────────────────────────────────────────────────────
async def expire_old_listings() -> dict:
    """Flip status=available → expired for listings past their TTL. Returns
    a stats dict for observability."""
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        result = await db.case_marketplace.update_many(
            {"status": "available", "expires_at": {"$lt": now_iso}},
            {"$set": {"status": "expired"}},
        )
        expired = getattr(result, "modified_count", 0)
        if expired:
            logger.info(f"marketplace: expired {expired} listings past TTL")
        return {"expired_count": expired}
    except Exception as e:
        logger.error(f"marketplace: expire_old_listings failed — {e}")
        return {"expired_count": 0, "error": str(e)}


# ════════════════════════════════════════════════════════════════════════
# Endpoints — attorney-facing marketplace browse/buy
# ════════════════════════════════════════════════════════════════════════

def _sanitize_listing(listing: dict, viewer_attorney_id: str | None = None) -> dict:
    """Strip internals before shipping a listing to the client. Adds a FOMO
    `viewers_count` without exposing the raw viewer IDs."""
    if not isinstance(listing, dict):
        return {}
    out = {k: v for k, v in listing.items() if k != "_id"}
    viewers = out.pop("current_viewers", []) or []
    # Add a small noise offset so 1 attorney doesn't see "0 confrères".
    jitter = random.randint(1, 4)
    out["viewers_count"] = len([v for v in viewers if v != viewer_attorney_id]) + jitter
    # Hide the locked_by attorney_id from the response — only the viewer's own
    # acquisition list needs to know it, and that lives in `/my-cases`.
    if viewer_attorney_id and out.get("locked_by") and out["locked_by"] != viewer_attorney_id:
        out["locked_by"] = "other"
    return out


@router.get("/attorney/marketplace")
async def get_marketplace(
    case_type: str | None = None,
    current_attorney: dict = Depends(attorney_required),
):
    """List available cases for the logged-in attorney.
    Filters: case_type (optional). Country is BE-only (freeze US)."""
    query: dict[str, Any] = {"status": "available", "country": "BE"}
    if case_type:
        query["case_type"] = case_type.lower()

    cursor = db.case_marketplace.find(query, {"_id": 0}).sort("created_at", -1).limit(80)
    listings = await cursor.to_list(80)

    # Track view (FOMO) — add attorney_id to current_viewers, bump view_count.
    aid = current_attorney.get("id")
    if listings and aid:
        ids = [l["listing_id"] for l in listings]
        try:
            await db.case_marketplace.update_many(
                {"listing_id": {"$in": ids}},
                {
                    "$addToSet": {"current_viewers": aid},
                    "$inc": {"view_count": 1},
                },
            )
        except Exception as e:
            logger.debug(f"marketplace view tracking failed: {e}")

    return [_sanitize_listing(l, aid) for l in listings]


@router.get("/attorney/marketplace/stats")
async def get_marketplace_stats(current_attorney: dict = Depends(attorney_required)):
    """KPIs for the attorney desk hero: available count, acquired this
    month, total financial stakes on their active cases."""
    available = await db.case_marketplace.count_documents({
        "status": "available", "country": "BE",
    })
    acquired_this_month = int(current_attorney.get("cases_acquired_this_month") or 0)

    total_stakes = 0
    acquired_ids = current_attorney.get("acquired_cases") or []
    if acquired_ids:
        pipeline = [
            {"$match": {
                "case_id": {"$in": acquired_ids},
                "status": {"$nin": ["resolved", "closed", "archived"]},
            }},
            {"$group": {"_id": None, "total": {"$sum": "$financial_exposure"}}},
        ]
        try:
            agg = await db.cases.aggregate(pipeline).to_list(1)
            if agg:
                val = agg[0].get("total") or 0
                total_stakes = int(val) if isinstance(val, (int, float)) else 0
        except Exception as e:
            logger.debug(f"marketplace stats aggregate failed: {e}")

    return {
        "available": available,
        "acquired_this_month": acquired_this_month,
        "total_stakes": total_stakes,
    }


@router.get("/attorney/marketplace/my-cases")
async def get_my_acquired_cases(current_attorney: dict = Depends(attorney_required)):
    """Cases the attorney has already unlocked. Returns the FULL case docs
    (attorneys who paid get full client PII + documents)."""
    acquired_ids = current_attorney.get("acquired_cases") or []
    if not acquired_ids:
        return []
    cursor = db.cases.find({"case_id": {"$in": acquired_ids}}, {"_id": 0}).sort("acquired_at", -1).limit(100)
    cases = await cursor.to_list(100)
    return cases


@router.get("/attorney/marketplace/{listing_id}")
async def get_marketplace_listing(
    listing_id: str,
    current_attorney: dict = Depends(attorney_required),
):
    """Single-listing fetch. If the listing is `locked` AND the current
    attorney is the one who locked it, we DO return full case data. Otherwise
    we return the anonymized listing only (409 when locked by someone else)."""
    listing = await db.case_marketplace.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    aid = current_attorney.get("id")
    if listing.get("status") == "locked" and listing.get("locked_by") == aid:
        full_case = await db.cases.find_one({"case_id": listing["case_id"]}, {"_id": 0})
        return {
            "listing": _sanitize_listing(listing, aid),
            "case": full_case,
            "access": "full",
        }
    if listing.get("status") != "available":
        return {
            "listing": _sanitize_listing(listing, aid),
            "access": "locked_by_other" if listing.get("status") == "locked" else listing.get("status"),
        }
    return {
        "listing": _sanitize_listing(listing, aid),
        "access": "preview",
    }


@router.post("/attorney/marketplace/{listing_id}/checkout")
async def create_marketplace_checkout(
    listing_id: str,
    current_attorney: dict = Depends(attorney_required),
):
    """Create a Stripe Checkout session to unlock the listing. The session's
    metadata is the source of truth — the webhook (`checkout.session.completed`)
    atomically flips status→locked and refunds losers on race."""
    listing = await db.case_marketplace.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.get("status") != "available":
        raise HTTPException(
            status_code=409,
            detail={
                "error": "case_taken",
                "message": "Ce dossier a deja ete acquis par un confrere.",
            },
        )

    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    attorney_email = current_attorney.get("email") or ""
    price_cents = int(listing.get("price_cents") or 0)
    if price_cents <= 0:
        raise HTTPException(status_code=500, detail="Invalid listing price")

    def _create():
        return stripe.checkout.Session.create(
            payment_method_types=["card"],
            customer_email=attorney_email or None,
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": f"Dossier Archer — {listing.get('case_type_label', 'Dossier')}",
                        "description": (listing.get("title") or "Dossier qualifie")[:300],
                    },
                    "unit_amount": price_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{_app_url()}/attorneys/desk?payment=success&listing={listing_id}",
            cancel_url=f"{_app_url()}/attorneys/desk?payment=cancelled",
            metadata={
                "type": "marketplace_unlock",
                "listing_id": listing_id,
                "case_id": str(listing["case_id"]),
                "attorney_id": current_attorney.get("id") or "",
            },
            payment_intent_data={
                "metadata": {
                    "type": "marketplace_unlock",
                    "listing_id": listing_id,
                    "case_id": str(listing["case_id"]),
                    "attorney_id": current_attorney.get("id") or "",
                },
            },
        )

    try:
        session = await asyncio.to_thread(_create)
    except Exception as e:
        logger.exception("marketplace checkout failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "amount_cents": price_cents,
        "currency": "eur",
    }


# ════════════════════════════════════════════════════════════════════════
# Stripe webhook handler — called from stripe_webhooks.py dispatcher
# ════════════════════════════════════════════════════════════════════════

async def handle_marketplace_checkout_session(session: Any) -> None:
    """Runs on `checkout.session.completed` when metadata.type == "marketplace_unlock".

    Atomicity: we use `update_one({status:"available"}, {status:"locked"})`
    as the only gate. `modified_count == 0` means another attorney won the
    race → refund this payment automatically.
    """
    def _get(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    metadata = _get(session, "metadata") or {}
    if _get(metadata, "type") != "marketplace_unlock":
        return
    listing_id = _get(metadata, "listing_id")
    case_id = _get(metadata, "case_id")
    attorney_id = _get(metadata, "attorney_id")
    payment_intent_id = _get(session, "payment_intent")
    amount_total = int(_get(session, "amount_total") or 0)

    if not (listing_id and case_id and attorney_id):
        logger.warning("marketplace webhook: missing metadata fields")
        return

    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Atomic lock — only succeeds if status is still "available".
    result = await db.case_marketplace.update_one(
        {"listing_id": listing_id, "status": "available"},
        {"$set": {
            "status": "locked",
            "locked_by": attorney_id,
            "locked_at": now_iso,
            "stripe_payment_id": payment_intent_id,
        }},
    )

    if getattr(result, "modified_count", 0) == 0:
        # Someone else locked it first — auto-refund the loser.
        logger.warning(
            f"marketplace: race loser on listing {listing_id}, attorney {attorney_id} "
            f"— refunding {payment_intent_id}"
        )
        if payment_intent_id:
            try:
                await asyncio.to_thread(stripe.Refund.create, payment_intent=payment_intent_id)
            except Exception as e:
                logger.error(f"marketplace: refund failed for {payment_intent_id}: {e}")
        return

    # 2. Reflect ownership on the case document.
    await db.cases.update_one(
        {"case_id": case_id},
        {"$set": {
            "marketplace_status": "acquired",
            "acquired_by_attorney_id": attorney_id,
            "acquired_at": now_iso,
            "attorney_payment_id": payment_intent_id,
        }},
    )

    # 3. Update attorney profile (push to acquired list + spend tracking).
    await db.attorneys.update_one(
        {"id": attorney_id},
        {
            "$addToSet": {"acquired_cases": case_id},
            "$inc": {
                "total_spent_cents": amount_total,
                "cases_acquired_this_month": 1,
            },
        },
    )

    logger.info(
        f"marketplace: listing {listing_id} → attorney {attorney_id} "
        f"(case {case_id}, €{amount_total // 100})"
    )

    # 4. Fire-and-forget notifications (non-blocking).
    asyncio.create_task(_notify_unlock(case_id, attorney_id, amount_total))


async def _notify_unlock(case_id: str, attorney_id: str, amount_total_cents: int) -> None:
    """Send confirmation emails to both client and attorney after an unlock.
    Runs in the background — failures are logged, never raised back to Stripe."""
    try:
        # Lazy import to avoid circular dependency with attorney_routes.
        from routes.attorney_routes import send_email, APP_URL
    except Exception as e:
        logger.error(f"marketplace notify: cannot import send_email ({e})")
        return

    try:
        case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
        attorney = await db.attorneys.find_one({"id": attorney_id}, {"_id": 0})
        if not case or not attorney:
            logger.warning(
                f"marketplace notify: missing case ({bool(case)}) / attorney "
                f"({bool(attorney)}) for case {case_id}"
            )
            return
        user = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0}) or {}
    except Exception as e:
        logger.error(f"marketplace notify: lookup failed ({e})")
        return

    attorney_name = (
        f"Me {attorney.get('last_name') or attorney.get('first_name') or ''}".strip()
        or attorney.get("email") or "Votre avocat"
    )
    attorney_full = (
        f"{attorney.get('first_name', '')} {attorney.get('last_name', '')}".strip()
        or attorney.get("email")
    )
    bar = attorney.get("bar_association") or attorney.get("jurisdiction") or "Barreau de Belgique"

    case_title = case.get("title") or "Votre dossier"
    case_short_id = (case_id or "")[-6:]
    dashboard_url = f"{APP_URL.rstrip('/')}/cases/{case_id}"
    attorney_case_url = f"{APP_URL.rstrip('/')}/attorneys/cases/{case_id}"

    # ── Email client ─────────────────────────────────────────────────
    client_email = case.get("user_email") or user.get("email")
    if client_email:
        client_html = f"""
        <div style="max-width:600px;margin:0 auto;font-family:-apple-system,Segoe UI,sans-serif;color:#222a38;line-height:1.55">
          <div style="padding:28px 0 18px;border-bottom:2px solid #222a38">
            <span style="font-size:22px;font-weight:800;color:#222a38">Archer</span>
          </div>
          <div style="padding:28px 0">
            <h1 style="font-size:22px;font-weight:700;color:#222a38;margin:0 0 12px">Un avocat a pris en charge votre dossier</h1>
            <p style="font-size:15px;color:#5c6478;margin:0 0 16px">
              Bonne nouvelle — <strong style="color:#222a38">{attorney_full}</strong>
              ({bar}) a pris en charge votre dossier
              <em>« {case_title} »</em> (#{case_short_id}).
            </p>
            <p style="font-size:15px;color:#5c6478;margin:0 0 16px">
              Il prendra contact avec vous prochainement. Vous pouvez
              aussi suivre l'avancement depuis votre dashboard Archer.
            </p>
            <div style="margin-top:24px">
              <a href="{dashboard_url}" style="display:inline-block;padding:14px 28px;background:#1a56db;color:white;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">
                Voir mon dossier
              </a>
            </div>
          </div>
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e6eb;text-align:center">
            <p style="font-size:11px;color:#8b93a5;margin:0">
              Archer — votre partenaire juridique en Belgique.
            </p>
          </div>
        </div>
        """
        try:
            await send_email(
                to=client_email,
                subject="Un avocat a pris en charge votre dossier",
                html_body=client_html,
            )
        except Exception as e:
            logger.error(f"marketplace notify: client email failed ({e})")

    # ── Email avocat ─────────────────────────────────────────────────
    attorney_email = attorney.get("email")
    if attorney_email:
        client_name = (user.get("name") or "").strip() or case.get("user_name") or "Client"
        client_contact_email = client_email or "—"
        client_contact_phone = user.get("phone") or case.get("user_phone") or "—"
        amount_eur = amount_total_cents // 100
        attorney_html = f"""
        <div style="max-width:600px;margin:0 auto;font-family:-apple-system,Segoe UI,sans-serif;color:#222a38;line-height:1.55">
          <div style="padding:28px 0 18px;border-bottom:2px solid #222a38">
            <span style="font-size:22px;font-weight:800;color:#222a38">Archer</span>
            <span style="font-size:11px;color:#9a7b4f;font-weight:700;letter-spacing:1px;margin-left:8px">PORTAIL AVOCAT</span>
          </div>
          <div style="padding:28px 0">
            <h1 style="font-size:22px;font-weight:700;color:#222a38;margin:0 0 8px">Dossier débloqué</h1>
            <p style="font-size:15px;color:#5c6478;margin:0 0 16px">
              Vous avez maintenant accès au dossier complet (paiement <strong>€{amount_eur}</strong> confirmé).
            </p>
            <table style="width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #e4e6eb;border-radius:8px;overflow:hidden">
              <tr><td style="padding:10px 14px;background:#f5f6f8;font-size:12px;color:#8b93a5;width:120px">Dossier</td><td style="padding:10px 14px;font-size:14px;font-weight:600">{case_title}</td></tr>
              <tr><td style="padding:10px 14px;background:#f5f6f8;font-size:12px;color:#8b93a5;border-top:1px solid #e4e6eb">Client</td><td style="padding:10px 14px;font-size:14px;border-top:1px solid #e4e6eb">{client_name}</td></tr>
              <tr><td style="padding:10px 14px;background:#f5f6f8;font-size:12px;color:#8b93a5;border-top:1px solid #e4e6eb">Email</td><td style="padding:10px 14px;font-size:14px;border-top:1px solid #e4e6eb"><a href="mailto:{client_contact_email}" style="color:#1a56db;text-decoration:none">{client_contact_email}</a></td></tr>
              <tr><td style="padding:10px 14px;background:#f5f6f8;font-size:12px;color:#8b93a5;border-top:1px solid #e4e6eb">Téléphone</td><td style="padding:10px 14px;font-size:14px;border-top:1px solid #e4e6eb">{client_contact_phone}</td></tr>
            </table>
            <p style="font-size:14px;color:#5c6478;margin:0 0 20px">
              L'analyse IA complète (7 passes), les documents du dossier
              et l'historique du chat sont disponibles dans votre portail.
            </p>
            <div>
              <a href="{attorney_case_url}" style="display:inline-block;padding:14px 28px;background:#222a38;color:white;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">
                Ouvrir le dossier
              </a>
            </div>
          </div>
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e6eb;text-align:center">
            <p style="font-size:11px;color:#8b93a5;margin:0">
              Archer — Portail Avocat · <a href="{APP_URL.rstrip('/')}/attorneys/profile" style="color:#9a7b4f">Mes paramètres</a>
            </p>
          </div>
        </div>
        """
        try:
            await send_email(
                to=attorney_email,
                subject=f"Dossier débloqué — {case_title}",
                html_body=attorney_html,
            )
        except Exception as e:
            logger.error(f"marketplace notify: attorney email failed ({e})")
