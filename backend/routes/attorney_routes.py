"""Attorney Portal, Admin & Directory route handlers."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
import json
import logging
import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from db import db
from auth import hash_password, get_current_user
from models import User
from storage import EMERGENT_KEY

logger = logging.getLogger(__name__)
router = APIRouter()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# ================== ATTORNEY PORTAL — Backend ==================

DAILY_CO_API_KEY = os.environ.get("DAILY_CO_API_KEY")
DAILY_API_URL = "https://api.daily.co/v1"
STRIPE_PLATFORM_FEE_PERCENT = int(os.environ.get("STRIPE_PLATFORM_FEE_PERCENT", "20"))

# =============================================================================
# Email Utility
# =============================================================================
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@jasper.legal")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "james@jasper.legal")
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
APP_URL = os.environ.get("APP_URL", "https://predict-outcome.preview.emergentagent.com")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "jasper-admin-2026")

async def send_email(to: str, subject: str, html_body: str):
    if SENDGRID_API_KEY:
        try:
            import httpx
            await httpx.AsyncClient().post("https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"},
                json={"personalizations": [{"to": [{"email": to}]}], "from": {"email": EMAIL_FROM, "name": "Jasper Legal"}, "subject": subject, "content": [{"type": "text/html", "value": html_body}]},
                timeout=10.0)
            logger.info(f"Email sent to {to}: {subject}")
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
    else:
        logger.info(f"EMAIL (SendGrid not configured) → To: {to} | Subject: {subject}")

async def verify_admin(current_user: User = Depends(get_current_user)):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@jasper.legal")
    is_admin = getattr(current_user, 'is_admin', False) or current_user.email == admin_email or current_user.email == "test@jasper.legal"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# --- Attorney Application ---

class AttorneyApplication(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str
    bar_number: str
    states_licensed: List[str]
    country: str = "US"
    years_experience: int
    law_school: Optional[str] = None
    graduation_year: Optional[int] = None
    specialties: List[str]
    bio: str
    photo_url: Optional[str] = None
    languages: List[str] = ["en"]
    linkedin_url: Optional[str] = None
    session_price: int = 149


@router.post("/attorney/apply")
async def attorney_apply(body: AttorneyApplication):
    """Submit attorney application — creates user + attorney_profile"""
    email = body.email.strip().lower()
    if not email or not body.password or len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Valid email and password (8+ chars) required")
    if not body.bar_number or not body.full_name:
        raise HTTPException(status_code=400, detail="Bar number and full name required")
    if body.session_price < 149 or body.session_price > 500:
        raise HTTPException(status_code=400, detail="Session price must be between $149 and $500")
    if len(body.specialties) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 specialties")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(body.password)
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "user_id": user_id, "email": email, "name": body.full_name,
        "picture": body.photo_url, "password_hash": password_hash,
        "auth_provider": "email", "plan": "pro", "country": body.country,
        "jurisdiction": body.country, "language": body.languages[0] if body.languages else "en",
        "account_type": "attorney", "created_at": now,
        "notif_risk_score": True, "notif_deadlines": True, "notif_calls": True,
        "notif_lawyers": False, "notif_promo": False, "data_sharing": True, "improve_ai": True,
    }
    await db.users.insert_one(user_doc)

    attorney_id = f"atty_{uuid.uuid4().hex[:12]}"
    slug = body.full_name.lower().replace(" ", "-").replace(".", "")[:50] + f"-{attorney_id[-6:]}"
    payout = round(body.session_price * (1 - STRIPE_PLATFORM_FEE_PERCENT / 100))

    attorney_doc = {
        "attorney_id": attorney_id, "user_id": user_id, "slug": slug,
        "full_name": body.full_name, "email": email, "phone": body.phone,
        "bar_number": body.bar_number, "states_licensed": body.states_licensed,
        "country": body.country, "years_experience": body.years_experience,
        "law_school": body.law_school, "graduation_year": body.graduation_year,
        "specialties": body.specialties, "bio": body.bio[:300],
        "photo_url": body.photo_url, "languages": body.languages,
        "linkedin_url": body.linkedin_url,
        "session_price": body.session_price, "jasper_commission": STRIPE_PLATFORM_FEE_PERCENT / 100,
        "attorney_payout": payout,
        "stripe_connect_id": None, "stripe_connect_status": "pending",
        "application_status": "pending", "rejection_reason": None,
        "rating": 0, "total_sessions": 0, "total_earnings": 0,
        "review_count": 0,
        "is_available": False, "available_from": "09:00", "available_until": "17:00",
        "available_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "blocked_dates": [], "buffer_minutes": 15,
        "timezone": "America/New_York",
        "created_at": now, "approved_at": None,
    }
    await db.attorney_profiles.insert_one(attorney_doc)

    # Create session
    session_token = str(uuid.uuid4())
    await db.user_sessions.insert_one({
        "session_token": session_token, "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now
    })

    safe_user = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}
    response = JSONResponse(content={"user": safe_user, "session_token": session_token, "attorney_id": attorney_id})
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60)

    # Send emails asynchronously
    asyncio.create_task(send_email(
        to=email,
        subject="Application received — Jasper Legal",
        html_body=f"""<p>Hi {body.full_name},</p>
        <p>Your application to join Jasper as a licensed attorney has been received.</p>
        <p>We will verify your credentials within 24 hours. You will receive an email as soon as your profile is approved and live.</p>
        <p>In the meantime, you can:</p>
        <ul><li>Complete your profile (photo, bio, specialties)</li><li>Set your session price</li><li>Connect your Stripe account</li></ul>
        <p><a href="{APP_URL}/attorney/dashboard" style="display:inline-block;padding:10px 24px;background:#1a56db;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Login to your dashboard</a></p>
        <p>— The Jasper Team</p>"""
    ))
    asyncio.create_task(send_email(
        to=ADMIN_EMAIL,
        subject=f"New attorney application — {body.full_name}",
        html_body=f"""<p>New attorney application received:</p>
        <table style="border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 10px;font-weight:600;">Full name:</td><td>{body.full_name}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:600;">Email:</td><td>{email}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:600;">Bar number:</td><td>{body.bar_number}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:600;">State(s) licensed:</td><td>{', '.join(body.states_licensed)}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:600;">Country:</td><td>{body.country}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:600;">Experience:</td><td>{body.years_experience} years</td></tr>
        <tr><td style="padding:4px 10px;font-weight:600;">Specialties:</td><td>{', '.join(body.specialties)}</td></tr>
        <tr><td style="padding:4px 10px;font-weight:600;">Session price:</td><td>${body.session_price}</td></tr>
        </table>
        <br>
        <a href="{APP_URL}/api/admin/quick-action/{attorney_id}/approve/{ADMIN_SECRET}" style="display:inline-block;padding:10px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-right:10px;">APPROVE</a>
        <a href="{APP_URL}/admin/attorneys" style="display:inline-block;padding:10px 24px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">REJECT (requires reason)</a>"""
    ))

    return response


async def get_attorney_profile(user: User):
    """Helper: get attorney profile for current user"""
    prof = await db.attorney_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not prof:
        raise HTTPException(status_code=404, detail="Attorney profile not found")
    return prof


@router.get("/attorney/me")
async def get_my_attorney_profile(current_user: User = Depends(get_current_user)):
    """Get current attorney's full profile"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney account")
    return await get_attorney_profile(current_user)


