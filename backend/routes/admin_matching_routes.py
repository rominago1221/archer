"""Sprint C — Admin matching dashboard + override endpoints.

Mounted at /api/admin/matching/*. Gated by verify_admin.
"""
from __future__ import annotations
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from db import db
from routes.attorney_routes import verify_admin
from services.attorney_matching import assign_case_to_attorney, log_matching_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/matching")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts):
    if not ts:
        return None
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _humanize_duration(seconds: float) -> str:
    if seconds is None:
        return "—"
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    m, s = divmod(s, 60)
    if m < 60:
        return f"{m}min {s}s" if s else f"{m}min"
    h, m = divmod(m, 60)
    if h < 24:
        return f"{h}h {m}min" if m else f"{h}h"
    d, h = divmod(h, 24)
    return f"{d}d {h}h" if h else f"{d}d"


# =========================================================================
# GET /admin/matching/dashboard
# =========================================================================

@router.get("/dashboard")
async def dashboard(_admin=Depends(verify_admin)):
    now = _now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_iso = start_of_day.isoformat()

    assigned_today = await db.attorney_matching_log.count_documents({
        "action": "auto_matched", "created_at": {"$gte": start_iso},
    })
    expired_today = await db.attorney_matching_log.count_documents({
        "action": "expired_no_response", "created_at": {"$gte": start_iso},
    })
    unmatched_today = await db.attorney_matching_log.count_documents({
        "action": "no_match", "created_at": {"$gte": start_iso},
    })

    # Average acceptance time today — from assigned_at → accepted_at
    accepted = await db.case_assignments.find(
        {"status": {"$in": ["accepted", "completed"]},
         "accepted_at": {"$gte": start_iso}},
        {"_id": 0, "assigned_at": 1, "accepted_at": 1},
    ).to_list(500)
    durations = []
    for a in accepted:
        d_assigned = _parse(a.get("assigned_at"))
        d_accepted = _parse(a.get("accepted_at"))
        if d_assigned and d_accepted:
            durations.append((d_accepted - d_assigned).total_seconds())
    avg_acc = sum(durations) / len(durations) if durations else None

    # Attorneys — active + their live metrics
    attorneys = await db.attorneys.find(
        {"status": "active"}, {"_id": 0, "password_hash": 0},
    ).to_list(500)

    week_ago_iso = (now - timedelta(days=7)).isoformat()
    out_attys = []
    for a in attorneys:
        pending = await db.case_assignments.count_documents(
            {"attorney_id": a["id"], "status": "pending"},
        )
        this_week = await db.attorney_matching_log.count_documents({
            "attorney_id": a["id"], "action": "auto_matched",
            "created_at": {"$gte": week_ago_iso},
        })
        out_attys.append({
            "id": a["id"],
            "name": f"{a.get('first_name','')} {a.get('last_name','')}".strip() or a.get("email"),
            "email": a.get("email"),
            "active_cases": int(a.get("active_cases_count") or 0),
            "pending_cases": pending,
            "rating": a.get("rating_avg"),
            "available": bool(a.get("available_for_cases")),
            "stripe_ready": bool(a.get("stripe_onboarding_completed")),
            "jurisdiction": a.get("jurisdiction"),
            "specialties": a.get("specialties") or [],
            "this_week_assigned": this_week,
            "avg_response_seconds": a.get("avg_response_seconds"),
        })
    out_attys.sort(key=lambda x: x["active_cases"])

    # Unmatched cases
    unmatched = await db.cases.find(
        {"attorney_status": "unassigned_no_match"},
        {"_id": 0, "case_id": 1, "title": 1, "type": 1, "country": 1,
         "updated_at": 1, "created_at": 1},
    ).to_list(200)
    unmatched_rows = []
    for c in unmatched:
        ts = _parse(c.get("updated_at") or c.get("created_at"))
        waiting = (now - ts).total_seconds() if ts else None
        unmatched_rows.append({
            "case_id": c["case_id"],
            "case_number": c["case_id"][-4:],  # display-only
            "title": c.get("title"),
            "case_type": c.get("type"),
            "jurisdiction": c.get("country"),
            "waiting_since": _humanize_duration(waiting),
            "waiting_seconds": int(waiting) if waiting else None,
        })
    unmatched_rows.sort(key=lambda r: r.get("waiting_seconds") or 0, reverse=True)

    # Recent events (20 last)
    recent = await db.attorney_matching_log.find(
        {}, {"_id": 0},
    ).sort("created_at", -1).to_list(20)

    return {
        "today": {
            "cases_assigned": assigned_today,
            "cases_expired": expired_today,
            "cases_unmatched": unmatched_today,
            "avg_acceptance_time_seconds": int(avg_acc) if avg_acc else None,
        },
        "attorneys": out_attys,
        "unmatched_cases": unmatched_rows,
        "recent_events": recent,
    }


