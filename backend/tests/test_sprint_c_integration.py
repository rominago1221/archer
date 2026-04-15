"""Sprint C — Integration tests for the full matching flow.

Requires:
  - live backend at REACT_APP_BACKEND_URL
  - MONGO_URL reachable from the runner
  - REQUIRE_STRIPE_ONBOARDING=false (default)
  - SCHEDULER_ENABLED=false (so the test has full control over timing)
"""
import os
import sys
import uuid
import asyncio
import secrets
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("REQUIRE_STRIPE_ONBOARDING", "false")

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PREFIX = "TEST_INTEG_"


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def factory(db):
    created = {"u": [], "c": [], "a": [], "ass": [], "sess": []}
    import bcrypt

    def _client(email=None, password="pass12345"):
        uid = f"{PREFIX}u_{uuid.uuid4().hex[:8]}"
        email = email or f"{uid}@ex.test"
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        now = datetime.now(timezone.utc).isoformat()
        db.users.insert_one({
            "user_id": uid, "email": email, "name": "Sophie Lacroix",
            "password_hash": pw_hash, "auth_provider": "email",
            "phone": "+32 478 12 34 56",
            "country": "BE", "jurisdiction": "BE", "region": "Bruxelles",
            "state_of_residence": "Anderlecht", "language": "fr",
            "account_type": "client", "plan": "free", "created_at": now,
        })
        created["u"].append(uid)
        return {"user_id": uid, "email": email, "password": password}

    def _client_session(client):
        """Log the client in via the existing email auth endpoint."""
        r = requests.post(f"{API}/auth/login",
                          json={"email": client["email"], "password": client["password"]})
        r.raise_for_status()
        body = r.json()
        return body["session_token"]

    def _attorney(**overrides):
        aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": aid, "email": f"{aid}@ex.test",
            "first_name": "Marc", "last_name": "Delcourt",
            "status": "active", "available_for_cases": True,
            "stripe_onboarding_completed": False,
            "jurisdiction": "BE", "specialties": ["logement"],
            "rating_avg": 4.5, "active_cases_count": 0,
            "avg_response_seconds": 600,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **overrides,
        }
        db.attorneys.insert_one(doc)
        created["a"].append(aid)
        return doc

    def _attorney_session(attorney_id):
        token = secrets.token_urlsafe(32)
        db.attorney_sessions.insert_one({
            "attorney_id": attorney_id, "token": token, "type": "session",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created["sess"].append(token)
        return token

    def _case(user_id, case_type="eviction"):
        cid = f"{PREFIX}c_{uuid.uuid4().hex[:8]}"
        db.cases.insert_one({
            "case_id": cid, "user_id": user_id,
            "title": "Eviction notice", "type": case_type,
            "status": "active", "country": "BE", "language": "fr",
            "ai_summary": "Tenant received eviction notice with insufficient notice period.",
            "ai_findings": [
                {"text": "Notice period violation", "impact_description": "30 days",
                 "legal_ref": "BE Housing art. 3", "impact": "high"},
            ],
            "strategy": {"title": "Procedural nullity", "description": "Cite art. 3",
                         "score": 96},
            "success_probability": {"overall": 94},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created["c"].append(cid)
        return cid

    yield type("F", (), {
        "client": staticmethod(_client),
        "client_session": staticmethod(_client_session),
        "attorney": staticmethod(_attorney),
        "attorney_session": staticmethod(_attorney_session),
        "case": staticmethod(_case),
    })

    db.users.delete_many({"user_id": {"$in": created["u"]}})
    db.attorneys.delete_many({"id": {"$in": created["a"]}})
    db.cases.delete_many({"case_id": {"$in": created["c"]}})
    db.case_assignments.delete_many({"case_id": {"$in": created["c"]}})
    db.attorney_matching_log.delete_many({"case_id": {"$in": created["c"]}})
    db.attorney_sessions.delete_many({"token": {"$in": created["sess"]}})
    db.user_sessions.delete_many({"user_id": {"$in": created["u"]}})


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# Tests
# =========================================================================

def test_client_request_triggers_auto_assignment(factory, db):
    """POST /cases/:id/request-attorney-letter → assign happens, case becomes 'assigned'."""
    client = factory.client()
    token = factory.client_session(client)
    attorney = factory.attorney()
    case_id = factory.case(client["user_id"])

    r = requests.post(
        f"{API}/cases/{case_id}/request-attorney-letter",
        headers=_auth(token),
        json={"service_type": "attorney_letter"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["attorney_status"] == "assigned"
    assert body["assignment_id"]

    ass = db.case_assignments.find_one({"id": body["assignment_id"]})
    assert ass["attorney_id"] == attorney["id"]
    assert ass["status"] == "pending"

    case_doc = db.cases.find_one({"case_id": case_id})
    assert case_doc["attorney_status"] == "assigned"

    # Attorney's active_cases_count incremented
    atty_updated = db.attorneys.find_one({"id": attorney["id"]})
    assert atty_updated["active_cases_count"] == 1


def test_client_request_no_match_reports_unmatched(factory, db):
    client = factory.client()
    token = factory.client_session(client)
    factory.attorney(jurisdiction="US")  # wrong jurisdiction
    case_id = factory.case(client["user_id"])

    r = requests.post(
        f"{API}/cases/{case_id}/request-attorney-letter",
        headers=_auth(token),
        json={"service_type": "attorney_letter"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["attorney_status"] == "unassigned_no_match"
    assert body["assignment_id"] is None

    case_doc = db.cases.find_one({"case_id": case_id})
    assert case_doc["attorney_status"] == "unassigned_no_match"

    log = db.attorney_matching_log.find_one({"case_id": case_id, "action": "no_match"})
    assert log is not None


def test_client_request_cross_user_is_forbidden(factory, db):
    client_a = factory.client()
    client_b = factory.client()
    token_b = factory.client_session(client_b)
    factory.attorney()
    case_id_a = factory.case(client_a["user_id"])

    r = requests.post(
        f"{API}/cases/{case_id_a}/request-attorney-letter",
        headers=_auth(token_b),
        json={"service_type": "attorney_letter"},
    )
    assert r.status_code == 403


def test_client_request_idempotent_when_already_assigned(factory, db):
    client = factory.client()
    token = factory.client_session(client)
    factory.attorney()
    case_id = factory.case(client["user_id"])

    r1 = requests.post(
        f"{API}/cases/{case_id}/request-attorney-letter",
        headers=_auth(token), json={"service_type": "attorney_letter"},
    )
    assert r1.status_code == 201
    assignment_id = r1.json()["assignment_id"]

    r2 = requests.post(
        f"{API}/cases/{case_id}/request-attorney-letter",
        headers=_auth(token), json={"service_type": "attorney_letter"},
    )
    assert r2.status_code == 201
    body2 = r2.json()
    assert body2.get("already_assigned") is True
    assert body2["assignment_id"] == assignment_id


def test_attorney_accept_updates_response_time_metric(factory, db):
    client = factory.client()
    factory.client_session(client)
    attorney = factory.attorney(avg_response_seconds=1200)
    atty_token = factory.attorney_session(attorney["id"])
    case_id = factory.case(client["user_id"])

    # Assign via client endpoint
    client_token = factory.client_session(client)
    r = requests.post(
        f"{API}/cases/{case_id}/request-attorney-letter",
        headers=_auth(client_token), json={"service_type": "attorney_letter"},
    )
    assignment_id = r.json()["assignment_id"]

    # Accept
    r = requests.post(
        f"{API}/attorneys/cases/{assignment_id}/accept",
        headers=_auth(atty_token),
    )
    assert r.status_code == 200

    # Attorney's avg_response_seconds should have been updated (EMA)
    atty_updated = db.attorneys.find_one({"id": attorney["id"]})
    assert atty_updated["avg_response_seconds"] is not None
    assert atty_updated["avg_response_seconds"] != 1200  # changed from initial


def test_attorney_decline_triggers_reassignment_to_next_candidate(factory, db):
    client = factory.client()
    a1 = factory.attorney()
    a2 = factory.attorney()  # fallback
    client_token = factory.client_session(client)
    case_id = factory.case(client["user_id"])

    # Initial assignment — goes to whichever scores highest (random tiebreak)
    r = requests.post(
        f"{API}/cases/{case_id}/request-attorney-letter",
        headers=_auth(client_token), json={"service_type": "attorney_letter"},
    )
    assignment_id = r.json()["assignment_id"]
    first_ass = db.case_assignments.find_one({"id": assignment_id})
    first_attorney_id = first_ass["attorney_id"]

    # The assigned attorney declines
    atty_token = factory.attorney_session(first_attorney_id)
    r = requests.post(
        f"{API}/attorneys/cases/{assignment_id}/decline",
        headers=_auth(atty_token),
        json={"reason": "overloaded", "notes": "too busy"},
    )
    assert r.status_code == 200

    # Wait briefly for the async reassignment task
    import time
    deadline = time.time() + 5
    new_ass = None
    while time.time() < deadline:
        new_ass = db.case_assignments.find_one({
            "case_id": case_id, "status": "pending",
        })
        if new_ass:
            break
        time.sleep(0.2)
    assert new_ass is not None, "reassignment did not occur within 5s"
    expected_next = a2["id"] if first_attorney_id == a1["id"] else a1["id"]
    assert new_ass["attorney_id"] == expected_next


def test_admin_dashboard_returns_stats(factory, db):
    """Admin dashboard endpoint returns structured data."""
    # Use the existing admin user seeded at startup (test@archer.legal)
    # This test requires that account to exist — if not, skip.
    admin_email = "test@archer.legal"
    r = requests.post(f"{API}/auth/login",
                      json={"email": admin_email, "password": "ArcherPro2026!"})
    if r.status_code != 200:
        pytest.skip("admin seeded user not available")
    admin_token = r.json()["session_token"]

    # Generate some activity
    client = factory.client()
    factory.attorney()
    factory.client_session(client)
    case_id = factory.case(client["user_id"])
    client_token = factory.client_session(client)
    requests.post(
        f"{API}/cases/{case_id}/request-attorney-letter",
        headers=_auth(client_token), json={"service_type": "attorney_letter"},
    )

    r = requests.get(f"{API}/admin/matching/dashboard", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert "today" in body
    assert "attorneys" in body
    assert "unmatched_cases" in body
    assert "recent_events" in body
    assert body["today"]["cases_assigned"] >= 1


def test_admin_logs_endpoint_returns_attempts(factory, db):
    admin_email = "test@archer.legal"
    r = requests.post(f"{API}/auth/login",
                      json={"email": admin_email, "password": "ArcherPro2026!"})
    if r.status_code != 200:
        pytest.skip("admin seeded user not available")
    admin_token = r.json()["session_token"]

    client = factory.client()
    factory.attorney()
    client_token = factory.client_session(client)
    case_id = factory.case(client["user_id"])
    requests.post(
        f"{API}/cases/{case_id}/request-attorney-letter",
        headers=_auth(client_token), json={"service_type": "attorney_letter"},
    )

    r = requests.get(f"{API}/admin/matching/logs/{case_id}", headers=_auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["case_id"] == case_id
    assert len(body["attempts"]) >= 1
    assert body["attempts"][0]["result"] in ("auto_matched", "no_match")
