"""Sprint D — Client checkout + webhook-triggered matching test."""
import os
import sys
import uuid
import asyncio
import pytest
import requests
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
os.environ.setdefault("STRIPE_API_KEY", "sk_test_dummy")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("REQUIRE_STRIPE_ONBOARDING", "false")

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PREFIX = "TEST_CHK_"


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def client_ctx(db):
    import bcrypt
    uid = f"{PREFIX}u_{uuid.uuid4().hex[:8]}"
    email = f"{uid}@ex.test"
    pw = "pass12345"
    db.users.insert_one({
        "user_id": uid, "email": email, "name": "Sophie Lacroix",
        "password_hash": bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode(),
        "auth_provider": "email", "phone": "+32 478",
        "country": "BE", "jurisdiction": "BE", "region": "Bruxelles",
        "language": "fr", "account_type": "client", "plan": "free",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw})
    token = r.json()["session_token"]
    cid = f"{PREFIX}c_{uuid.uuid4().hex[:8]}"
    db.cases.insert_one({
        "case_id": cid, "user_id": uid,
        "title": "Eviction notice", "type": "eviction", "status": "active",
        "country": "BE", "language": "fr",
        "ai_summary": "summary", "ai_findings": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"user_id": uid, "token": token, "case_id": cid, "email": email}
    db.users.delete_one({"user_id": uid})
    db.user_sessions.delete_many({"user_id": uid})
    db.cases.delete_one({"case_id": cid})
    db.case_assignments.delete_many({"case_id": cid})
    db.attorney_matching_log.delete_many({"case_id": cid})


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


# =========================================================================
# Checkout endpoint (service layer smoke — Stripe SDK rejects dummy key → 502)
# =========================================================================

def test_checkout_unauthorized():
    r = requests.post(f"{API}/cases/fake/checkout/attorney-letter",
                      json={"service_type": "attorney_letter"})
    assert r.status_code == 401


def test_checkout_forbidden_on_other_users_case(db, client_ctx):
    other_case = f"{PREFIX}c_other_{uuid.uuid4().hex[:8]}"
    other_uid = f"{PREFIX}u_other_{uuid.uuid4().hex[:8]}"
    db.users.insert_one({
        "user_id": other_uid, "email": f"{other_uid}@ex.test", "name": "Other",
        "country": "BE", "jurisdiction": "BE", "language": "fr",
        "account_type": "client", "plan": "free",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.cases.insert_one({
        "case_id": other_case, "user_id": other_uid,
        "title": "Other case", "type": "eviction", "status": "active",
        "country": "BE", "language": "fr",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    try:
        r = requests.post(
            f"{API}/cases/{other_case}/checkout/attorney-letter",
            headers=_auth(client_ctx["token"]),
            json={"service_type": "attorney_letter"},
        )
        assert r.status_code == 403
    finally:
        db.users.delete_one({"user_id": other_uid})
        db.cases.delete_one({"case_id": other_case})


def test_checkout_conflict_when_already_paid(db, client_ctx):
    db.cases.update_one(
        {"case_id": client_ctx["case_id"]},
        {"$set": {"payment_status": "paid"}},
    )
    r = requests.post(
        f"{API}/cases/{client_ctx['case_id']}/checkout/attorney-letter",
        headers=_auth(client_ctx["token"]),
        json={"service_type": "attorney_letter"},
    )
    assert r.status_code == 409


# =========================================================================
# Webhook handler direct: payment_intent.succeeded triggers Sprint C matching
# =========================================================================

def test_payment_intent_succeeded_triggers_matching(db, client_ctx, monkeypatch):
    """Direct unit call to the handler — no webhook signature needed."""
    import bcrypt, secrets as secmod
    # Seed a matching attorney (BE + logement)
    aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
    db.attorneys.insert_one({
        "id": aid, "email": f"{aid}@ex.test",
        "first_name": "Marc", "last_name": "D",
        "password_hash": bcrypt.hashpw(b"pw", bcrypt.gensalt()).decode(),
        "status": "active", "available_for_cases": True,
        "stripe_onboarding_completed": False,  # ignored when flag off
        "stripe_account_id": None,
        "jurisdiction": "BE", "specialties": ["logement"],
        "active_cases_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Stub send_email to avoid SendGrid hits during test
    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    from routes.stripe_webhooks import handle_payment_intent_succeeded

    pi = {
        "id": "pi_test_" + uuid.uuid4().hex[:8],
        "amount": 3900,
        "metadata": {
            "case_id": client_ctx["case_id"],
            "service_type": "attorney_letter",
            "user_id": client_ctx["user_id"],
        },
    }
    try:
        asyncio.run(handle_payment_intent_succeeded(pi))

        updated = db.cases.find_one({"case_id": client_ctx["case_id"]})
        assert updated["payment_status"] == "paid"
        assert updated["payment_intent_id"] == pi["id"]
        assert updated["amount_paid_cents"] == 3900
        assert updated["attorney_status"] == "assigned"  # matching succeeded

        # An assignment was created
        ass = db.case_assignments.find_one({"case_id": client_ctx["case_id"]})
        assert ass is not None
        assert ass["attorney_id"] == aid
    finally:
        db.attorneys.delete_one({"id": aid})


def test_payment_intent_idempotent(db, client_ctx, monkeypatch):
    """Second webhook call for the same PI is a no-op."""
    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    from routes.stripe_webhooks import handle_payment_intent_succeeded
    db.cases.update_one(
        {"case_id": client_ctx["case_id"]},
        {"$set": {"payment_status": "paid", "payment_intent_id": "pi_existing"}},
    )
    pi = {"id": "pi_new", "amount": 3900,
          "metadata": {"case_id": client_ctx["case_id"], "service_type": "attorney_letter"}}
    asyncio.run(handle_payment_intent_succeeded(pi))
    doc = db.cases.find_one({"case_id": client_ctx["case_id"]})
    # payment_intent_id must NOT be overwritten
    assert doc["payment_intent_id"] == "pi_existing"