# =========================================================================
# POST /admin/cases/:case_id/manual-assign
# =========================================================================

class ManualAssignRequest(BaseModel):
    attorney_id: str


@router.post("/cases/{case_id}/manual-assign", status_code=201)
async def manual_assign(
    case_id: str,
    body: ManualAssignRequest,
    _admin=Depends(verify_admin),
):
    attorney = await db.attorneys.find_one({"id": body.attorney_id}, {"_id": 0})
    if not attorney:
        raise HTTPException(status_code=404, detail="Attorney not found")
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # If there's already a pending assignment for this case, refuse
    pending = await db.case_assignments.find_one(
        {"case_id": case_id, "status": "pending"},
        {"_id": 0, "id": 1},
    )
    if pending:
        raise HTTPException(
            status_code=409,
            detail=f"Case already has a pending assignment ({pending['id']})",
        )

    # Exclude nobody — manual override can resurrect attorneys who previously
    # expired or declined this case.
    assignment = await assign_case_to_attorney(
        case_id,
        exclude_attorney_ids=[],
        service_type="attorney_letter",
        notify=True,
    )
    if not assignment:
        # Can happen if the requested attorney doesn't match filters.
        raise HTTPException(status_code=422, detail="Matching failed; attorney may not fit filters")
    # Tag the log with manual_assigned override
    asyncio.create_task(log_matching_event(
        case_id, body.attorney_id, "manual_assigned",
        metadata={"assignment_id": assignment["id"], "admin_email": getattr(_admin, "email", None)},
    ))
    return {
        "success": True,
        "assignment_id": assignment["id"],
        "attorney_id": assignment["attorney_id"],
    }


# =========================================================================
# GET /admin/matching/logs/:case_id
# =========================================================================

@router.get("/logs/{case_id}")
async def logs_for_case(case_id: str, _admin=Depends(verify_admin)):
    events = await db.attorney_matching_log.find(
        {"case_id": case_id}, {"_id": 0},
    ).sort("created_at", 1).to_list(200)
    # Enrich attorney names
    atty_ids = list({e["attorney_id"] for e in events if e.get("attorney_id")})
    attorneys = await db.attorneys.find(
        {"id": {"$in": atty_ids}}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "email": 1},
    ).to_list(len(atty_ids) or 1)
    by_id = {a["id"]: a for a in attorneys}
    attempts = []
    for e in events:
        atty = by_id.get(e.get("attorney_id")) if e.get("attorney_id") else None
        attempts.append({
            "attorney_id": e.get("attorney_id"),
            "attorney_name": (
                f"{atty.get('first_name','')} {atty.get('last_name','')}".strip()
                if atty else None
            ),
            "attorney_email": atty.get("email") if atty else None,
            "matched_at": e.get("created_at"),
            "score": e.get("match_score"),
            "candidates_considered": e.get("candidates_considered"),
            "result": e.get("action"),
            "metadata": e.get("metadata"),
        })
    return {"case_id": case_id, "attempts": attempts}