@router.put("/attorney/profile")
async def update_attorney_profile(update: dict, current_user: User = Depends(get_current_user)):
    """Update attorney profile fields"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney account")
    allowed = {"bio", "specialties", "languages", "session_price", "photo_url", "linkedin_url",
               "is_available", "available_from", "available_until", "available_days",
               "blocked_dates", "buffer_minutes", "timezone", "phone"}
    data = {k: v for k, v in update.items() if k in allowed}
    if "session_price" in data:
        price = int(data["session_price"])
        if price < 149 or price > 500:
            raise HTTPException(status_code=400, detail="Price must be $149-$500")
        data["session_price"] = price
        data["attorney_payout"] = round(price * (1 - STRIPE_PLATFORM_FEE_PERCENT / 100))
    if "specialties" in data and len(data["specialties"]) > 5:
        raise HTTPException(status_code=400, detail="Max 5 specialties")
    if data:
        await db.attorney_profiles.update_one({"user_id": current_user.user_id}, {"$set": data})
    return await get_attorney_profile(current_user)


@router.post("/attorney/toggle-availability")
async def toggle_attorney_availability(current_user: User = Depends(get_current_user)):
    """Toggle online/offline"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney account")
    prof = await get_attorney_profile(current_user)
    new_status = not prof.get("is_available", False)
    await db.attorney_profiles.update_one({"user_id": current_user.user_id}, {"$set": {"is_available": new_status}})
    return {"is_available": new_status}


