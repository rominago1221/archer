"""Sprint E — Live Counsel endpoints (attorney + client sides).

All under /api — split between /api/attorneys/live-counsel/* (attorney portal)
and /api/cases/:id/live-counsel/* (client side).
"""
from __future__ import annotations
import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal

import stripe

from db import db
from auth import get_current_user
from models import User
from utils.attorney_auth import attorney_required
from services.daily_co import create_meeting_token, create_room
from services.attorney_matching import has_available_attorney_for

logger = logging.getLogger(__name__)
router = APIRouter()
attorney_router = APIRouter(prefix="/attorneys/live-counsel")

stripe.api_key = os.environ.get("STRIPE_API_KEY")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _parse(ts):
    if not ts:
        return None
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _app_url() -> str:
    return os.environ.get("APP_URL", "https://archer.legal").rstrip("/")


# =========================================================================
# Client: POST /cases/:id/checkout/live-counsel
# =========================================================================

class LiveCounselCheckoutRequest(BaseModel):
    service_type: Literal["live_counsel"] = "live_counsel"


@router.post("/cases/{case_id}/checkout/live-counsel")
async def checkout_live_counsel(
    case_id: str,
    body: LiveCounselCheckoutRequest,
    current_user: User = Depends(get_current_user),
):
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.get("user_id") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your case")
    if case.get("payment_status") == "paid":
        raise HTTPException(status_code=409, detail="Already paid")

    # Pre-flight: refuse if no Calendly-ready attorney matches this case's specialty.
    if not await has_available_attorney_for(case, requires_calendly=True):
        raise HTTPException(
            status_code=409,
            detail="NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL",
        )

    country = (current_user.country or "BE").upper()
    currency = "eur" if country == "BE" else "usd"
    amount_cents = 14900  # €149 / $149 unified

    def _create_session():
        return stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": currency,
                    "product_data": {
                        "name": "Live Counsel — 30-min video consultation",
                        "description": f"Case #{case_id[-4:]}",
                    },
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{_app_url()}/cases/{case_id}?live_counsel=success",
            cancel_url=f"{_app_url()}/cases/{case_id}?live_counsel=cancelled",
            metadata={
                "case_id": case_id,
                "service_type": "live_counsel",
                "user_id": current_user.user_id,
            },
            payment_intent_data={
                "metadata": {
                    "case_id": case_id,
                    "service_type": "live_counsel",
                    "user_id": current_user.user_id,
                },
            },
        )

    try:
        session = await asyncio.to_thread(_create_session)
    except Exception as e:
        logger.exception("stripe live_counsel checkout failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "amount_cents": amount_cents,
        "currency": currency,
    }


# =========================================================================
# Client: POST /cases/:id/live-counsel/join  (client joins Daily.co room)
# =========================================================================

