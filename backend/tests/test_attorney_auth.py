"""Sprint A — Attorney Portal auth tests.

Integration tests against a live backend. Requires:
  - REACT_APP_BACKEND_URL pointing to the server under test
  - MONGO_URL + DB_NAME reachable from the test runner (for setup/teardown)

Run with: pytest backend/tests/test_attorney_auth.py -v
"""
import os
import uuid
import secrets
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API_URL = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_PREFIX = "TEST_ATTY_"


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture
def clean_invitation(db):
    created_codes = []
    created_emails = []

    def _make(email=None, expires_in_days=30, used=False, first_name="Test", last_name="User"):
        email = email or f"{TEST_PREFIX}{uuid.uuid4().hex[:6]}@example.com"
        code = secrets.token_urlsafe(12)
        now = datetime.now(timezone.utc)
        exp = now + timedelta(days=expires_in_days)
        db.attorney_invitations.insert_one({
            "id": secrets.token_urlsafe(8),
            "code": code,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "created_by": "pytest@archer.legal",
            "used": used,
            "used_at": now.isoformat() if used else None,
            "attorney_id": None,
            "expires_at": exp.isoformat(),
            "created_at": now.isoformat(),
        })
        created_codes.append(code)
        created_emails.append(email)
        return {"code": code, "email": email, "first_name": first_name, "last_name": last_name}

    yield _make

    if created_codes:
        db.attorney_invitations.delete_many({"code": {"$in": created_codes}})
    if created_emails:
        attorneys = list(db.attorneys.find({"email": {"$in": created_emails}}, {"id": 1}))
        ids = [a["id"] for a in attorneys]
        db.attorneys.delete_many({"email": {"$in": created_emails}})
        if ids:
            db.attorney_sessions.delete_many({"attorney_id": {"$in": ids}})


VALID_JOIN_PAYLOAD = {
    "password": "strongpass123",
    "bar_association": "ohgb_be",
    "bar_number": "A4-99999",
    "year_admitted": 2018,
    "jurisdiction": "BE",
    "specialties": ["logement", "travail"],
    "bio": "Pytest attorney.",
}


# =====================================================================
# Signup flow
# =====================================================================