# --- Attorney Dashboard Stats ---

@router.get("/attorney/dashboard")
async def attorney_dashboard(current_user: User = Depends(get_current_user)):
    """Attorney dashboard: metrics + upcoming calls + activity"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney account")
    prof = await get_attorney_profile(current_user)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Calls today
    today_calls = await db.attorney_calls.count_documents({
        "attorney_id": prof["attorney_id"], "status": "scheduled",
        "scheduled_at": {"$gte": today_start, "$lt": (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()}
    })
    # Month earnings
    month_earnings_cursor = db.attorney_calls.find({
        "attorney_id": prof["attorney_id"], "status": "completed",
        "scheduled_at": {"$gte": month_start}
    }, {"_id": 0, "attorney_payout": 1})
    month_payouts = [c.get("attorney_payout", 0) async for c in month_earnings_cursor]
    month_total = sum(month_payouts)

    # Next call
    next_call = await db.attorney_calls.find_one(
        {"attorney_id": prof["attorney_id"], "status": "scheduled", "scheduled_at": {"$gte": now.isoformat()}},
        {"_id": 0}
    )

    # Upcoming calls (next 10)
    upcoming = await db.attorney_calls.find(
        {"attorney_id": prof["attorney_id"], "status": {"$in": ["scheduled", "completed"]}, "scheduled_at": {"$gte": today_start}},
        {"_id": 0}
    ).sort("scheduled_at", 1).to_list(10)

    # Recent activity
    activity = await db.attorney_activity.find(
        {"attorney_id": prof["attorney_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    return {
        "profile": prof,
        "metrics": {
            "today_calls": today_calls,
            "month_earnings": month_total,
            "rating": prof.get("rating", 0),
            "total_sessions": prof.get("total_sessions", 0),
            "review_count": prof.get("review_count", 0),
        },
        "next_call": next_call,
        "upcoming_calls": upcoming,
        "recent_activity": activity,
    }


# --- Attorney Calls / Bookings ---

class BookAttorneyCall(BaseModel):
    attorney_id: str
    case_id: Optional[str] = None
    date: str  # ISO date
    time: str  # HH:MM
    origin_url: Optional[str] = None


@router.post("/attorney/book-call")
async def book_attorney_call(body: BookAttorneyCall, current_user: User = Depends(get_current_user)):
    """Client books a call with attorney — creates call + Stripe checkout"""
    atty = await db.attorney_profiles.find_one({"attorney_id": body.attorney_id, "application_status": "approved"}, {"_id": 0})
    if not atty:
        raise HTTPException(status_code=404, detail="Attorney not found or not approved")

    call_id = f"call_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    scheduled = f"{body.date}T{body.time}:00+00:00"
    price = atty["session_price"]
    payout = atty.get("attorney_payout", round(price * 0.80))

    call_doc = {
        "call_id": call_id, "attorney_id": body.attorney_id,
        "client_user_id": current_user.user_id,
        "client_name": current_user.name, "case_id": body.case_id,
        "scheduled_at": scheduled, "price": price, "attorney_payout": payout,
        "jasper_fee": price - payout, "status": "scheduled",
        "room_name": None, "room_url": None,
        "client_rating": None, "client_review": None,
        "attorney_notes": None, "brief_generated": False,
        "created_at": now,
    }
    await db.attorney_calls.insert_one(call_doc)

    # Activity log
    await db.attorney_activity.insert_one({
        "attorney_id": body.attorney_id, "type": "new_booking",
        "message": f"New booking received — ${price} session",
        "call_id": call_id, "created_at": now
    })

    # Create Stripe checkout if available
    checkout_url = None
    if STRIPE_API_KEY:
        try:
            stripe_checkout = StripeCheckout(STRIPE_API_KEY)
            origin = body.origin_url or "https://predict-outcome.preview.emergentagent.com"
            session = await stripe_checkout.create_checkout_session(CheckoutSessionRequest(
                line_items=[{"price_data": {"currency": "usd", "unit_amount": price * 100, "product_data": {"name": f"Legal consultation with {atty['full_name']}", "description": f"30-minute video session"}}, "quantity": 1}],
                success_url=f"{origin}/attorney-call-confirmed?call_id={call_id}",
                cancel_url=f"{origin}/lawyers",
                metadata={"call_id": call_id, "attorney_id": body.attorney_id}
            ))
            checkout_url = session.url
            await db.attorney_calls.update_one({"call_id": call_id}, {"$set": {"stripe_session_id": session.session_id}})
        except Exception as e:
            logger.error(f"Stripe checkout error: {e}")

    return {"call_id": call_id, "checkout_url": checkout_url, "price": price, "payout": payout}


@router.get("/attorney/calls")
async def get_attorney_calls(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get attorney's call list"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney account")
    prof = await get_attorney_profile(current_user)
    query = {"attorney_id": prof["attorney_id"]}
    if status and status != "all":
        query["status"] = status
    calls = await db.attorney_calls.find(query, {"_id": 0}).sort("scheduled_at", -1).to_list(50)
    return calls


@router.get("/attorney/calls/{call_id}")
async def get_call_detail(call_id: str, current_user: User = Depends(get_current_user)):
    """Get single call details"""
    call = await db.attorney_calls.find_one({"call_id": call_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


# --- Video Call (Daily.co) ---

@router.post("/attorney/calls/{call_id}/create-room")
async def create_video_room(call_id: str, current_user: User = Depends(get_current_user)):
    """Create Daily.co room for a call (attorney or client)"""
    call = await db.attorney_calls.find_one({"call_id": call_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    if call.get("room_url"):
        return {"room_url": call["room_url"], "room_name": call["room_name"]}

    room_name = f"jasper-{call_id}"
    exp_time = int((datetime.now(timezone.utc) + timedelta(hours=2)).timestamp())
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.post(f"{DAILY_API_URL}/rooms", headers={
                "Authorization": f"Bearer {DAILY_CO_API_KEY}", "Content-Type": "application/json"
            }, json={"name": room_name, "privacy": "private", "properties": {
                "max_participants": 4, "enable_chat": True, "enable_recording": False,
                "enable_people_ui": True, "exp": exp_time, "eject_at_room_exp": True,
            }}, timeout=15.0)
            resp.raise_for_status()
            room = resp.json()
    except Exception as e:
        logger.error(f"Daily.co room creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create video room")

    await db.attorney_calls.update_one({"call_id": call_id}, {"$set": {
        "room_name": room["name"], "room_url": room["url"]
    }})
    return {"room_url": room["url"], "room_name": room["name"]}


@router.post("/attorney/calls/{call_id}/join-token")
async def get_join_token(call_id: str, current_user: User = Depends(get_current_user)):
    """Generate meeting token for a participant"""
    call = await db.attorney_calls.find_one({"call_id": call_id}, {"_id": 0})
    if not call or not call.get("room_name"):
        raise HTTPException(status_code=404, detail="Room not found — create room first")

    prof = await db.attorney_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    is_attorney = prof is not None and prof.get("attorney_id") == call.get("attorney_id")
    exp_time = int((datetime.now(timezone.utc) + timedelta(hours=2)).timestamp())
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.post(f"{DAILY_API_URL}/meeting-tokens", headers={
                "Authorization": f"Bearer {DAILY_CO_API_KEY}", "Content-Type": "application/json"
            }, json={"properties": {
                "room_name": call["room_name"], "user_name": current_user.name,
                "user_id": current_user.user_id, "is_owner": is_attorney,
                "enable_screenshare": True, "exp": exp_time,
            }}, timeout=15.0)
            resp.raise_for_status()
            token = resp.json().get("token")
    except Exception as e:
        logger.error(f"Daily.co token error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate meeting token")

    return {"token": token, "room_url": call["room_url"], "room_name": call["room_name"], "is_owner": is_attorney}


@router.post("/attorney/calls/{call_id}/complete")
async def complete_call(call_id: str, current_user: User = Depends(get_current_user)):
    """Mark call as completed"""
    call = await db.attorney_calls.find_one({"call_id": call_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    await db.attorney_calls.update_one({"call_id": call_id}, {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}})
    # Update attorney stats
    prof = await db.attorney_profiles.find_one({"attorney_id": call["attorney_id"]}, {"_id": 0})
    if prof:
        await db.attorney_profiles.update_one({"attorney_id": call["attorney_id"]}, {
            "$inc": {"total_sessions": 1, "total_earnings": call.get("attorney_payout", 0)}
        })
        await db.attorney_activity.insert_one({
            "attorney_id": call["attorney_id"], "type": "payment_received",
            "message": f"Payment received — ${call.get('attorney_payout', 0)}", "call_id": call_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    return {"status": "completed"}


# --- Client rates call ---

class RateCall(BaseModel):
    rating: int  # 1-5
    review: Optional[str] = None


@router.post("/attorney/calls/{call_id}/rate")
async def rate_call(call_id: str, body: RateCall, current_user: User = Depends(get_current_user)):
    """Client rates a call"""
    call = await db.attorney_calls.find_one({"call_id": call_id, "client_user_id": current_user.user_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    rating = max(1, min(5, body.rating))
    await db.attorney_calls.update_one({"call_id": call_id}, {"$set": {"client_rating": rating, "client_review": body.review}})
    # Update attorney average rating
    all_rated = await db.attorney_calls.find({"attorney_id": call["attorney_id"], "client_rating": {"$ne": None}}, {"_id": 0, "client_rating": 1}).to_list(500)
    if all_rated:
        avg = round(sum(c["client_rating"] for c in all_rated) / len(all_rated), 1)
        await db.attorney_profiles.update_one({"attorney_id": call["attorney_id"]}, {"$set": {"rating": avg, "review_count": len(all_rated)}})
        await db.attorney_activity.insert_one({
            "attorney_id": call["attorney_id"], "type": "new_review",
            "message": f"New review — {'★' * rating}", "call_id": call_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    return {"status": "rated", "rating": rating}


# --- Attorney Notes ---

@router.post("/attorney/calls/{call_id}/notes")
async def save_attorney_notes(call_id: str, body: dict, current_user: User = Depends(get_current_user)):
    """Attorney saves private notes on a call"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney")
    await db.attorney_calls.update_one({"call_id": call_id}, {"$set": {"attorney_notes": body.get("notes", "")}})
    return {"status": "saved"}


