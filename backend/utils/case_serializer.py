"""Sprint B — Central serialization for attorney-facing case data.

THIS MODULE IS THE SINGLE SOURCE OF TRUTH FOR CLIENT ANONYMIZATION.
Any route that returns case data to an attorney MUST use these helpers.
A single leak here means attorney-client privilege failure.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any


# ---------------------------------------------------------------------------
# AI analysis normalization
# ---------------------------------------------------------------------------

def _finding_to_violation(f: dict) -> dict:
    """Map one `ai_findings` item to the attorney-facing `violation` shape."""
    if not isinstance(f, dict):
        return {"title": str(f), "description": None, "law_reference": None}
    return {
        "title": f.get("text") or f.get("title") or "",
        "description": f.get("impact_description") or f.get("description") or f.get("risk_if_ignored") or "",
        "law_reference": f.get("legal_ref") or f.get("law_reference") or f.get("jurisprudence"),
        "impact": f.get("impact"),
    }


def _strategy_to_strategies(strategy: Any) -> list[dict]:
    """Legacy compat: a single `strategy` dict becomes a single-element list."""
    if not strategy:
        return []
    if isinstance(strategy, list):
        items = strategy
    else:
        items = [strategy]
    out = []
    for i, s in enumerate(items):
        if not isinstance(s, dict):
            s = {"title": str(s)}
        out.append({
            "rank": i + 1,
            "title": s.get("title") or s.get("name") or s.get("strategy") or f"Strategy {i+1}",
            "description": s.get("description") or s.get("detail") or s.get("reasoning") or "",
            "score": s.get("score") or s.get("confidence") or s.get("win_probability"),
        })
    return out


def _extract_win_probability(case_doc: dict) -> int | None:
    sp = case_doc.get("success_probability")
    if isinstance(sp, (int, float)):
        return int(sp)
    if isinstance(sp, dict):
        for key in ("overall", "probability", "score", "value"):
            if key in sp and isinstance(sp[key], (int, float)):
                return int(sp[key])
    return None


def short_summary(full: str | None, limit: int = 140) -> str | None:
    if not full:
        return None
    s = full.strip()
    if len(s) <= limit:
        return s
    cut = s[:limit].rsplit(" ", 1)[0]
    return cut + "…"


# ---------------------------------------------------------------------------
# Client anonymization
# ---------------------------------------------------------------------------

def split_name(full_name: str | None) -> tuple[str, str]:
    if not full_name:
        return ("", "")
    parts = full_name.strip().split()
    if len(parts) == 1:
        return (parts[0], "")
    return (parts[0], " ".join(parts[1:]))


def _compose_full_address(user_doc: dict) -> str | None:
    parts = [
        user_doc.get("state_of_residence"),
        user_doc.get("region"),
        user_doc.get("country"),
    ]
    parts = [p for p in parts if p]
    return ", ".join(parts) if parts else None


def client_snapshot_from_user(user_doc: dict) -> dict:
    """Build the client snapshot we freeze into the assignment at accept time."""
    first, last = split_name(user_doc.get("name"))
    return {
        "first_name": first,
        "last_name": last,
        "email": user_doc.get("email"),
        "phone": user_doc.get("phone"),
        "full_address": _compose_full_address(user_doc),
        "language": user_doc.get("language") or "en",
    }


def _anonymized_client(assignment: dict, case_snapshot: dict) -> dict:
    """Redacted client block — MUST contain no PII."""
    return {
        "anonymized": True,
        "demographic_hint": assignment.get("demographic_hint"),
        "language": case_snapshot.get("language") or "en",
    }


def _revealed_client(snapshot: dict | None) -> dict:
    snapshot = snapshot or {}
    return {
        "anonymized": False,
        "first_name": snapshot.get("first_name"),
        "last_name": snapshot.get("last_name"),
        "email": snapshot.get("email"),
        "phone": snapshot.get("phone"),
        "full_address": snapshot.get("full_address"),
        "language": snapshot.get("language") or "en",
    }


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

def _serialize_document(doc: dict, is_accepted: bool, assignment_id: str) -> dict:
    is_main = bool(doc.get("is_key_document"))
    size_bytes = doc.get("file_size") or 0
    size_kb = int(size_bytes / 1024) if size_bytes else None
    locked = (not is_accepted) and (not is_main)
    return {
        "id": doc.get("document_id"),
        "name": doc.get("file_name"),
        "size_kb": size_kb,
        "pages": doc.get("page_count"),
        "uploaded_by": "client",
        "is_locked": locked,
        "is_main": is_main,
        "preview_url": None if locked else f"/api/attorneys/cases/{assignment_id}/documents/{doc.get('document_id')}/preview",
    }


# ---------------------------------------------------------------------------
# Earnings
# ---------------------------------------------------------------------------

def calculate_earnings_breakdown(assignment: dict) -> dict:
    client_pays = int(assignment.get("client_pays_cents") or 4999)
    archer_fee = int(assignment.get("archer_fee_cents") or round(client_pays * 0.30))
    stripe_fee = int(assignment.get("stripe_fee_cents") or round(client_pays * 0.035))
    payout = int(assignment.get("your_payout_cents") or (client_pays - archer_fee - stripe_fee))
    return {
        "client_pays_cents": client_pays,
        "archer_fee_cents": archer_fee,
        "stripe_fee_cents": stripe_fee,
        "your_payout_cents": payout,
    }


# ---------------------------------------------------------------------------
# Time
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts) -> datetime | None:
    if ts is None:
        return None
    if isinstance(ts, datetime):
        dt = ts
    else:
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _seconds_until(ts) -> int:
    d = _parse(ts)
    if d is None:
        return 0
    return max(0, int((d - _now()).total_seconds()))


# ---------------------------------------------------------------------------
# Main serializers
# ---------------------------------------------------------------------------

def serialize_case_for_attorney(
    assignment: dict,
    case_doc: dict,
    documents: list[dict],
) -> dict:
    """Main entry point. Serialize an assignment+case for the attorney,
    applying anonymization when status is not yet accepted.

    NO other function should build an attorney-facing case payload.
    """
    status = assignment.get("status", "pending")
    is_accepted = status in ("accepted", "completed")
    assignment_id = assignment.get("id")

    case_snapshot = assignment.get("case_snapshot") or {}
    # Prefer snapshot fields; fall back to live case doc for robustness.
    title = case_snapshot.get("title") or case_doc.get("title")
    case_type = case_snapshot.get("type") or case_doc.get("type")
    language = case_snapshot.get("language") or case_doc.get("language") or "en"
    jurisdiction = case_snapshot.get("jurisdiction")
    submitted_at = case_snapshot.get("submitted_at") or case_doc.get("created_at")
    ai_summary = case_snapshot.get("ai_summary") or case_doc.get("ai_summary")
    ai_findings = case_snapshot.get("ai_findings") or case_doc.get("ai_findings") or []
    strategy = case_snapshot.get("strategy") or case_doc.get("strategy")
    success_probability = case_snapshot.get("success_probability") or case_doc.get("success_probability")

    base: dict = {
        "assignment_id": assignment_id,
        "status": status,
        "case": {
            "case_number": assignment.get("case_number"),
            "case_type": case_type,
            "service_type": assignment.get("service_type"),
            "title": title,
            "jurisdiction": jurisdiction,
            "language": language,
            "submitted_at": submitted_at,
        },
        "ai_analysis": {
            "summary_full": ai_summary,
            "win_probability": _extract_win_probability({"success_probability": success_probability}),
            "violations_identified": [_finding_to_violation(f) for f in ai_findings],
            "strategies": _strategy_to_strategies(strategy),
        },
        "earnings_breakdown": calculate_earnings_breakdown(assignment),
    }

    # === CRITICAL: Client anonymization branch ===
    if is_accepted:
        base["client"] = _revealed_client(assignment.get("client_snapshot"))
    else:
        base["client"] = _anonymized_client(assignment, {"language": language})

    # === Documents (main always visible, rest locked until accepted) ===
    base["documents"] = [_serialize_document(d, is_accepted, assignment_id) for d in documents]

    # === Status-specific fields ===
    if status == "pending":
        base["expires_at"] = assignment.get("expires_at")
        base["expires_in_seconds"] = _seconds_until(assignment.get("expires_at"))
    if is_accepted:
        base["accepted_at"] = assignment.get("accepted_at")
        deadline = assignment.get("deadline_at")
        if not deadline and assignment.get("accepted_at"):
            deadline = (_parse(assignment["accepted_at"]) + timedelta(hours=4)).isoformat()
        base["deadline_at"] = deadline
        base["deadline_remaining_seconds"] = _seconds_until(deadline)
        base["draft_letter"] = {
            "available": False,
            "preview_url": None,
            "ai_generated": False,
            "coming_soon": True,
        }
        base["signed_letter"] = {
            "uploaded": bool(assignment.get("signed_letter_storage_path")),
            "uploaded_at": assignment.get("signed_letter_uploaded_at"),
            "url": (
                f"/api/attorneys/cases/{assignment_id}/signed-letter"
                if assignment.get("signed_letter_storage_path") else None
            ),
        }
    if status == "completed":
        base["completed_at"] = assignment.get("completed_at")
        base["paid_out_at"] = assignment.get("paid_out_at")
    if status == "declined":
        base["declined_at"] = assignment.get("declined_at")

    return base


def serialize_row_for_inbox(assignment: dict) -> dict:
    """Compact row used for the inbox list (pending only)."""
    case_snapshot = assignment.get("case_snapshot") or {}
    expires_at = assignment.get("expires_at")
    seconds_left = _seconds_until(expires_at)
    earnings = calculate_earnings_breakdown(assignment)
    findings = case_snapshot.get("ai_findings") or []
    return {
        "assignment_id": assignment.get("id"),
        "case_id": assignment.get("case_id"),
        "case_number": assignment.get("case_number"),
        "case_type": case_snapshot.get("type"),
        "service_type": assignment.get("service_type"),
        "title": case_snapshot.get("title"),
        "ai_summary_short": short_summary(case_snapshot.get("ai_summary")),
        "win_probability": _extract_win_probability({"success_probability": case_snapshot.get("success_probability")}),
        "violations_count": len(findings) if isinstance(findings, list) else 0,
        "jurisdiction": case_snapshot.get("jurisdiction"),
        "language": case_snapshot.get("language") or "en",
        "submitted_at": case_snapshot.get("submitted_at"),
        "expires_at": expires_at,
        "earnings_preview_cents": earnings["your_payout_cents"],
        "is_urgent": seconds_left > 0 and seconds_left < 15 * 60,
    }


def serialize_row_for_active(assignment: dict) -> dict:
    """Compact row for My Cases (accepted)."""
    case_snapshot = assignment.get("case_snapshot") or {}
    client = assignment.get("client_snapshot") or {}
    deadline_at = assignment.get("deadline_at")
    seconds_left = _seconds_until(deadline_at)
    earnings = calculate_earnings_breakdown(assignment)
    first = client.get("first_name") or ""
    last = client.get("last_name") or ""
    last_initial = f"{last[0]}." if last else ""
    return {
        "assignment_id": assignment.get("id"),
        "case_id": assignment.get("case_id"),
        "case_number": assignment.get("case_number"),
        "case_type": case_snapshot.get("type"),
        "service_type": assignment.get("service_type"),
        "title": case_snapshot.get("title"),
        "client_first_name": first,
        "client_last_initial": last_initial,
        "accepted_at": assignment.get("accepted_at"),
        "deadline_at": deadline_at,
        "deadline_remaining_seconds": seconds_left,
        "is_urgent": seconds_left > 0 and seconds_left < 60 * 60,
        "letter_uploaded": bool(assignment.get("signed_letter_storage_path")),
        "earnings_cents": earnings["your_payout_cents"],
    }


def serialize_row_for_completed(assignment: dict) -> dict:
    row = serialize_row_for_active(assignment)
    row["completed_at"] = assignment.get("completed_at")
    row["paid_out_at"] = assignment.get("paid_out_at")
    return row
