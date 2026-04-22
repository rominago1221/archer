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

import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from db import db
from config.case_pricing import (
    get_case_price,
    risk_level_for_score,
)

logger = logging.getLogger(__name__)

# Listings auto-expire after this many hours if no attorney unlocks them.
LISTING_TTL_HOURS = 72


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