@router.get("/cases/{case_id}/live-counsel/booking-info")
async def booking_info(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    """Post-payment client info: returns the Calendly URL with utm_content=
    assignment_id so the webhook can bind the booking back.
    Client may need to poll this a few seconds while the Stripe webhook
    creates the assignment.
    """
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.get("user_id") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your case")

    assignment = await db.case_assignments.find_one(
        {"case_id": case_id, "service_type": "live_counsel",
         "status": {"$in": ["awaiting_calendly_booking", "accepted"]}},
        {"_id": 0},
    )
    if not assignment:
        # Payment webhook may not have fired yet — caller should retry
        return {"ready": False}

    attorney = await db.attorneys.find_one(
        {"id": assignment["attorney_id"]},
        {"_id": 0, "password_hash": 0},
    )
    if not attorney or not attorney.get("calendly_url"):
        return {"ready": False, "error": "attorney_calendly_missing"}

    # Build the Calendly link with assignment_id in utm_content.
    base = attorney["calendly_url"].rstrip("/")
    name = (current_user.name or "").strip()
    email = current_user.email or ""
    from urllib.parse import urlencode
    params = urlencode({
        "email": email,
        "name": name,
        "utm_content": assignment["id"],
        "utm_source": "archer",
    })
    booking_url = f"{base}?{params}"

    return {
        "ready": True,
        "assignment_id": assignment["id"],
        "assignment_status": assignment["status"],
        "attorney": {
            "first_name": attorney.get("first_name"),
            "last_name": attorney.get("last_name"),
            "photo_url": attorney.get("photo_url"),
        },
        "calendly_booking_url": booking_url,
        "scheduled_at": assignment.get("scheduled_at"),
    }


@router.post("/cases/{case_id}/live-counsel/join")
async def client_join(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.get("user_id") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your case")

    assignment = await db.case_assignments.find_one(
        {"case_id": case_id, "service_type": "live_counsel",
         "status": {"$in": ["accepted", "completed"]}},
        {"_id": 0},
    )
    if not assignment or not assignment.get("scheduled_at"):
        raise HTTPException(status_code=400, detail="No consultation scheduled yet")

    # Allow joining from 15 min before to 30 min after scheduled_at
    scheduled = _parse(assignment["scheduled_at"])
    now = _now()
    if now < scheduled - timedelta(minutes=15):
        raise HTTPException(status_code=400, detail="Too early, call starts later")
    if now > scheduled + timedelta(minutes=60):
        raise HTTPException(status_code=400, detail="Consultation window has passed")

    room_name = assignment.get("daily_co_room_name")
    room_url = assignment.get("daily_co_room_url")
    if not room_name or not room_url:
        # Lazy creation in case the Calendly webhook failed to create the room
        try:
            room = await asyncio.to_thread(create_room, case_id, scheduled)
            room_name = room["room_name"]
            room_url = room["room_url"]
            await db.case_assignments.update_one(
                {"id": assignment["id"]},
                {"$set": {"daily_co_room_name": room_name,
                          "daily_co_room_url": room_url,
                          "updated_at": _now_iso()}},
            )
        except Exception as e:
            logger.exception("daily_co lazy room creation failed")
            raise HTTPException(status_code=502, detail=f"Daily.co error: {e}")

    user_name = (current_user.name or "Client").strip() or "Client"
    try:
        token = await asyncio.to_thread(
            create_meeting_token, room_name, user_name,
            is_attorney=False,
        )
    except Exception as e:
        logger.exception("daily_co client token failed")
        raise HTTPException(status_code=502, detail=f"Daily.co error: {e}")

    return {"room_url": room_url, "meeting_token": token, "user_name": user_name}


# =========================================================================
# Attorney: POST /attorneys/cases/:assignment_id/live-counsel/join
# =========================================================================

@router.post("/attorneys/cases/{assignment_id}/live-counsel/join")
async def attorney_join(
    assignment_id: str,
    attorney: dict = Depends(attorney_required),
):
    a = await db.case_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if a.get("attorney_id") != attorney["id"]:
        raise HTTPException(status_code=403, detail="Not your assignment")
    if a.get("service_type") != "live_counsel":
        raise HTTPException(status_code=400, detail="Not a live counsel case")
    if not a.get("scheduled_at"):
        raise HTTPException(status_code=400, detail="Not yet scheduled")

    scheduled = _parse(a["scheduled_at"])
    now = _now()
    if now < scheduled - timedelta(minutes=15):
        raise HTTPException(status_code=400, detail="Too early")
    if now > scheduled + timedelta(minutes=60):
        raise HTTPException(status_code=400, detail="Window has passed")

    room_name = a.get("daily_co_room_name")
    room_url = a.get("daily_co_room_url")
    if not room_name or not room_url:
        try:
            room = await asyncio.to_thread(create_room, a["case_id"], scheduled)
            room_name = room["room_name"]
            room_url = room["room_url"]
            await db.case_assignments.update_one(
                {"id": a["id"]},
                {"$set": {"daily_co_room_name": room_name,
                          "daily_co_room_url": room_url,
                          "updated_at": _now_iso()}},
            )
        except Exception as e:
            logger.exception("daily_co lazy room creation failed")
            raise HTTPException(status_code=502, detail=f"Daily.co error: {e}")

    name = f"{attorney.get('first_name','')} {attorney.get('last_name','')}".strip() or attorney["email"]
    try:
        token = await asyncio.to_thread(
            create_meeting_token, room_name, name,
            is_attorney=True,
        )
    except Exception as e:
        logger.exception("daily_co attorney token failed")
        raise HTTPException(status_code=502, detail=f"Daily.co error: {e}")

    if not a.get("call_started_at"):
        await db.case_assignments.update_one(
            {"id": a["id"]},
            {"$set": {"call_started_at": _now_iso(), "updated_at": _now_iso()}},
        )

    return {"room_url": room_url, "meeting_token": token, "user_name": name}


# =========================================================================
# Attorney: GET /attorneys/live-counsel/upcoming
# =========================================================================

@attorney_router.get("/upcoming")
async def upcoming(attorney: dict = Depends(attorney_required)):
    now_iso = _now_iso()
    cursor = db.case_assignments.find(
        {"attorney_id": attorney["id"],
         "service_type": "live_counsel",
         "status": "accepted",
         "scheduled_at": {"$gte": now_iso}},
        {"_id": 0},
    ).sort("scheduled_at", 1)
    items = await cursor.to_list(200)
    rows = []
    now = _now()
    for a in items:
        snapshot = a.get("case_snapshot") or {}
        client_snap = a.get("client_snapshot") or {}
        first = client_snap.get("first_name") or ""
        last = client_snap.get("last_name") or ""
        scheduled = _parse(a["scheduled_at"])
        minutes_until = int((scheduled - now).total_seconds() / 60) if scheduled else None
        rows.append({
            "assignment_id": a["id"],
            "case_id": a["case_id"],
            "case_number": a.get("case_number"),
            "case_type": snapshot.get("type"),
            "client_first_name": first,
            "client_last_initial": f"{last[0]}." if last else "",
            "scheduled_at": a["scheduled_at"],
            "minutes_until": minutes_until,
            "daily_co_ready": bool(a.get("daily_co_room_url")),
            "earnings_cents": a.get("your_payout_cents"),
        })
    return {"calls": rows}


# =========================================================================
# Attorney: GET /attorneys/live-counsel/stats
# =========================================================================

@attorney_router.get("/stats")
async def stats(attorney: dict = Depends(attorney_required)):
    now = _now()
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = day_start - timedelta(days=now.weekday())

    today_count = await db.case_assignments.count_documents({
        "attorney_id": attorney["id"],
        "service_type": "live_counsel",
        "status": {"$in": ["accepted", "completed"]},
        "scheduled_at": {
            "$gte": day_start.isoformat(),
            "$lt": (day_start + timedelta(days=1)).isoformat(),
        },
    })
    this_week_count = await db.case_assignments.count_documents({
        "attorney_id": attorney["id"],
        "service_type": "live_counsel",
        "status": {"$in": ["accepted", "completed"]},
        "scheduled_at": {"$gte": week_start.isoformat()},
    })
    # Sum earnings for this-week completed calls
    pipeline = [
        {"$match": {
            "attorney_id": attorney["id"],
            "service_type": "live_counsel",
            "status": "completed",
            "completed_at": {"$gte": week_start.isoformat()},
        }},
        {"$group": {"_id": None, "total": {"$sum": "$your_payout_cents"}}},
    ]
    this_week_earnings = 0
    async for row in db.case_assignments.aggregate(pipeline):
        this_week_earnings = int(row.get("total") or 0)

    # Completion rate = completed / (accepted+completed+expired after accept)
    total_accepted = await db.case_assignments.count_documents({
        "attorney_id": attorney["id"], "service_type": "live_counsel",
        "status": {"$in": ["accepted", "completed"]},
    })
    completed = await db.case_assignments.count_documents({
        "attorney_id": attorney["id"], "service_type": "live_counsel",
        "status": "completed",
    })
    rate = round(completed / total_accepted * 100.0, 1) if total_accepted else 0.0

    return {
        "today_count": today_count,
        "this_week_count": this_week_count,
        "this_week_earnings_cents": this_week_earnings,
        "completion_rate_percent": rate,
        "avg_rating": attorney.get("rating_avg"),
    }
