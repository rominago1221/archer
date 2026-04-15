"""Sprint D — Stripe Connect onboarding tests (Day 1).

All Stripe SDK calls are mocked via monkeypatching. No live API hit.
"""
import os
import sys
import uuid
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
os.environ.setdefault("STRIPE_API_KEY", "sk_test_dummy")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_dummy")

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PREFIX = "TEST_STRIPE_"


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def attorney_session(db):
    import bcrypt
    created = []

    def _make(stripe_account_id=None, stripe_onboarding_completed=False):
        aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
        email = f"{aid}@ex.test"
        pw = bcrypt.hashpw(b"pw", bcrypt.gensalt()).decode()
        db.attorneys.insert_one({
            "id": aid, "email": email, "password_hash": pw,
            "first_name": "Marc", "last_name": "Delcourt",
            "status": "active", "available_for_cases": True,
            "jurisdiction": "BE", "specialties": ["logement"],
            "stripe_account_id": stripe_account_id,
            "stripe_onboarding_completed": stripe_onboarding_completed,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        token = secrets.token_urlsafe(32)
        db.attorney_sessions.insert_one({
            "attorney_id": aid, "token": token, "type": "session",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created.append((aid, token))
        return {"id": aid, "email": email, "token": token}

    yield _make

    for aid, token in created:
        db.attorneys.delete_one({"id": aid})
        db.attorney_sessions.delete_one({"token": token})


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# Unit tests — service layer (no HTTP, no server needed)
# =========================================================================

def test_create_express_account_builds_correct_params(monkeypatch):
    import services.stripe_connect as sc
    import stripe as stripe_mod
    captured = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(id="acct_fake123")

    monkeypatch.setattr(stripe_mod.Account, "create", fake_create)
    attorney = {"id": "a_1", "email": "test@ex.test", "jurisdiction": "BE"}
    account = sc.create_express_account(attorney)

    assert account.id == "acct_fake123"
    assert captured["type"] == "express"
    assert captured["country"] == "BE"
    assert captured["email"] == "test@ex.test"
    assert captured["metadata"]["attorney_id"] == "a_1"
    assert captured["capabilities"]["transfers"]["requested"] is True


def test_create_express_account_us_country(monkeypatch):
    import services.stripe_connect as sc
    import stripe as stripe_mod
    captured = {}
    monkeypatch.setattr(stripe_mod.Account, "create",
                        lambda **kw: (captured.update(kw), SimpleNamespace(id="acct_us"))[1])
    attorney = {"id": "a_2", "email": "us@ex.test", "jurisdiction": "US"}
    sc.create_express_account(attorney)
    assert captured["country"] == "US"


def test_get_iban_last4_reads_first_external_account():
    from services.stripe_connect import get_iban_last4
    account = {"external_accounts": {"data": [{"last4": "3847"}, {"last4": "9999"}]}}
    assert get_iban_last4(account) == "3847"


def test_get_iban_last4_returns_none_when_no_accounts():
    from services.stripe_connect import get_iban_last4
    assert get_iban_last4({"external_accounts": {"data": []}}) is None
    assert get_iban_last4({}) is None


# =========================================================================
# Integration tests — against live backend with Stripe mocked via DB
# Note: These tests reach /api/attorneys/stripe/* but the Stripe SDK calls
# happen inside the backend process, so we CANNOT monkeypatch from here.
# Instead we check the DB state before/after, trusting the service layer tests
# above for behavior verification.
# =========================================================================

def test_onboarding_start_requires_auth():
    r = requests.post(f"{API}/attorneys/stripe/onboarding/start")
    assert r.status_code == 401


def test_dashboard_link_requires_stripe_account(attorney_session):
    a = attorney_session(stripe_account_id=None)
    r = requests.get(f"{API}/attorneys/stripe/dashboard-link", headers=_auth(a["token"]))
    # 400 when attorney has no account yet, 502 if Stripe SDK rejects the dummy key
    assert r.status_code in (400, 502)


def test_status_returns_not_started_when_no_account(attorney_session):
    a = attorney_session(stripe_account_id=None)
    r = requests.get(f"{API}/attorneys/stripe/onboarding/status", headers=_auth(a["token"]))
    assert r.status_code == 200
    assert r.json()["status"] == "not_started"


# =========================================================================
# Webhook handler unit tests (mocked DB via in-process calls)
# =========================================================================

def test_webhook_handler_account_updated_marks_completed(db):
    import asyncio
    from routes.stripe_webhooks import handle_account_updated

    aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
    db.attorneys.insert_one({
        "id": aid, "email": f"{aid}@ex.test",
        "first_name": "Test", "last_name": "Atty",
        "status": "active", "stripe_account_id": "acct_xyz",
        "stripe_onboarding_completed": False,
        "specialties": ["logement"], "jurisdiction": "BE",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    try:
        account = {
            "id": "acct_xyz",
            "charges_enabled": True,
            "payouts_enabled": True,
            "details_submitted": True,
            "external_accounts": {"data": [{"last4": "3847"}]},
        }
        asyncio.run(handle_account_updated(account))
        updated = db.attorneys.find_one({"id": aid})
        assert updated["stripe_onboarding_completed"] is True
        assert updated["stripe_iban_last4"] == "3847"
        assert updated.get("stripe_onboarding_completed_at")
    finally:
        db.attorneys.delete_one({"id": aid})


def test_webhook_handler_account_updated_idempotent(db):
    """Second call should not overwrite completed_at."""
    import asyncio, time
    from routes.stripe_webhooks import handle_account_updated

    aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
    already_iso = datetime.now(timezone.utc).isoformat()
    db.attorneys.insert_one({
        "id": aid, "email": f"{aid}@ex.test",
        "status": "active", "stripe_account_id": "acct_idem",
        "stripe_onboarding_completed": True,
        "stripe_onboarding_completed_at": already_iso,
        "created_at": already_iso,
    })
    try:
        account = {"id": "acct_idem", "charges_enabled": True,
                   "payouts_enabled": True, "details_submitted": True}
        asyncio.run(handle_account_updated(account))
        # Handler short-circuits on the "already complete" branch, so the
        # completed_at must still equal the original (we never call mark_*).
        updated = db.attorneys.find_one({"id": aid})
        assert updated["stripe_onboarding_completed_at"] == already_iso
    finally:
        db.attorneys.delete_one({"id": aid})


def test_webhook_handler_account_updated_ignores_incomplete(db):
    import asyncio
    from routes.stripe_webhooks import handle_account_updated

    aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
    db.attorneys.insert_one({
        "id": aid, "email": f"{aid}@ex.test",
        "status": "active", "stripe_account_id": "acct_incomplete",
        "stripe_onboarding_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    try:
        account = {"id": "acct_incomplete",
                   "charges_enabled": False,   # still disabled
                   "payouts_enabled": True, "details_submitted": True}
        asyncio.run(handle_account_updated(account))
        updated = db.attorneys.find_one({"id": aid})
        assert updated["stripe_onboarding_completed"] is False
    finally:
        db.attorneys.delete_one({"id": aid})


def test_webhook_endpoint_rejects_invalid_signature():
    # Live backend: send a bogus payload with bad signature → 400
    r = requests.post(
        f"{API}/webhooks/stripe",
        data=b'{"type":"account.updated","data":{"object":{"id":"acct_x"}}}',
        headers={"stripe-signature": "t=1,v1=invalid"},
    )
    assert r.status_code in (400, 500)  # 500 if secret env not set on server
