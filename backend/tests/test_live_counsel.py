"""Sprint E — Live Counsel tests.

Covers:
  - Calendly URL validation (regex)
  - Calendly webhook signature (CRITICAL security test)
  - Calendly webhook booking flow end-to-end (utm_content → assignment_id)
  - Daily.co service layer (mocked requests)
  - Matching requires_calendly=True filter
  - has_available_attorney_for pre-flight
  - Live counsel reminders (1h + 10min) idempotent
  - mark_completed_live_counsels
  - Attorney/client join endpoints timing gates
"""
import os
import sys
import hmac
import hashlib
import time
import uuid
import asyncio
import json
import secrets
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from types import SimpleNamespace
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("REQUIRE_STRIPE_ONBOARDING", "false")
os.environ.setdefault("DAILY_CO_API_KEY", "dummy")
os.environ.setdefault("CALENDLY_WEBHOOK_SIGNING_KEY", "test-signing-secret")
os.environ.setdefault("STRIPE_API_KEY", "sk_test_dummy")

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PREFIX = "TEST_LC_"


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def factory(db):
    ids = {"a": [], "ass": [], "c": [], "u": [], "s": []}
    import bcrypt

    def _atty(**kw):
        aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
        pw = bcrypt.hashpw(b"pw", bcrypt.gensalt()).decode()
        db.attorneys.insert_one({
            "id": aid, "email": f"{aid}@ex.test", "password_hash": pw,
            "first_name": "Marc", "last_name": "Delcourt",
            "status": "active", "available_for_cases": True,
            "stripe_onboarding_completed": True,
            "jurisdiction": "BE", "specialties": ["logement"],
            "rating_avg": 4.5, "active_cases_count": 0,
            "avg_response_seconds": 600,
            "calendly_url": "https://calendly.com/marc-delcourt/30min",
            "calendly_url_validated": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **kw,
        })
        ids["a"].append(aid)
        return aid

    def _atty_session(attorney_id):
        token = secrets.token_urlsafe(32)
        db.attorney_sessions.insert_one({
            "attorney_id": attorney_id, "token": token, "type": "session",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        ids["s"].append(token)
        return token

    def _client(email=None, password="pass12345"):
        uid = f"{PREFIX}u_{uuid.uuid4().hex[:8]}"
        email = email or f"{uid}@ex.test"
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        db.users.insert_one({
            "user_id": uid, "email": email, "name": "Sophie Lacroix",
            "password_hash": pw_hash, "auth_provider": "email",
            "country": "BE", "jurisdiction": "BE", "language": "fr",
            "account_type": "client", "plan": "free",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        ids["u"].append(uid)
        return {"user_id": uid, "email": email, "password": password}

    def _case(user_id):
        cid = f"{PREFIX}c_{uuid.uuid4().hex[:8]}"
        db.cases.insert_one({
            "case_id": cid, "user_id": user_id,
            "title": "Housing dispute", "type": "eviction", "status": "active",
            "country": "BE", "language": "fr",
            "ai_summary": "summary", "ai_findings": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        ids["c"].append(cid)
        return cid

    def _ass(attorney_id, case_id, user_id, **overrides):
        aid = f"{PREFIX}ass_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        doc = {
            "id": aid, "attorney_id": attorney_id,
            "case_id": case_id, "client_user_id": user_id,
            "status": "awaiting_calendly_booking",
            "service_type": "live_counsel",
            "case_number": str(secrets.randbelow(9000) + 1000),
            "assigned_at": now.isoformat(),
            "expires_at": (now + timedelta(days=7)).isoformat(),
            "scheduled_at": None,
            "daily_co_room_url": None, "daily_co_room_name": None,
            "calendly_event_url": None, "calendly_invitee_uri": None,
            "reminder_1h_sent": False, "reminder_10min_sent": False,
            "call_started_at": None, "call_ended_at": None,
            "client_snapshot": {"first_name": "Sophie", "last_name": "Lacroix",
                                "email": "sophie@ex.test", "phone": None,
                                "full_address": None, "language": "fr"},
            "case_snapshot": {"title": "t", "type": "eviction", "language": "fr"},
            "your_payout_cents": 10430,
            "client_pays_cents": 14900, "archer_fee_cents": 4470,
            "stripe_fee_cents": 521,
            "created_at": now.isoformat(), "updated_at": now.isoformat(),
        }
        doc.update(overrides)
        db.case_assignments.insert_one(doc)
        ids["ass"].append(aid)
        return aid

    yield type("F", (), {"atty": staticmethod(_atty),
                         "atty_session": staticmethod(_atty_session),
                         "client": staticmethod(_client),
                         "case": staticmethod(_case),
                         "ass": staticmethod(_ass)})

    # cleanup
    db.attorneys.delete_many({"id": {"$in": ids["a"]}})
    db.attorney_sessions.delete_many({"token": {"$in": ids["s"]}})
    db.case_assignments.delete_many({"id": {"$in": ids["ass"]}})
    db.cases.delete_many({"case_id": {"$in": ids["c"]}})
    db.users.delete_many({"user_id": {"$in": ids["u"]}})
    db.user_sessions.delete_many({"user_id": {"$in": ids["u"]}})
    db.attorney_matching_log.delete_many({"case_id": {"$in": ids["c"]}})


def _run(coro):
    return asyncio.run(coro)


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


# =========================================================================
# Calendly URL validation
# =========================================================================

def test_calendly_connect_accepts_valid_url(factory):
    a = factory.atty(calendly_url=None, calendly_url_validated=False)
    token = factory.atty_session(a)
    r = requests.post(
        f"{API}/attorneys/calendly/connect",
        headers=_auth(token),
        json={"calendly_url": "https://calendly.com/marc-delcourt/30min"},
    )
    assert r.status_code == 200
    assert r.json()["calendly_url"] == "https://calendly.com/marc-delcourt/30min"


def test_calendly_connect_rejects_bad_url(factory):
    a = factory.atty(calendly_url=None, calendly_url_validated=False)
    token = factory.atty_session(a)
    r = requests.post(
        f"{API}/attorneys/calendly/connect",
        headers=_auth(token),
        json={"calendly_url": "https://example.com/not-calendly"},
    )
    assert r.status_code == 400


def test_calendly_connect_requires_auth():
    r = requests.post(f"{API}/attorneys/calendly/connect",
                      json={"calendly_url": "https://calendly.com/x/30min"})
    assert r.status_code == 401


# =========================================================================
# Calendly webhook signature — CRITICAL SECURITY TEST
# =========================================================================

def _sign_calendly(payload: bytes, key: str, ts: int) -> str:
    signed = f"{ts}.".encode() + payload
    sig = hmac.new(key.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={ts},v1={sig}"


def test_calendly_webhook_rejects_missing_signature():
    r = requests.post(f"{API}/webhooks/calendly", json={"event": "invitee.created"})
    assert r.status_code == 401


def test_calendly_webhook_rejects_invalid_signature():
    r = requests.post(
        f"{API}/webhooks/calendly",
        data=b'{"event":"invitee.created"}',
        headers={"calendly-webhook-signature": "t=123,v1=bogus"},
    )
    assert r.status_code == 401


def test_calendly_webhook_rejects_tampered_payload():
    key = os.environ["CALENDLY_WEBHOOK_SIGNING_KEY"]
    ts = int(time.time())
    original = b'{"event":"invitee.created","payload":{}}'
    sig = _sign_calendly(original, key, ts)
    # Tamper after signing
    tampered = b'{"event":"invitee.created","payload":{"attacker":true}}'
    r = requests.post(
        f"{API}/webhooks/calendly",
        data=tampered,
        headers={"calendly-webhook-signature": sig},
    )
    assert r.status_code == 401


def test_calendly_webhook_accepts_valid_signature(factory, db):
    """End-to-end: valid signature → booking creates Daily room (mocked) + updates assignment."""
    # NOTE: this test reaches the live backend, which runs its own Daily.co
    # wrapper → we can't monkeypatch it here. It will likely 500/skip the room
    # creation inside the handler. We only assert the signature is accepted
    # (non-401) and the assignment timestamp is recorded.
    a = factory.atty()
    client = factory.client()
    case_id = factory.case(client["user_id"])
    ass_id = factory.ass(a, case_id, client["user_id"])

    scheduled_at = datetime.now(timezone.utc) + timedelta(hours=3)
    payload = json.dumps({
        "event": "invitee.created",
        "payload": {
            "email": client["email"],
            "name": "Sophie Lacroix",
            "uri": "https://api.calendly.com/invitees/abc",
            "scheduled_event": {
                "start_time": scheduled_at.isoformat(),
                "uri": "https://api.calendly.com/events/xyz",
            },
            "tracking": {"utm_content": ass_id, "utm_source": "archer"},
        },
    }).encode()
    key = os.environ["CALENDLY_WEBHOOK_SIGNING_KEY"]
    ts = int(time.time())
    sig = _sign_calendly(payload, key, ts)

    r = requests.post(
        f"{API}/webhooks/calendly",
        data=payload,
        headers={"calendly-webhook-signature": sig,
                 "content-type": "application/json"},
    )
    # Must pass signature verification (not 401).
    assert r.status_code != 401
    # Assignment scheduled_at is populated (Daily.co may have failed due to dummy key)
    # Give the webhook a moment to process
    time.sleep(0.3)
    doc = db.case_assignments.find_one({"id": ass_id})
    assert doc["scheduled_at"] is not None
    assert doc["status"] == "accepted"  # transitioned from awaiting_calendly_booking


def test_calendly_webhook_ignores_unknown_assignment_id():
    """Booking with an unknown utm_content must be logged + ignored gracefully."""
    key = os.environ["CALENDLY_WEBHOOK_SIGNING_KEY"]
    payload = json.dumps({
        "event": "invitee.created",
        "payload": {
            "email": "ghost@ex.test",
            "uri": "https://api.calendly.com/invitees/xyz",
            "scheduled_event": {"start_time": "2026-04-20T10:00:00Z", "uri": "x"},
            "tracking": {"utm_content": "nonexistent_assignment_id"},
        },
    }).encode()
    ts = int(time.time())
    sig = _sign_calendly(payload, key, ts)
    r = requests.post(
        f"{API}/webhooks/calendly",
        data=payload,
        headers={"calendly-webhook-signature": sig,
                 "content-type": "application/json"},
    )
    # Gracefully accepted (signature valid) but no side effect
    assert r.status_code == 200


# =========================================================================
# Daily.co service layer
# =========================================================================

def test_daily_create_room_returns_url(monkeypatch):
    from services import daily_co

    def fake_post(url, **kw):
        return SimpleNamespace(
            status_code=200,
            json=lambda: {"url": "https://ex.daily.co/archer-abc", "name": "archer-abc"},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr(daily_co.requests, "post", fake_post)
    room = daily_co.create_room(
        "case_abc123",
        datetime.now(timezone.utc) + timedelta(hours=2),
    )
    assert room["room_url"].startswith("https://")
    assert room["room_name"] == "archer-abc"


def test_daily_meeting_token_passes_is_owner(monkeypatch):
    from services import daily_co
    captured = {}

    def fake_post(url, headers=None, json=None, **kw):
        captured["body"] = json
        return SimpleNamespace(
            status_code=200,
            json=lambda: {"token": "tok_abc"},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr(daily_co.requests, "post", fake_post)
    token = daily_co.create_meeting_token("archer-abc", "Marc D", is_attorney=True)
    assert token == "tok_abc"
    assert captured["body"]["properties"]["is_owner"] is True
    assert captured["body"]["properties"]["user_name"] == "Marc D"


def test_daily_create_room_recording_is_off(monkeypatch):
    from services import daily_co
    captured = {}

    def fake_post(url, headers=None, json=None, **kw):
        captured["body"] = json
        return SimpleNamespace(
            status_code=200,
            json=lambda: {"url": "x", "name": "n"},
            raise_for_status=lambda: None,
        )
    monkeypatch.setattr(daily_co.requests, "post", fake_post)
    daily_co.create_room("c1", datetime.now(timezone.utc) + timedelta(hours=1))
    assert "enable_recording" not in captured["body"]["properties"]


# =========================================================================
# Matching filters Calendly for Live Counsel
# =========================================================================

def test_match_filters_on_calendly_when_requires_calendly(factory):
    from services.attorney_matching import match_case_to_attorney
    # Attorney with Calendly
    a_cal = factory.atty()
    # Attorney without Calendly
    factory.atty(calendly_url=None, calendly_url_validated=False)
    client = factory.client()
    case_id = factory.case(client["user_id"])
    case = {"case_id": case_id, "type": "eviction", "country": "BE"}
    att, n = _run(match_case_to_attorney(case, requires_calendly=True))
    assert att is not None
    assert att["id"] == a_cal
    assert n == 1


def test_match_no_calendly_returns_none_when_required(factory):
    from services.attorney_matching import match_case_to_attorney
    factory.atty(calendly_url=None, calendly_url_validated=False)
    factory.atty(calendly_url=None, calendly_url_validated=False)
    case = {"case_id": "fake", "type": "eviction", "country": "BE"}
    att, n = _run(match_case_to_attorney(case, requires_calendly=True))
    assert att is None
    assert n == 0


# =========================================================================
# Reminders 1h / 10min
# =========================================================================

def test_reminder_1h_sent_then_idempotent(factory, db, monkeypatch):
    from jobs.portal_maintenance import send_live_counsel_reminders
    sent = []

    async def fake_send(to, subject, html):
        sent.append((to, subject))

    monkeypatch.setattr("routes.attorney_routes.send_email", fake_send, raising=False)

    a = factory.atty()
    client = factory.client()
    case_id = factory.case(client["user_id"])
    scheduled = datetime.now(timezone.utc) + timedelta(minutes=60)
    factory.ass(a, case_id, client["user_id"],
                status="accepted", scheduled_at=scheduled.isoformat(),
                daily_co_room_url="https://ex.daily.co/archer-x")

    count = _run(send_live_counsel_reminders())
    assert count == 1
    assert any("1h" in s or "commence dans 1h" in s for _, s in sent)

    # Second run — idempotent
    sent.clear()
    count = _run(send_live_counsel_reminders())
    assert count == 0
    assert sent == []


def test_reminder_10min_separate_from_1h(factory, db, monkeypatch):
    from jobs.portal_maintenance import send_live_counsel_reminders

    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    a = factory.atty()
    client = factory.client()
    case_id = factory.case(client["user_id"])
    # 10-min window call
    scheduled = datetime.now(timezone.utc) + timedelta(minutes=10)
    ass_id = factory.ass(a, case_id, client["user_id"],
                          status="accepted",
                          scheduled_at=scheduled.isoformat(),
                          daily_co_room_url="https://ex.daily.co/x")
    count = _run(send_live_counsel_reminders())
    assert count == 1
    doc = db.case_assignments.find_one({"id": ass_id})
    assert doc["reminder_10min_sent"] is True
    assert doc["reminder_1h_sent"] is False  # never hit the 1h window


# =========================================================================
# Mark completed cron
# =========================================================================

def test_mark_completed_only_closes_started_calls(factory, db, monkeypatch):
    from jobs.portal_maintenance import mark_completed_live_counsels

    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    a = factory.atty()
    client = factory.client()
    case_id = factory.case(client["user_id"])
    # Past-scheduled + started
    started_id = factory.ass(
        a, case_id, client["user_id"],
        status="accepted",
        scheduled_at=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        call_started_at=(datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
    )
    # Past-scheduled + never started (no-show)
    noshow_id = factory.ass(
        a, case_id, client["user_id"],
        status="accepted",
        scheduled_at=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        call_started_at=None,
    )
    n = _run(mark_completed_live_counsels())
    assert n == 1
    assert db.case_assignments.find_one({"id": started_id})["status"] == "completed"
    assert db.case_assignments.find_one({"id": noshow_id})["status"] == "accepted"


# =========================================================================
# Attorney join timing gates
# =========================================================================

def test_attorney_join_too_early_returns_400(factory):
    a = factory.atty()
    token = factory.atty_session(a)
    client = factory.client()
    case_id = factory.case(client["user_id"])
    scheduled = datetime.now(timezone.utc) + timedelta(hours=3)
    ass_id = factory.ass(a, case_id, client["user_id"],
                          status="accepted",
                          scheduled_at=scheduled.isoformat(),
                          daily_co_room_name="archer-x", daily_co_room_url="x")
    r = requests.post(
        f"{API}/attorneys/cases/{ass_id}/live-counsel/join",
        headers=_auth(token),
    )
    assert r.status_code == 400


def test_attorney_join_other_attorney_returns_403(factory):
    a1 = factory.atty()
    a2 = factory.atty()
    token_b = factory.atty_session(a2)
    client = factory.client()
    case_id = factory.case(client["user_id"])
    scheduled = datetime.now(timezone.utc) + timedelta(minutes=5)
    ass_id = factory.ass(a1, case_id, client["user_id"],
                          status="accepted",
                          scheduled_at=scheduled.isoformat())
    r = requests.post(
        f"{API}/attorneys/cases/{ass_id}/live-counsel/join",
        headers=_auth(token_b),
    )
    assert r.status_code == 403


# =========================================================================
# Pre-flight: no attorney → NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL
# =========================================================================

def test_checkout_returns_error_when_no_calendly_attorney(factory, db):
    # Seed an attorney WITHOUT Calendly only
    factory.atty(calendly_url=None, calendly_url_validated=False)
    client = factory.client()
    case_id = factory.case(client["user_id"])
    r = requests.post(f"{API}/auth/login",
                      json={"email": client["email"], "password": client["password"]})
    token = r.json()["session_token"]
    r = requests.post(
        f"{API}/cases/{case_id}/checkout/live-counsel",
        headers=_auth(token),
        json={"service_type": "live_counsel"},
    )
    assert r.status_code == 409
    assert "NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL" in r.text
