"""Sprint C — Auto-matching client case → attorney.

All MongoDB-native (motor async). Strict anonymization is kept in place:
this service ONLY writes assignment metadata. Anything that goes back to
the attorney still flows through `utils/case_serializer.py`.
"""
from __future__ import annotations
import os
import random
import secrets
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Iterable, Optional

from db import db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configurable coefficients (tune with real data post-launch)
# ---------------------------------------------------------------------------

MATCHING_WEIGHT_LOAD = float(os.environ.get("MATCHING_WEIGHT_LOAD", "5"))
MATCHING_WEIGHT_RATING = float(os.environ.get("MATCHING_WEIGHT_RATING", "3"))
MATCHING_WEIGHT_SPEED = float(os.environ.get("MATCHING_WEIGHT_SPEED", "1"))
ASSIGNMENT_EXPIRY_MINUTES = int(os.environ.get("ASSIGNMENT_EXPIRY_MINUTES", "30"))
REQUIRE_STRIPE_ONBOARDING = os.environ.get("REQUIRE_STRIPE_ONBOARDING", "false").lower() == "true"

# Case type → specialty mapping (Sprint C — extended)
SPECIALTY_MAPPING = {
    "eviction": "logement",
    "tenant_dispute": "logement",
    "housing": "logement",
    "wrongful_termination": "travail",
    "severance": "travail",
    "employment": "travail",
    "consumer_refund": "consommation",
    "consumer": "consommation",
    "speeding_ticket": "penal_routier",
    "insurance_claim": "assurance",
    "insurance": "assurance",
    "contract_dispute": "civil",
    "family_law": "famille",
    "other": "civil",
}
FALLBACK_SPECIALTY = "civil"


def infer_specialty_from_case_type(case_type: str | None) -> str:
    if not case_type:
        return FALLBACK_SPECIALTY
    return SPECIALTY_MAPPING.get(str(case_type).lower(), FALLBACK_SPECIALTY)


# Simple pricing for attorney letter (cents). Sprint D will extend.
PRICING = {
    "attorney_letter": {"client": 4999, "archer_ratio": 0.30, "stripe_ratio": 0.035},
    # Sprint E — Live Counsel €149 BE / $149 US (unified to 14900¢)
    "live_counsel": {"client": 14900, "archer_ratio": 0.30, "stripe_ratio": 0.035},
}


def _calculate_pricing(service_type: str) -> dict:
    p = PRICING.get(service_type, PRICING["attorney_letter"])
    client = p["client"]
    archer = round(client * p["archer_ratio"])
    stripe = round(client * p["stripe_ratio"])
    payout = client - archer - stripe
    return {
        "client_pays_cents": client,
        "archer_fee_cents": archer,
        "stripe_fee_cents": stripe,
        "your_payout_cents": payout,
    }


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def compute_match_score(attorney: dict) -> float:
    """Composite score — higher = better. Pure function, testable in isolation."""
    active = int(attorney.get("active_cases_count") or 0)
    rating = float(attorney.get("rating_avg") or 4.0)
    response = attorney.get("avg_response_seconds")
    response = float(response) if response is not None else 7200.0
    load_score = -active
    rating_score = rating * 10.0
    speed_score = -response / 60.0
    tiebreak = random.uniform(0, 0.5)
    return (
        load_score * MATCHING_WEIGHT_LOAD
        + rating_score * MATCHING_WEIGHT_RATING
        + speed_score * MATCHING_WEIGHT_SPEED
        + tiebreak
    )


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