def test_signup_with_valid_invitation(clean_invitation, db):
    inv = clean_invitation()
    payload = {"invitation_code": inv["code"], **VALID_JOIN_PAYLOAD}
    r = requests.post(f"{API_URL}/attorneys/join", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["success"] is True
    assert "attorney_id" in body

    # DB state checks
    atty = db.attorneys.find_one({"email": inv["email"]})
    assert atty is not None
    assert atty["status"] == "pending"
    assert atty["verified_at"] is None

    refreshed = db.attorney_invitations.find_one({"code": inv["code"]})
    assert refreshed["used"] is True
    assert refreshed["attorney_id"] == atty["id"]


def test_signup_with_expired_invitation(clean_invitation):
    inv = clean_invitation(expires_in_days=-1)
    payload = {"invitation_code": inv["code"], **VALID_JOIN_PAYLOAD}
    r = requests.post(f"{API_URL}/attorneys/join", json=payload)
    assert r.status_code == 410


def test_signup_with_used_invitation(clean_invitation):
    inv = clean_invitation(used=True)
    payload = {"invitation_code": inv["code"], **VALID_JOIN_PAYLOAD}
    r = requests.post(f"{API_URL}/attorneys/join", json=payload)
    assert r.status_code == 410


def test_signup_with_unknown_invitation_code():
    payload = {"invitation_code": "this-code-does-not-exist-xyz", **VALID_JOIN_PAYLOAD}
    r = requests.post(f"{API_URL}/attorneys/join", json=payload)
    assert r.status_code == 404


# =====================================================================
# Login
# =====================================================================

def _create_active_attorney(db, clean_invitation, password="strongpass123"):
    inv = clean_invitation()
    requests.post(f"{API_URL}/attorneys/join", json={
        "invitation_code": inv["code"],
        **{**VALID_JOIN_PAYLOAD, "password": password},
    }).raise_for_status()
    db.attorneys.update_one(
        {"email": inv["email"]},
        {"$set": {"status": "active", "verified_at": datetime.now(timezone.utc).isoformat()}},
    )
    return inv["email"]


def test_login_rejects_pending_status(clean_invitation):
    inv = clean_invitation()
    requests.post(f"{API_URL}/attorneys/join", json={"invitation_code": inv["code"], **VALID_JOIN_PAYLOAD}).raise_for_status()
    r = requests.post(f"{API_URL}/attorneys/login", json={"email": inv["email"], "password": VALID_JOIN_PAYLOAD["password"]})
    assert r.status_code == 403


def test_login_success_when_active(clean_invitation, db):
    email = _create_active_attorney(db, clean_invitation)
    r = requests.post(f"{API_URL}/attorneys/login", json={"email": email, "password": "strongpass123"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["attorney"]["email"] == email
    set_cookie = r.headers.get("set-cookie", "")
    assert "attorney_session" in set_cookie.lower() or "attorney_session" in r.cookies


def test_login_wrong_password(clean_invitation, db):
    email = _create_active_attorney(db, clean_invitation)
    r = requests.post(f"{API_URL}/attorneys/login", json={"email": email, "password": "wrongpass"})
    assert r.status_code == 401


# =====================================================================
# Magic link
# =====================================================================

def test_magic_link_generation_and_consumption(clean_invitation, db):
    email = _create_active_attorney(db, clean_invitation)
    r = requests.post(f"{API_URL}/attorneys/login/magic-link", json={"email": email})
    assert r.status_code == 200

    atty = db.attorneys.find_one({"email": email})
    sess = db.attorney_sessions.find_one({"attorney_id": atty["id"], "type": "magic_link", "used": False})
    assert sess is not None
    token = sess["token"]

    r2 = requests.get(f"{API_URL}/attorneys/login/verify-magic/{token}")
    assert r2.status_code == 200

    # Second use must fail
    r3 = requests.get(f"{API_URL}/attorneys/login/verify-magic/{token}")
    assert r3.status_code == 410


def test_magic_link_expiration(clean_invitation, db):
    email = _create_active_attorney(db, clean_invitation)
    requests.post(f"{API_URL}/attorneys/login/magic-link", json={"email": email})
    atty = db.attorneys.find_one({"email": email})
    past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    db.attorney_sessions.update_many(
        {"attorney_id": atty["id"], "type": "magic_link"},
        {"$set": {"expires_at": past}},
    )
    sess = db.attorney_sessions.find_one({"attorney_id": atty["id"], "type": "magic_link"})
    r = requests.get(f"{API_URL}/attorneys/login/verify-magic/{sess['token']}")
    assert r.status_code == 410


# =====================================================================
# attorney_required middleware
# =====================================================================

def test_attorney_required_with_valid_session(clean_invitation, db):
    email = _create_active_attorney(db, clean_invitation)
    s = requests.Session()
    s.post(f"{API_URL}/attorneys/login", json={"email": email, "password": "strongpass123"}).raise_for_status()
    r = s.get(f"{API_URL}/attorneys/me")
    assert r.status_code == 200
    assert r.json()["email"] == email


def test_attorney_required_without_session():
    r = requests.get(f"{API_URL}/attorneys/me")
    assert r.status_code == 401


def test_attorney_required_with_expired_session(clean_invitation, db):
    email = _create_active_attorney(db, clean_invitation)
    s = requests.Session()
    s.post(f"{API_URL}/attorneys/login", json={"email": email, "password": "strongpass123"}).raise_for_status()
    atty = db.attorneys.find_one({"email": email})
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    db.attorney_sessions.update_many(
        {"attorney_id": atty["id"], "type": "session"},
        {"$set": {"expires_at": past}},
    )
    r = s.get(f"{API_URL}/attorneys/me")
    assert r.status_code == 401
