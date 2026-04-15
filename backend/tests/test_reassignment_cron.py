"""Sprint C — Cron reassignment tests.

Tests the portal_maintenance tick logic in isolation (scheduler not started).
"""
import os
import sys
import uuid
import asyncio
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("REQUIRE_STRIPE_ONBOARDING", "false")

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from jobs.portal_maintenance import expire_and_reassign, send_expiring_warnings  # noqa: E402

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PREFIX = "TEST_CRON_"


@pytest.fixture(scope="module")
def db_sync():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def factory(db_sync):
    ids = {"atty": [], "case": [], "ass": [], "u": []}

    def _atty(**kw):
        aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
        db_sync.attorneys.insert_one({
            "id": aid, "email": f"{aid}@ex.test",
            "first_name": "A", "last_name": "T",
            "status": "active", "available_for_cases": True,
            "stripe_onboarding_completed": True,
            "jurisdiction": "BE", "specialties": ["logement"],
            "rating_avg": 4.5, "active_cases_count": 1,
            "avg_response_seconds": 600,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **kw,
        })
        ids["atty"].append(aid)
        return aid

    def _case(**kw):
        cid = f"{PREFIX}c_{uuid.uuid4().hex[:8]}"
        uid = f"{PREFIX}u_{uuid.uuid4().hex[:8]}"
        db_sync.users.insert_one({
            "user_id": uid, "email": f"{uid}@ex.test", "name": "Sophie Lacroix",
            "country": "BE", "language": "fr",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        ids["u"].append(uid)
        db_sync.cases.insert_one({
            "case_id": cid, "user_id": uid,
            "title": "Eviction", "type": "eviction",
            "status": "active", "country": "BE", "language": "fr",
            "ai_summary": "sum", "ai_findings": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            **kw,
        })
        ids["case"].append(cid)
        return cid

    def _ass(atty_id, case_id, *, status="pending", expires_in_minutes=30,
             expiring_email_sent=False):
        aid = f"{PREFIX}ass_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        db_sync.case_assignments.insert_one({
            "id": aid, "attorney_id": atty_id, "case_id": case_id,
            "client_user_id": None, "status": status,
            "service_type": "attorney_letter",
            "case_number": str(secrets.randbelow(9000) + 1000),
            "assigned_at": now.isoformat(),
            "expires_at": (now + timedelta(minutes=expires_in_minutes)).isoformat(),
            "accepted_at": None, "deadline_at": None,
            "expiring_email_sent": expiring_email_sent,
            "case_snapshot": {"title": "t", "type": "eviction", "language": "fr"},
            "client_pays_cents": 4999, "archer_fee_cents": 1500,
            "stripe_fee_cents": 175, "your_payout_cents": 3324,
            "created_at": now.isoformat(), "updated_at": now.isoformat(),
        })
        ids["ass"].append(aid)
        return aid

    yield type("F", (), {"atty": staticmethod(_atty),
                         "case": staticmethod(_case),
                         "ass": staticmethod(_ass)})

    db_sync.attorneys.delete_many({"id": {"$in": ids["atty"]}})
    db_sync.cases.delete_many({"case_id": {"$in": ids["case"]}})
    db_sync.case_assignments.delete_many({"case_id": {"$in": ids["case"]}})
    db_sync.users.delete_many({"user_id": {"$in": ids["u"]}})
    db_sync.attorney_matching_log.delete_many({"case_id": {"$in": ids["case"]}})


def _run(coro):
    return asyncio.run(coro)


# =====================================================================
# Tests
# =====================================================================

def test_expired_assignment_is_marked_expired_and_reassigned(factory, db_sync):
    a1 = factory.atty()
    a2 = factory.atty()
    c = factory.case()
    ass = factory.ass(a1, c, expires_in_minutes=-5)

    n = _run(expire_and_reassign())
    assert n >= 1

    updated = db_sync.case_assignments.find_one({"id": ass})
    assert updated["status"] == "expired"

    new = db_sync.case_assignments.find_one(
        {"case_id": c, "status": "pending"},
    )
    assert new is not None
    assert new["attorney_id"] == a2  # a1 excluded (already saw it)


def test_no_more_attorneys_marks_case_unmatched(factory, db_sync):
    # Only one attorney, their assignment expires → no candidate left
    a1 = factory.atty()
    c = factory.case()
    factory.ass(a1, c, expires_in_minutes=-5)

    _run(expire_and_reassign())
    updated_case = db_sync.cases.find_one({"case_id": c})
    assert updated_case["attorney_status"] == "unassigned_no_match"

    no_match_log = db_sync.attorney_matching_log.find_one({
        "case_id": c, "action": "no_match",
    })
    assert no_match_log is not None


def test_already_accepted_assignment_not_affected_by_cron(factory, db_sync):
    a1 = factory.atty()
    c = factory.case()
    ass = factory.ass(a1, c, status="accepted", expires_in_minutes=-30)

    _run(expire_and_reassign())
    updated = db_sync.case_assignments.find_one({"id": ass})
    assert updated["status"] == "accepted"


def test_expiring_warning_marks_flag_and_is_idempotent(factory, db_sync, monkeypatch):
    # Stub send_email to avoid real network
    from services import attorney_matching
    async def _fake_send(*args, **kw): return None
    monkeypatch.setattr("routes.attorney_routes.send_email", _fake_send, raising=False)

    a1 = factory.atty()
    c = factory.case()
    ass = factory.ass(a1, c, expires_in_minutes=10)  # inside 15-min window

    sent = _run(send_expiring_warnings())
    assert sent >= 1
    updated = db_sync.case_assignments.find_one({"id": ass})
    assert updated["expiring_email_sent"] is True

    # Second run must not send again
    sent2 = _run(send_expiring_warnings())
    assert sent2 == 0


def test_expiring_warning_skipped_when_outside_window(factory, db_sync):
    a1 = factory.atty()
    c = factory.case()
    ass = factory.ass(a1, c, expires_in_minutes=25)  # > 15 min — not urgent yet

    sent = _run(send_expiring_warnings())
    updated = db_sync.case_assignments.find_one({"id": ass})
    # Either no warning sent, or flag remains False (since we didn't touch this one)
    assert updated["expiring_email_sent"] is False
