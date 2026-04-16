"""Admin endpoints for Sprint B — manual assignment of a case to an attorney.

Auto-matching algorithm = Sprint C.
"""
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from db import db
from utils.admin_auth import admin_required as verify_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


class AssignRequest(BaseModel):
    attorney_id: str
    service_type: Literal["attorney_letter", "live_counsel"] = "attorney_letter"
    client_pays_cents: int = 4999
    window_minutes: int = 30
    demographic_hint: Optional[str] = None


@router.post("/cases/{case_id}/assign", status_code=201)
async def admin_assign(
    case_id: str,
    body: AssignRequest,
    _admin=Depends(verify_admin),
):
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    attorney = await db.attorneys.find_one({"id": body.attorney_id}, {"_id": 0})
    if not attorney:
        raise HTTPException(status_code=404, detail="Attorney not found")

    # Build immutable case snapshot (AI analysis frozen at assignment time)
    client = await db.users.find_one({"user_id": case.get("user_id")}, {"_id": 0}) or {}
    jurisdiction = ", ".join(p for p in [
        client.get("state_of_residence"),
        client.get("region"),
        client.get("country"),
    ] if p) or None

    case_snapshot = {
        "title": case.get("title"),
        "type": case.get("type"),
        "language": case.get("language") or client.get("language") or "en",
        "jurisdiction": jurisdiction,
        "submitted_at": case.get("created_at"),
        "ai_summary": case.get("ai_summary"),
        "ai_findings": case.get("ai_findings", []),
        "strategy": case.get("strategy"),
        "success_probability": case.get("success_probability"),
    }

    # Earnings breakdown
    archer_fee_cents = round(body.client_pays_cents * 0.30)
    stripe_fee_cents = round(body.client_pays_cents * 0.035)
    payout_cents = body.client_pays_cents - archer_fee_cents - stripe_fee_cents

    now = _now()
    assignment_id = secrets.token_urlsafe(12)
    case_number = str(secrets.randbelow(9000) + 1000)  # 4-digit

    doc = {
        "id": assignment_id,
        "attorney_id": body.attorney_id,
        "case_id": case_id,
        "client_user_id": case.get("user_id"),
        "status": "pending",
        "service_type": body.service_type,
        "case_number": case_number,
        "demographic_hint": body.demographic_hint,
        "assigned_at": now.isoformat(),
        "expires_at": (now + timedelta(minutes=body.window_minutes)).isoformat(),
        "accepted_at": None,
        "deadline_at": None,
        "declined_at": None,
        "decline_reason": None,
        "decline_notes": None,
        "completed_at": None,
        "paid_out_at": None,
        "client_snapshot": None,
        "client_pays_cents": body.client_pays_cents,
        "archer_fee_cents": archer_fee_cents,
        "stripe_fee_cents": stripe_fee_cents,
        "your_payout_cents": payout_cents,
        "signed_letter_storage_path": None,
        "signed_letter_uploaded_at": None,
        "case_snapshot": case_snapshot,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.case_assignments.insert_one(doc)
    return {
        "success": True,
        "assignment_id": assignment_id,
        "expires_at": doc["expires_at"],
        "case_number": case_number,
    }