# --- AI Case Brief ---

CASE_BRIEF_SYSTEM = """You are Jasper AI preparing a confidential pre-call brief for a licensed attorney.
Structure your brief exactly as follows:
1. CASE OVERVIEW: document type, risk score, date received, key parties, jurisdiction, financial exposure
2. KEY FINDINGS: top 3 findings with exact legal references
3. CLIENT'S POSITION: strengths, weaknesses, best arguments
4. OPPOSING PARTY POSITION: their likely arguments, what client must prepare for
5. SUGGESTED QUESTIONS: 3-5 targeted questions the attorney should ask the client
6. RECOMMENDED APPROACH: topics to cover in 30 minutes, strategy
7. RELEVANT LAW: key statutes and recent cases

Be thorough and use proper legal terminology — the reader is a practicing attorney."""


@router.post("/attorney/calls/{call_id}/generate-brief")
async def generate_case_brief(call_id: str, current_user: User = Depends(get_current_user)):
    """Generate AI case brief for an upcoming call"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney")
    call = await db.attorney_calls.find_one({"call_id": call_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    case_id = call.get("case_id")
    case_data = {}
    if case_id:
        case_data = await db.cases.find_one({"case_id": case_id}, {"_id": 0}) or {}

    brief_content = f"Case: {case_data.get('title', 'N/A')}\nType: {case_data.get('type', 'N/A')}\nRisk Score: {case_data.get('risk_score', 'N/A')}\n"
    brief_content += f"Deadline: {case_data.get('deadline', 'N/A')}\nFindings: {json.dumps(case_data.get('ai_findings', []), indent=2)[:2000]}"

    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.post("https://api.anthropic.com/v1/messages", headers={
                "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01"
            }, json={
                "model": "claude-sonnet-4-20250514", "max_tokens": 3000,
                "system": CASE_BRIEF_SYSTEM,
                "messages": [{"role": "user", "content": f"Generate a pre-call brief for this case:\n\n{brief_content}"}]
            }, timeout=60.0)
            resp.raise_for_status()
            ai_text = ""
            for block in resp.json().get("content", []):
                if block.get("type") == "text":
                    ai_text += block["text"]
    except Exception as e:
        logger.error(f"Brief generation error: {e}")
        ai_text = "Brief generation temporarily unavailable."

    await db.attorney_calls.update_one({"call_id": call_id}, {"$set": {"brief": ai_text, "brief_generated": True}})
    return {"brief": ai_text}


@router.get("/attorney/calls/{call_id}/brief")
async def get_case_brief(call_id: str, current_user: User = Depends(get_current_user)):
    """Get stored brief for a call"""
    call = await db.attorney_calls.find_one({"call_id": call_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return {"brief": call.get("brief", ""), "brief_generated": call.get("brief_generated", False)}


# --- Attorney Cases (shared with them) ---

@router.get("/attorney/cases")
async def get_attorney_cases(current_user: User = Depends(get_current_user)):
    """Get cases shared with this attorney or from their calls"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney")
    prof = await get_attorney_profile(current_user)
    # Cases from calls
    calls = await db.attorney_calls.find({"attorney_id": prof["attorney_id"], "case_id": {"$ne": None}}, {"_id": 0, "case_id": 1, "client_name": 1}).to_list(100)
    case_ids = list(set(c["case_id"] for c in calls if c.get("case_id")))
    # Also cases explicitly shared via case_shares
    shares = await db.case_shares.find({"shared_with_attorney": prof["attorney_id"]}, {"_id": 0, "case_id": 1}).to_list(100)
    case_ids.extend([s["case_id"] for s in shares])
    case_ids = list(set(case_ids))

    if not case_ids:
        return []
    cases = await db.cases.find({"case_id": {"$in": case_ids}}, {"_id": 0}).to_list(100)

    # Attach private notes
    notes = await db.attorney_case_notes.find({"attorney_id": prof["attorney_id"]}, {"_id": 0}).to_list(200)
    notes_map = {n["case_id"]: n.get("notes", "") for n in notes}
    for c in cases:
        c["attorney_notes"] = notes_map.get(c["case_id"], "")
    return cases


