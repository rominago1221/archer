"""Admin attorney management — approval workflow, listing, bar card review.

Mounted at /api/admin/attorneys-v2/* (new admin auth system).
"""
from __future__ import annotations
import os
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from db import db
from utils.admin_auth import admin_required, log_admin_action

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/attorneys-v2")


@router.get("")
async def list_attorneys(
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    admin: dict = Depends(admin_required),
):
    """List attorneys with optional status filter."""
    query = {}
    if status:
        query["application_status"] = status

    total = await db.attorneys.count_documents(query)
    skip = (page - 1) * per_page
    attorneys = await db.attorneys.find(
        query, {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)

    return {
        "attorneys": attorneys,
        "total": total,
        "page": page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    }


@router.get("/pending-count")
async def pending_count(admin: dict = Depends(admin_required)):
    """Quick count for sidebar badge."""
    count = await db.attorneys.count_documents({"application_status": "pending"})
    return {"count": count}


@router.get("/{attorney_id}")
async def get_attorney_detail(attorney_id: str, admin: dict = Depends(admin_required)):
    """Get full attorney profile for review."""
    attorney = await db.attorneys.find_one(
        {"id": attorney_id}, {"_id": 0, "password_hash": 0})
    if not attorney:
        raise HTTPException(status_code=404, detail="Attorney not found")
    return attorney


class ApproveInput(BaseModel):
    note: Optional[str] = None


@router.post("/{attorney_id}/approve")
async def approve_attorney(
    attorney_id: str,
    body: ApproveInput = ApproveInput(),
    admin: dict = Depends(admin_required),
):
    """Approve a pending attorney application."""
    attorney = await db.attorneys.find_one({"id": attorney_id}, {"_id": 0})
    if not attorney:
        raise HTTPException(status_code=404, detail="Attorney not found")
    if attorney.get("application_status") != "pending":
        raise HTTPException(status_code=409, detail=f"Attorney is {attorney.get('application_status')}, not pending")

    now = datetime.now(timezone.utc).isoformat()
    new_status = "active" if attorney.get("stripe_onboarding_completed") else "pending_stripe"

    await db.attorneys.update_one(
        {"id": attorney_id},
        {"$set": {
            "application_status": "approved",
            "status": new_status,
            "approved_at": now,
            "approved_by_admin_id": admin["id"],
            "approval_note": body.note,
            "updated_at": now,
        }},
    )

    await log_admin_action(
        admin, "approve_attorney",
        entity_type="attorney", entity_id=attorney_id,
        metadata={"note": body.note, "new_status": new_status},
    )

    # Send welcome email
    try:
        from routes.attorney_routes import send_email
        name = attorney.get("first_name", attorney.get("full_name", ""))
        await send_email(
            attorney["email"],
            "Welcome to Archer — your application has been approved",
            f"<p>Ma\u00eetre {name},</p>"
            "<p>Great news! We've reviewed your application and approved your account.</p>"
            "<p>You can now:</p>"
            "<ul>"
            "<li>Start receiving cases matched to your specialties</li>"
            "<li>Access your attorney portal</li>"
            "<li>Configure your availability</li>"
            "</ul>"
            "<p><a href=\"https://archer.law/attorneys/dashboard\" "
            "style=\"display:inline-block;background:#1a56db;color:#fff;"
            "padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;\">"
            "Go to my dashboard \u2192</a></p>"
            + ("<p>If you haven't completed your Stripe onboarding yet, please do so within "
               "7 days to start receiving case attributions.</p>"
               if not attorney.get("stripe_onboarding_completed") else "")
            + "<p>Welcome to the team,<br>The Archer Team</p>",
        )
    except Exception:
        logger.exception(f"Failed to send approval email to {attorney.get('email')}")

    return {"status": "approved", "attorney_status": new_status}


class RejectInput(BaseModel):
    reason: str
    share_with_attorney: bool = False


@router.post("/{attorney_id}/reject")
async def reject_attorney(
    attorney_id: str,
    body: RejectInput,
    admin: dict = Depends(admin_required),
):
    """Reject a pending attorney application."""
    attorney = await db.attorneys.find_one({"id": attorney_id}, {"_id": 0})
    if not attorney:
        raise HTTPException(status_code=404, detail="Attorney not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.attorneys.update_one(
        {"id": attorney_id},
        {"$set": {
            "application_status": "rejected",
            "status": "rejected",
            "rejection_reason": body.reason,
            "rejection_reason_shared": body.share_with_attorney,
            "rejected_at": now,
            "rejected_by_admin_id": admin["id"],
            "updated_at": now,
        }},
    )

    await log_admin_action(
        admin, "reject_attorney",
        entity_type="attorney", entity_id=attorney_id,
        metadata={"reason": body.reason, "shared": body.share_with_attorney},
    )

    # Send rejection email
    try:
        from routes.attorney_routes import send_email
        name = attorney.get("first_name", attorney.get("full_name", ""))
        reason_block = (
            f"<p><strong>Reason:</strong> {body.reason}</p>"
            if body.share_with_attorney else ""
        )
        await send_email(
            attorney["email"],
            "Your Archer application",
            f"<p>Ma\u00eetre {name},</p>"
            "<p>Thank you for your interest in Archer.</p>"
            "<p>After careful review, we're unable to approve your application at this time.</p>"
            + reason_block
            + "<p>If you have questions or would like to reapply in the future, "
            "please contact us at admin@archer.law.</p>"
            "<p>The Archer Team</p>",
        )
    except Exception:
        logger.exception(f"Failed to send rejection email to {attorney.get('email')}")

    return {"status": "rejected"}


class SuspendInput(BaseModel):
    reason: str


@router.post("/{attorney_id}/suspend")
async def suspend_attorney(
    attorney_id: str,
    body: SuspendInput,
    admin: dict = Depends(admin_required),
):
    now = datetime.now(timezone.utc).isoformat()
    await db.attorneys.update_one(
        {"id": attorney_id},
        {"$set": {"status": "suspended", "suspension_reason": body.reason, "suspended_at": now, "updated_at": now}},
    )
    await log_admin_action(admin, "suspend_attorney", entity_type="attorney", entity_id=attorney_id)
    return {"status": "suspended"}


@router.post("/{attorney_id}/unsuspend")
async def unsuspend_attorney(attorney_id: str, admin: dict = Depends(admin_required)):
    now = datetime.now(timezone.utc).isoformat()
    await db.attorneys.update_one(
        {"id": attorney_id},
        {"$set": {"status": "active", "suspended_at": None, "suspension_reason": None, "updated_at": now}},
    )
    await log_admin_action(admin, "unsuspend_attorney", entity_type="attorney", entity_id=attorney_id)
    return {"status": "unsuspended"}