async def match_case_to_attorney(
    case: dict,
    exclude_attorney_ids: Optional[Iterable[str]] = None,
    requires_calendly: bool = False,
) -> tuple[Optional[dict], int]:
    """Pure read. Returns (attorney_doc_or_none, candidates_considered).

    Second value is the count of attorneys matching specialty+jurisdiction+
    availability (before scoring) — useful for the audit log.

    Sprint E: `requires_calendly=True` additionally filters on
    `calendly_url != None AND calendly_url_validated=True`. Used by Live Counsel.
    """
    exclude = set(exclude_attorney_ids or [])
    jurisdiction = case.get("country") or case.get("jurisdiction")
    specialty = infer_specialty_from_case_type(case.get("type"))

    q: dict = {
        "status": "active",
        "available_for_cases": True,
        "jurisdiction": jurisdiction,
        "specialties": specialty,  # matches if the array contains the value
    }
    if REQUIRE_STRIPE_ONBOARDING:
        q["stripe_onboarding_completed"] = True
    if requires_calendly:
        q["calendly_url"] = {"$ne": None}
        q["calendly_url_validated"] = True

    candidates = await db.attorneys.find(q, {"_id": 0}).to_list(500)
    candidates = [a for a in candidates if a.get("id") not in exclude]

    if not candidates:
        return (None, 0)

    scored = sorted(candidates, key=compute_match_score, reverse=True)
    return (scored[0], len(candidates))


async def has_available_attorney_for(case: dict, *, requires_calendly: bool = False) -> bool:
    """Pre-flight check for client checkout: returns True if at least one
    attorney matches the case's specialty + jurisdiction + Calendly requirement.
    Used by the live-counsel checkout endpoint to short-circuit before
    creating a Stripe session.
    """
    attorney, _ = await match_case_to_attorney(case, requires_calendly=requires_calendly)
    return attorney is not None


# ---------------------------------------------------------------------------
# Attorney metric updates (denormalized counters)
# ---------------------------------------------------------------------------

