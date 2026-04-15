"""Sprint D — Earnings endpoint tests (integration)."""
import os
import sys
import uuid
import secrets
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PREFIX = "TEST_EARN_"


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def attorney_ctx(db):
    import bcrypt
    aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
    token = secrets.token_urlsafe(32)
    db.attorneys.insert_one({
        "id": aid, "email": f"{aid}@ex.test",
        "first_name": "Marc", "last_name": "D",
        "password_hash": bcrypt.hashpw(b"pw", bcrypt.gensalt()).decode(),
        "status": "active", "available_for_cases": True,
        "stripe_onboarding_completed": True,
        "stripe_account_id": "acct_test",
        "stripe_iban_last4": "3847",
        "jurisdiction": "BE", "specialties": ["logement"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.attorney_sessions.insert_one({
        "attorney_id": aid, "token": token, "type": "session",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month = (month_start - timedelta(days=1)).replace(day=1)

    # Two completed assignments this month (paid + unpaid)
    db.case_assignments.insert_many([
        {
            "id": f"{PREFIX}ass_{uuid.uuid4().hex[:8]}",
            "attorney_id": aid, "case_id": f"{PREFIX}c_{i}",
            "status": "completed",
            "your_payout_cents": 3500,
            "completed_at": (month_start + timedelta(days=2 + i)).isoformat(),
            "paid_out_at": None if i == 0 else (month_start + timedelta(days=4)).isoformat(),
            "created_at": now.isoformat(), "updated_at": now.isoformat(),
            "case_snapshot": {"type": "eviction", "title": "t"},
        } for i in range(2)
    ])
    # One completed last month
    db.case_assignments.insert_one({
        "id": f"{PREFIX}ass_{uuid.uuid4().hex[:8]}",
        "attorney_id": aid, "case_id": f"{PREFIX}c_lm",
        "status": "completed",
        "your_payout_cents": 2000,
        "completed_at": (last_month + timedelta(days=5)).isoformat(),
        "paid_out_at": (last_month + timedelta(days=10)).isoformat(),
        "created_at": now.isoformat(), "updated_at": now.isoformat(),
        "case_snapshot": {"type": "eviction", "title": "t"},
    })
    # One payout record
    db.payouts.insert_one({
        "id": f"{PREFIX}po_{uuid.uuid4().hex[:8]}",
        "attorney_id": aid,
        "stripe_transfer_id": "tr_x", "stripe_payout_id": None,
        "amount_cents": 2000, "currency": "eur",
        "period_start": last_month.isoformat(),
        "period_end": (last_month + timedelta(days=7)).isoformat(),
        "assignment_count": 1, "status": "paid",
        "iban_last4": "3847",
        "created_at": (last_month + timedelta(days=10)).isoformat(),
        "paid_at": (last_month + timedelta(days=12)).isoformat(),
    })

    yield {"id": aid, "token": token}

    db.attorneys.delete_one({"id": aid})
    db.attorney_sessions.delete_one({"token": token})
    db.case_assignments.delete_many({"attorney_id": aid})
    db.payouts.delete_many({"attorney_id": aid})


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


# =========================================================================

def test_summary_structure_and_this_month(attorney_ctx):
    r = requests.get(f"{API}/attorneys/earnings/summary", headers=_auth(attorney_ctx["token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    assert "total_all_time" in d
    assert "this_month" in d
    assert "next_payout" in d
    assert d["iban_last4"] == "3847"
    assert d["stripe_ready"] is True
    # 2 assignments × 3500 cents this month
    assert d["this_month"]["amount_cents"] == 7000
    assert d["this_month"]["case_count"] == 2
    # 1 unpaid completed (3500) in next_payout
    assert d["next_payout"]["amount_cents"] == 3500
    assert d["next_payout"]["case_count"] == 1


def test_summary_growth_vs_last_month(attorney_ctx):
    r = requests.get(f"{API}/attorneys/earnings/summary", headers=_auth(attorney_ctx["token"]))
    d = r.json()
    # last month: 2000, this month: 7000 → +250%
    assert d["this_month"]["growth_vs_last_month_percent"] == 250.0


def test_chart_returns_12_months(attorney_ctx):
    r = requests.get(f"{API}/attorneys/earnings/chart?period=12m",
                     headers=_auth(attorney_ctx["token"]))
    assert r.status_code == 200
    chart = r.json()["chart"]
    assert len(chart) == 12
    # Last element is current month
    assert chart[-1]["is_current_month"] is True
    assert chart[-1]["amount_cents"] == 7000


def test_chart_3m(attorney_ctx):
    r = requests.get(f"{API}/attorneys/earnings/chart?period=3m",
                     headers=_auth(attorney_ctx["token"]))
    assert len(r.json()["chart"]) == 3


def test_payouts_history_sorted_desc(attorney_ctx):
    r = requests.get(f"{API}/attorneys/earnings/payouts",
                     headers=_auth(attorney_ctx["token"]))
    assert r.status_code == 200
    rows = r.json()["payouts"]
    assert len(rows) >= 1
    # Sorted desc by created_at — just check shape
    assert rows[0]["amount_cents"] == 2000
    assert rows[0]["status"] == "paid"


def test_earnings_requires_auth():
    r = requests.get(f"{API}/attorneys/earnings/summary")
    assert r.status_code == 401
