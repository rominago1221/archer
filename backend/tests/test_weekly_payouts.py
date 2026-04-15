"""Sprint D — Weekly payouts cron tests.

Runs the payout function directly (no scheduler, no live Stripe).
"""
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from types import SimpleNamespace
import pytest
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("STRIPE_API_KEY", "sk_test_dummy")

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PREFIX = "TEST_PAYOUT_"


@pytest.fixture(scope="module")
def db_sync():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def factory(db_sync):
    ids = {"a": [], "ass": [], "po": []}

    def _atty(**kw):
        aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
        db_sync.attorneys.insert_one({
            "id": aid, "email": f"{aid}@ex.test",
            "first_name": "Marc", "last_name": "D",
            "status": "active", "available_for_cases": True,
            "stripe_onboarding_completed": True,
            "stripe_account_id": f"acct_{uuid.uuid4().hex[:10]}",
            "stripe_iban_last4": "3847",
            "jurisdiction": "BE", "specialties": ["logement"],
            "active_cases_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **kw,
        })
        ids["a"].append(aid)
        return aid

    def _assignment(attorney_id, *, payout_cents=3500, paid=False, completed_days_ago=2):
        aid = f"{PREFIX}ass_{uuid.uuid4().hex[:8]}"
        completed_at = datetime.now(timezone.utc) - timedelta(days=completed_days_ago)
        db_sync.case_assignments.insert_one({
            "id": aid, "attorney_id": attorney_id,
            "case_id": f"{PREFIX}c_{uuid.uuid4().hex[:8]}",
            "status": "completed",
            "service_type": "attorney_letter",
            "your_payout_cents": payout_cents,
            "completed_at": completed_at.isoformat(),
            "paid_out_at": completed_at.isoformat() if paid else None,
            "created_at": completed_at.isoformat(),
            "updated_at": completed_at.isoformat(),
            "case_snapshot": {"type": "eviction", "title": "t"},
        })
        ids["ass"].append(aid)
        return aid

    yield type("F", (), {"atty": staticmethod(_atty),
                         "ass": staticmethod(_assignment)})

    db_sync.attorneys.delete_many({"id": {"$in": ids["a"]}})
    db_sync.case_assignments.delete_many({"attorney_id": {"$in": ids["a"]}})
    db_sync.payouts.delete_many({"attorney_id": {"$in": ids["a"]}})


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture
def mock_transfer(monkeypatch):
    """Patch stripe.Transfer.create so tests never hit the real API."""
    calls = []

    def _fake_create(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(id=f"tr_fake_{uuid.uuid4().hex[:8]}")

    import stripe as stripe_mod
    monkeypatch.setattr(stripe_mod.Transfer, "create", _fake_create)
    return calls


# =========================================================================
# Tests
# =========================================================================

def test_payout_aggregates_completed_assignments(factory, db_sync, mock_transfer, monkeypatch):
    """5 completed assignments of €35 each → one Transfer for €175."""
    from jobs.weekly_payouts import process_weekly_payouts

    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    a = factory.atty()
    for _ in range(5):
        factory.ass(a, payout_cents=3500)

    summary = _run(process_weekly_payouts())
    assert summary["attorneys_paid"] == 1
    assert summary["total_cents"] == 17500

    assert len(mock_transfer) == 1
    call = mock_transfer[0]
    assert call["amount"] == 17500
    assert call["currency"] == "eur"
    assert call["metadata"]["attorney_id"] == a

    # all 5 assignments now have paid_out_at set
    unpaid = db_sync.case_assignments.count_documents(
        {"attorney_id": a, "status": "completed", "paid_out_at": None},
    )
    assert unpaid == 0

    po = db_sync.payouts.find_one({"attorney_id": a})
    assert po is not None
    assert po["amount_cents"] == 17500
    assert po["assignment_count"] == 5
    assert po["status"] == "pending"
    assert po["iban_last4"] == "3847"


def test_no_payout_when_nothing_to_pay(factory, db_sync, mock_transfer, monkeypatch):
    from jobs.weekly_payouts import process_weekly_payouts
    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    factory.atty()  # no assignments
    _run(process_weekly_payouts())
    assert len(mock_transfer) == 0


def test_payout_skipped_for_micro_amounts(factory, db_sync, mock_transfer, monkeypatch):
    """Under PAYOUT_MIN_CENTS (default 100) must be skipped."""
    from jobs.weekly_payouts import process_weekly_payouts
    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    a = factory.atty()
    factory.ass(a, payout_cents=50)  # < 1€
    _run(process_weekly_payouts())
    assert len(mock_transfer) == 0
    # Assignment still unpaid
    doc = db_sync.case_assignments.find_one(
        {"attorney_id": a, "status": "completed"},
    )
    assert doc["paid_out_at"] is None


def test_payout_skipped_for_attorneys_without_stripe(factory, db_sync, mock_transfer, monkeypatch):
    from jobs.weekly_payouts import process_weekly_payouts
    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    a = factory.atty(stripe_onboarding_completed=False)
    factory.ass(a, payout_cents=3500)
    _run(process_weekly_payouts())
    assert len(mock_transfer) == 0


def test_payout_idempotent_reruns_skip_already_paid(factory, db_sync, mock_transfer, monkeypatch):
    from jobs.weekly_payouts import process_weekly_payouts
    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    a = factory.atty()
    factory.ass(a, payout_cents=3500)
    _run(process_weekly_payouts())
    assert len(mock_transfer) == 1
    _run(process_weekly_payouts())  # re-run
    assert len(mock_transfer) == 1  # no second transfer


def test_payout_currency_us_attorney(factory, db_sync, mock_transfer, monkeypatch):
    from jobs.weekly_payouts import process_weekly_payouts
    async def _noop(*a, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _noop, raising=False)

    a = factory.atty(jurisdiction="US")
    factory.ass(a, payout_cents=3500)
    _run(process_weekly_payouts())
    assert mock_transfer[0]["currency"] == "usd"
