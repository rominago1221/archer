"""Sprint C — Client-side trigger for attorney letter request.

When the client requests an attorney letter for one of their cases, we mark
the case as `waiting_assignment` and fire the matching algorithm. Sprint D
will wrap this behind a Stripe checkout webhook; for Sprint C it's a plain
authenticated POST.
"""
from __future__ import annotations
import logging
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal
from datetime import datetime, timezone

from db import db
from auth import get_current_user
from models import User
from services.attorney_matching import (
    assign_case_to_attorney,
    notify_client_searching,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class RequestAttorneyLetter(BaseModel):
    service_type: Literal["attorney_letter", "live_counsel"] = "attorney_letter"


@router.post("/cases/{case_id}/request-attorney-letter", status_code=201)
async def request_attorney_letter(
    case_id: str,
    body: RequestAttorneyLetter,
    current_user: User = Depends(get_current_user),
):
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.get("user_id") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your case")

    # Idempotent: if already assigned, short-circuit
    current_status = case.get("attorney_status")
    if current_status in ("waiting_assignment", "assigned"):
        pending = await db.case_assignments.find_one(
            {"case_id": case_id, "status": "pending"},
            {"_id": 0, "id": 1},
        )
        accepted = await db.case_assignments.find_one(
            {"case_id": case_id, "status": {"$in": ["accepted", "completed"]}},
            {"_id": 0, "id": 1, "status": 1},
        )
        if pending or accepted:
            return {
                "success": True,
                "attorney_status": case.get("attorney_status"),
                "assignment_id": (pending or accepted)["id"],
                "already_assigned": True,
            }

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.cases.update_one(
        {"case_id": case_id},
        {"$set": {"attorney_status": "waiting_assignment", "updated_at": now_iso}},
    )

    assignment = await assign_case_to_attorney(
        case_id,
        service_type=body.service_type,
        notify=True,
    )

    if not assignment:
        # Notify the client that we're actively searching (best-effort)
        user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0}) or {}
        asyncio.create_task(notify_client_searching(user_doc, case_id))
        return {
            "success": True,
            "attorney_status": "unassigned_no_match",
            "assignment_id": None,
            "message": "We're actively finding the right attorney for you.",
        }

    return {
        "success": True,
        "attorney_status": "assigned",
        "assignment_id": assignment["id"],
        "expires_at": assignment["expires_at"],
    }