async def increment_active_cases(attorney_id: str, delta: int = 1) -> None:
    """Used on assignment creation (+1) and on accept-expiration/completion (-1)."""
    await db.attorneys.update_one(
        {"id": attorney_id},
        {"$inc": {"active_cases_count": delta},
         "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )


async def record_response_time(attorney_id: str, seconds: float) -> None:
    """Exponential moving average (alpha=0.3) on avg_response_seconds."""
    doc = await db.attorneys.find_one({"id": attorney_id}, {"avg_response_seconds": 1})
    prev = (doc or {}).get("avg_response_seconds")
    if prev is None:
        new_val = float(seconds)
    else:
        new_val = 0.3 * float(seconds) + 0.7 * float(prev)
    await db.attorneys.update_one(
        {"id": attorney_id},
        {"$set": {"avg_response_seconds": new_val}},
    )


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

async def log_matching_event(
    case_id: str,
    attorney_id: Optional[str],
    action: str,
    *,
    match_score: Optional[float] = None,
    candidates_considered: int = 0,
    excluded_attorney_ids: Optional[list[str]] = None,
    metadata: Optional[dict] = None,
) -> None:
    await db.attorney_matching_log.insert_one({
        "case_id": case_id,
        "attorney_id": attorney_id,
        "match_score": match_score,
        "candidates_considered": candidates_considered,
        "excluded_attorney_ids": list(excluded_attorney_ids or []),
        "action": action,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


# ---------------------------------------------------------------------------
# Assign
# ---------------------------------------------------------------------------

async def assign_case_to_attorney(
    case_id: str,
    *,
    exclude_attorney_ids: Optional[Iterable[str]] = None,
    service_type: str = "attorney_letter",
    notify: bool = True,
) -> Optional[dict]:
    """Top-level orchestrator — the only function other code should call.

    Returns the created assignment doc or None.
    """
    from routes.attorney_routes import send_email  # lazy import to avoid cycles
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        logger.error(f"assign_case_to_attorney: case {case_id} not found")
        return None

    exclude = list(exclude_attorney_ids or [])
    requires_calendly = (service_type == "live_counsel")
    attorney, candidates_considered = await match_case_to_attorney(
        case, exclude, requires_calendly=requires_calendly,
    )

    if not attorney:
        await log_matching_event(
            case_id, None, "no_match",
            candidates_considered=0,
            excluded_attorney_ids=exclude,
            metadata={
                "jurisdiction": case.get("country"),
                "specialty_required": infer_specialty_from_case_type(case.get("type")),
            },
        )
        await db.cases.update_one(
            {"case_id": case_id},
            {"$set": {"attorney_status": "unassigned_no_match",
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        if notify:
            admin_email = os.environ.get("ADMIN_NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL")
            if admin_email:
                asyncio.create_task(send_email(
                    admin_email,
                    f"⚠️ ACTION REQUISE : Cas #{case_id[-4:]} sans avocat disponible",
                    f"<p>Aucun avocat disponible pour le cas <code>{case_id}</code>.</p>"
                    f"<ul>"
                    f"<li>Spécialité requise : {infer_specialty_from_case_type(case.get('type'))}</li>"
                    f"<li>Jurisdiction : {case.get('country')}</li>"
                    f"<li>Avocats exclus : {len(exclude)}</li>"
                    f"</ul>"
                    f"<p>Action manuelle requise via /admin/matching.</p>",
                ))
        return None

    # Build the assignment (snapshot AI analysis at this point)
    client = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0}) or {}
    jurisdiction_label = ", ".join(p for p in [
        client.get("state_of_residence"), client.get("region"), client.get("country"),
    ] if p) or None

    pricing = _calculate_pricing(service_type)
    case_snapshot = {
        "title": case.get("title"),
        "type": case.get("type"),
        "language": case.get("language") or client.get("language") or "en",
        "jurisdiction": jurisdiction_label,
        "submitted_at": case.get("created_at"),
        "ai_summary": case.get("ai_summary"),
        "ai_findings": case.get("ai_findings", []),
        "strategy": case.get("strategy"),
        "success_probability": case.get("success_probability"),
    }
    now = datetime.now(timezone.utc)
    assignment_id = secrets.token_urlsafe(12)
    case_number = str(secrets.randbelow(9000) + 1000)
    score = compute_match_score(attorney)

    # Sprint E: Live Counsel bypasses the pending→accept step. The attorney
    # is implicitly committed by being Calendly-ready + available. Status
    # transitions to "accepted" via the Calendly webhook (invitee.created).
    is_live_counsel = (service_type == "live_counsel")
    if is_live_counsel:
        initial_status = "awaiting_calendly_booking"
        expires_at = (now + timedelta(days=7)).isoformat()  # client has 7 days to book
    else:
        initial_status = "pending"
        expires_at = (now + timedelta(minutes=ASSIGNMENT_EXPIRY_MINUTES)).isoformat()

    # For live counsel, snapshot the client immediately (no explicit accept step).
    client_snapshot = None
    if is_live_counsel:
        from utils.case_serializer import client_snapshot_from_user
        client_snapshot = client_snapshot_from_user(client)

    doc = {
        "id": assignment_id,
        "attorney_id": attorney["id"],
        "case_id": case_id,
        "client_user_id": case.get("user_id"),
        "status": initial_status,
        "service_type": service_type,
        "case_number": case_number,
        "demographic_hint": None,
        "assigned_at": now.isoformat(),
        "expires_at": expires_at,
        "accepted_at": None, "deadline_at": None,
        "declined_at": None, "decline_reason": None, "decline_notes": None,
        "completed_at": None, "paid_out_at": None,
        "client_snapshot": client_snapshot,
        "signed_letter_storage_path": None,
        "signed_letter_uploaded_at": None,
        "expiring_email_sent": False,
        # Sprint E live counsel fields
        "scheduled_at": None,
        "daily_co_room_url": None, "daily_co_room_name": None,
        "calendly_event_url": None, "calendly_invitee_uri": None,
        "reminder_1h_sent": False, "reminder_10min_sent": False,
        "call_started_at": None, "call_ended_at": None,
        "case_snapshot": case_snapshot,
        "match_score": score,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        **pricing,
    }
    await db.case_assignments.insert_one(doc)

    await db.cases.update_one(
        {"case_id": case_id},
        {"$set": {"attorney_status": "assigned", "updated_at": now.isoformat()}},
    )
    await increment_active_cases(attorney["id"], +1)

    await log_matching_event(
        case_id, attorney["id"], "auto_matched",
        match_score=score,
        candidates_considered=candidates_considered,
        excluded_attorney_ids=exclude,
        metadata={"assignment_id": assignment_id, "service_type": service_type},
    )

    if notify:
        asyncio.create_task(_notify_new_case(attorney, doc))

    return doc


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def _app_url() -> str:
    return os.environ.get("APP_URL", "https://archer.legal").rstrip("/")


async def _notify_new_case(attorney: dict, assignment: dict) -> None:
    from routes.attorney_routes import send_email
    case_no = assignment.get("case_number")
    case_type = (assignment.get("case_snapshot") or {}).get("type") or "case"
    payout = (assignment.get("your_payout_cents") or 0) / 100
    url = f"{_app_url()}/attorneys/cases/{assignment['id']}"
    subject = f"🔔 Nouveau dossier #{case_no} — {case_type} — Acceptez dans 30 min"
    html = (
        f"<p>Maître {attorney.get('first_name','')},</p>"
        f"<p>Un nouveau dossier vient de vous être attribué :</p>"
        f"<p>📁 Cas #{case_no} — {case_type}<br/>"
        f"⏱ Win probability : "
        f"{(assignment.get('case_snapshot') or {}).get('success_probability', {}).get('overall','—')}%<br/>"
        f"💰 Vos earnings : {payout:.2f}€</p>"
        f"<p>Vous avez 30 minutes pour l'accepter ou le décliner. "
        f"Sans réponse, le cas sera proposé à un autre avocat.</p>"
        f"<p><a href=\"{url}\">Voir le dossier →</a></p>"
        f"<p>L'équipe Archer</p>"
    )
    await send_email(attorney["email"], subject, html)


async def notify_attorney_accepted(attorney: dict, assignment: dict) -> None:
    """Called from the accept endpoint in routes/attorney_portal_cases.py."""
    from routes.attorney_routes import send_email
    case_no = assignment.get("case_number")
    url = f"{_app_url()}/attorneys/cases/{assignment['id']}"
    deadline = assignment.get("deadline_at") or ""
    subject = f"✓ Cas #{case_no} accepté — Deadline dans 4h"
    html = (
        f"<p>Vous avez accepté le cas #{case_no}.</p>"
        f"<p>📋 Toutes les infos client sont maintenant accessibles<br/>"
        f"⏱ Deadline de livraison : {deadline}<br/>"
        f"💼 Vous pouvez uploader la lettre signée dans votre dashboard.</p>"
        f"<p><a href=\"{url}\">Continuer le dossier →</a></p>"
    )
    await send_email(attorney["email"], subject, html)


async def notify_attorney_expiring(attorney: dict, assignment: dict) -> None:
    from routes.attorney_routes import send_email
    case_no = assignment.get("case_number")
    url = f"{_app_url()}/attorneys/cases/{assignment['id']}"
    subject = f"⏰ 15 min restantes — Cas #{case_no}"
    html = (
        f"<p>Maître {attorney.get('first_name','')},</p>"
        f"<p>Il vous reste 15 minutes pour répondre au cas #{case_no}. "
        f"Sans réponse, il sera proposé à un autre avocat.</p>"
        f"<p><a href=\"{url}\">Accepter ou décliner →</a></p>"
    )
    await send_email(attorney["email"], subject, html)


async def notify_client_searching(user_doc: dict, case_id: str) -> None:
    from routes.attorney_routes import send_email
    subject = "🔍 Nous cherchons l'avocat parfait pour votre dossier"
    html = (
        f"<p>Bonjour,</p>"
        f"<p>Votre cas a été enregistré et notre équipe cherche activement "
        f"le meilleur avocat pour vous.</p>"
        f"<p>Cela prend généralement moins de 30 minutes. "
        f"Vous serez notifié par email dès qu'un avocat aura accepté.</p>"
    )
    if user_doc.get("email"):
        await send_email(user_doc["email"], subject, html)