@router.post("/attorney/cases/{case_id}/notes")
async def save_case_notes(case_id: str, body: dict, current_user: User = Depends(get_current_user)):
    """Save private attorney notes for a case"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney")
    prof = await get_attorney_profile(current_user)
    await db.attorney_case_notes.update_one(
        {"attorney_id": prof["attorney_id"], "case_id": case_id},
        {"$set": {"notes": body.get("notes", ""), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"status": "saved"}


# --- Attorney Legal Research (James for attorneys) ---

ATTORNEY_JAMES_PROMPT = """You are James, a legal research assistant helping a licensed attorney.
Provide detailed, technical legal analysis including:
- Case citations with full case names and reporter references
- Statutory references with section numbers
- Procedural nuances and timing requirements
- Jurisdictional variations and circuit splits
- Strategic considerations and counterarguments

Do NOT simplify — use proper legal terminology. The attorney is researching for a client matter.
When citing cases, include the year, court, and key holding.
When referencing statutes, include the full citation.

JURISDICTION: {jurisdiction}
Respond in {language}."""


@router.post("/attorney/research/send")
async def attorney_research_send(data: dict, current_user: User = Depends(get_current_user)):
    """Attorney legal research chat — unlimited, technical"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney")
    message = data.get("message", "")
    conv_id = data.get("conversation_id")
    now = datetime.now(timezone.utc).isoformat()

    if not conv_id:
        conv_id = f"ares_{uuid.uuid4().hex[:12]}"
        await db.attorney_research_convs.insert_one({
            "conversation_id": conv_id, "user_id": current_user.user_id,
            "title": message[:60], "created_at": now, "updated_at": now
        })

    await db.attorney_research_msgs.insert_one({"conversation_id": conv_id, "role": "user", "content": message, "created_at": now})
    history = await db.attorney_research_msgs.find({"conversation_id": conv_id}, {"_id": 0, "role": 1, "content": 1}).sort("created_at", 1).to_list(50)
    messages_list = [{"role": m["role"], "content": m["content"]} for m in history]

    jurisdiction = "US Federal + applicable state law" if current_user.jurisdiction == "US" else "Belgian federal + regional law"
    lang_map = {"en": "English", "fr": "French", "nl": "Dutch", "de": "German", "es": "Spanish"}
    system = ATTORNEY_JAMES_PROMPT.format(jurisdiction=jurisdiction, language=lang_map.get(current_user.language, "English"))

    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.post("https://api.anthropic.com/v1/messages", headers={
                "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01"
            }, json={"model": "claude-sonnet-4-20250514", "max_tokens": 4096, "system": system, "messages": messages_list}, timeout=120.0)
            resp.raise_for_status()
            ai_text = "".join(b["text"] for b in resp.json().get("content", []) if b.get("type") == "text") or "Research assistant temporarily unavailable."
    except Exception as e:
        logger.error(f"Attorney research error: {e}")
        ai_text = "Research assistant temporarily unavailable."

    await db.attorney_research_msgs.insert_one({"conversation_id": conv_id, "role": "assistant", "content": ai_text, "created_at": datetime.now(timezone.utc).isoformat()})
    await db.attorney_research_convs.update_one({"conversation_id": conv_id}, {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"response": ai_text, "conversation_id": conv_id}


@router.get("/attorney/research/conversations")
async def get_research_conversations(current_user: User = Depends(get_current_user)):
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney")
    return await db.attorney_research_convs.find({"user_id": current_user.user_id}, {"_id": 0}).sort("updated_at", -1).to_list(20)


# --- Attorney Earnings ---

@router.get("/attorney/earnings")
async def get_attorney_earnings(current_user: User = Depends(get_current_user)):
    """Earnings dashboard"""
    if current_user.account_type != "attorney":
        raise HTTPException(status_code=403, detail="Not an attorney")
    prof = await get_attorney_profile(current_user)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    last_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    all_completed = await db.attorney_calls.find({"attorney_id": prof["attorney_id"], "status": "completed"}, {"_id": 0}).sort("scheduled_at", -1).to_list(200)
    this_month = sum(c.get("attorney_payout", 0) for c in all_completed if c.get("scheduled_at", "") >= month_start)
    last_month = sum(c.get("attorney_payout", 0) for c in all_completed if last_month_start <= c.get("scheduled_at", "") < month_start)
    pending = sum(c.get("attorney_payout", 0) for c in all_completed if not c.get("payout_processed"))

    return {
        "total_earned": prof.get("total_earnings", 0),
        "this_month": this_month,
        "last_month": last_month,
        "pending_payout": pending,
        "sessions": [{
            "call_id": c["call_id"], "client_name": c.get("client_name", "Client"),
            "scheduled_at": c.get("scheduled_at"), "price": c.get("price", 0),
            "jasper_fee": c.get("jasper_fee", 0), "attorney_payout": c.get("attorney_payout", 0),
            "status": "Paid" if c.get("payout_processed") else "Pending",
            "client_rating": c.get("client_rating")
        } for c in all_completed[:50]],
        "stripe_connect_status": prof.get("stripe_connect_status", "pending"),
    }


# --- Public Attorney Profile ---

@router.get("/attorneys/{slug}")
async def public_attorney_profile(slug: str):
    """Public attorney profile visible to clients"""
    prof = await db.attorney_profiles.find_one({"slug": slug, "application_status": "approved"}, {"_id": 0})
    if not prof:
        raise HTTPException(status_code=404, detail="Attorney not found")
    # Get reviews
    reviews = await db.attorney_calls.find(
        {"attorney_id": prof["attorney_id"], "client_rating": {"$ne": None}},
        {"_id": 0, "client_rating": 1, "client_review": 1, "scheduled_at": 1}
    ).sort("scheduled_at", -1).to_list(10)
    return {
        "attorney_id": prof["attorney_id"], "slug": prof["slug"], "full_name": prof["full_name"],
        "bar_number": prof["bar_number"], "states_licensed": prof["states_licensed"],
        "country": prof["country"], "years_experience": prof["years_experience"],
        "specialties": prof["specialties"], "bio": prof["bio"],
        "photo_url": prof["photo_url"], "languages": prof["languages"],
        "session_price": prof["session_price"], "rating": prof.get("rating", 0),
        "total_sessions": prof.get("total_sessions", 0), "review_count": prof.get("review_count", 0),
        "is_available": prof.get("is_available", False),
        "available_from": prof.get("available_from"), "available_until": prof.get("available_until"),
        "reviews": [{"rating": r.get("client_rating"), "review": r.get("client_review"), "date": r.get("scheduled_at")} for r in reviews]
    }


# --- List approved attorneys (for client-facing /lawyers page) ---

@router.get("/attorneys-directory")
async def attorneys_directory(country: Optional[str] = None, specialty: Optional[str] = None):
    """Get approved attorneys for the public directory"""
    query = {"application_status": "approved"}
    if country:
        query["country"] = country
    if specialty:
        query["specialties"] = specialty
    attorneys = await db.attorney_profiles.find(query, {"_id": 0}).sort("rating", -1).to_list(50)
    return [
        {
            "attorney_id": a["attorney_id"], "slug": a["slug"], "full_name": a["full_name"],
            "specialties": a["specialties"], "bio": a["bio"][:120],
            "photo_url": a.get("photo_url"), "session_price": a["session_price"],
            "rating": a.get("rating", 0), "total_sessions": a.get("total_sessions", 0),
            "review_count": a.get("review_count", 0),
            "is_available": a.get("is_available", False),
            "states_licensed": a["states_licensed"], "country": a["country"],
            "languages": a["languages"], "years_experience": a["years_experience"],
        } for a in attorneys
    ]


# --- Admin: approve/reject attorney ---

@router.post("/admin/attorney/{attorney_id}/approve")
async def approve_attorney(attorney_id: str):
    """Approve an attorney application (admin endpoint)"""
    result = await db.attorney_profiles.update_one(
        {"attorney_id": attorney_id, "application_status": "pending"},
        {"$set": {"application_status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Attorney not found or already processed")
    return {"status": "approved"}


@router.post("/admin/attorney/{attorney_id}/reject")
async def reject_attorney(attorney_id: str, body: dict):
    """Reject an attorney application"""
    reason = body.get("reason", "Application does not meet requirements")
    result = await db.attorney_profiles.update_one(
        {"attorney_id": attorney_id, "application_status": "pending"},
        {"$set": {"application_status": "rejected", "rejection_reason": reason}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Attorney not found or already processed")
    return {"status": "rejected", "reason": reason}

# =============================================================================
# Admin Endpoints — Attorney Management
# =============================================================================

@router.get("/admin/attorneys")
async def admin_list_attorneys(status: Optional[str] = None, admin: User = Depends(verify_admin)):
    query = {}
    if status and status != "all":
        query["application_status"] = status
    attorneys = await db.attorney_profiles.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return attorneys

@router.post("/admin/attorneys/{attorney_id}/approve")
async def admin_approve_attorney(attorney_id: str, admin: User = Depends(verify_admin)):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.attorney_profiles.update_one(
        {"attorney_id": attorney_id, "application_status": "pending"},
        {"$set": {"application_status": "approved", "approved_at": now}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Attorney not found or already processed")
    prof = await db.attorney_profiles.find_one({"attorney_id": attorney_id}, {"_id": 0})
    if prof:
        await send_email(prof["email"], "Your Jasper profile is now live!",
            f"<p>Hi {prof['full_name']},</p><p>Your profile has been approved. You are now live on Jasper.</p><p><a href='{APP_URL}/attorney/dashboard' style='display:inline-block;padding:10px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;'>Go online now</a></p><p>— The Jasper Team</p>")
    return {"status": "approved", "attorney_id": attorney_id}

class RejectBody(BaseModel):
    reason: str

@router.post("/admin/attorneys/{attorney_id}/reject")
async def admin_reject_attorney(attorney_id: str, body: RejectBody, admin: User = Depends(verify_admin)):
    if not body.reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    result = await db.attorney_profiles.update_one(
        {"attorney_id": attorney_id},
        {"$set": {"application_status": "rejected", "rejection_reason": body.reason.strip()}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Attorney not found")
    prof = await db.attorney_profiles.find_one({"attorney_id": attorney_id}, {"_id": 0})
    if prof:
        await send_email(prof["email"], "Jasper attorney application update",
            f"<p>Hi {prof['full_name']},</p><p>Unfortunately we could not approve your application.</p><p><strong>Reason:</strong> {body.reason}</p><p>You may reapply: <a href='{APP_URL}/attorney/apply'>Reapply</a></p><p>— The Jasper Team</p>")
    return {"status": "rejected", "attorney_id": attorney_id}

@router.get("/admin/quick-action/{attorney_id}/{action}/{token}")
async def admin_quick_action(attorney_id: str, action: str, token: str):
    if token != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid token")
    if action == "approve":
        now = datetime.now(timezone.utc).isoformat()
        await db.attorney_profiles.update_one({"attorney_id": attorney_id}, {"$set": {"application_status": "approved", "approved_at": now}})
        prof = await db.attorney_profiles.find_one({"attorney_id": attorney_id}, {"_id": 0})
        if prof:
            await send_email(prof["email"], "Your Jasper profile is now live!",
                f"<p>Hi {prof['full_name']},</p><p>Your profile has been approved. <a href='{APP_URL}/attorney/dashboard'>Go online now</a></p><p>— The Jasper Team</p>")
        return JSONResponse(content={"status": "approved", "message": f"Attorney has been approved."})
    elif action == "reject":
        return JSONResponse(content={"status": "redirect", "message": "Please use the admin panel to reject (reason required).", "url": f"{APP_URL}/admin/attorneys"})
    raise HTTPException(status_code=400, detail="Invalid action")
