"""Sprint C — Matching algorithm tests.

Covers: score determinism, filter criteria (jurisdiction, availability, stripe,
exclude, specialty), load balancing, fallback specialty, admin escalation on
no-match.

Integration-style (uses live MongoDB for writes via factory fixture).
"""
import os
import uuid
import secrets
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("REQUIRE_STRIPE_ONBOARDING", "false")

# Make backend/ importable for service imports when running pytest from repo root.
import sys
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.attorney_matching import (  # noqa: E402
    compute_match_score,
    match_case_to_attorney,
    assign_case_to_attorney,
    infer_specialty_from_case_type,
)

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
TEST_PREFIX = "TEST_MATCH_"


@pytest.fixture(scope="module")
def db_sync():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture
def factory(db_sync):
    created = {"attorneys": [], "cases": [], "assignments": [],
               "logs": [], "users": []}

    def _atty(**overrides):
        aid = f"{TEST_PREFIX}a_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": aid, "email": f"{aid}@ex.test",
            "first_name": "A", "last_name": "T",
            "status": "active", "available_for_cases": True,
            "stripe_onboarding_completed": True,
            "jurisdiction": "BE", "specialties": ["logement"],
            "rating_avg": 4.5, "active_cases_count": 0,
            "avg_response_seconds": 600,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **overrides,
        }
        db_sync.attorneys.insert_one(doc)
        created["attorneys"].append(aid)
        return doc

    def _case(**overrides):
        cid = f"{TEST_PREFIX}c_{uuid.uuid4().hex[:8]}"
        uid = f"{TEST_PREFIX}u_{uuid.uuid4().hex[:8]}"
        db_sync.users.insert_one({
            "user_id": uid, "email": f"{uid}@ex.test", "name": "Client Test",
            "country": "BE", "language": "fr",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created["users"].append(uid)
        doc = {
            "case_id": cid, "user_id": uid,
            "title": "Eviction test", "type": "eviction",
            "status": "active", "country": "BE",
            "language": "fr",
            "ai_summary": "Test summary", "ai_findings": [],
            "strategy": None, "success_probability": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **overrides,
        }
        db_sync.cases.insert_one(doc)
        created["cases"].append(cid)
        return doc

    yield type("F", (), {"atty": staticmethod(_atty), "case": staticmethod(_case)})

    # Cleanup
    db_sync.attorneys.delete_many({"id": {"$in": created["attorneys"]}})
    db_sync.cases.delete_many({"case_id": {"$in": created["cases"]}})
    db_sync.users.delete_many({"user_id": {"$in": created["users"]}})
    db_sync.case_assignments.delete_many({"case_id": {"$in": created["cases"]}})
    db_sync.attorney_matching_log.delete_many({"case_id": {"$in": created["cases"]}})


def _run(coro):
    return asyncio.run(coro)


# =====================================================================
# Pure scoring
# =====================================================================

def test_score_prefers_lower_load():
    a = {"active_cases_count": 0, "rating_avg": 4.0, "avg_response_seconds": 600}
    b = {"active_cases_count": 10, "rating_avg": 4.0, "avg_response_seconds": 600}
    # Run multiple times to dominate tiebreak noise
    wins_a = sum(1 for _ in range(20) if compute_match_score(a) > compute_match_score(b))
    assert wins_a == 20


def test_score_prefers_higher_rating_when_load_equal():
    a = {"active_cases_count": 3, "rating_avg": 4.9, "avg_response_seconds": 600}
    b = {"active_cases_count": 3, "rating_avg": 3.5, "avg_response_seconds": 600}
    wins_a = sum(1 for _ in range(20) if compute_match_score(a) > compute_match_score(b))
    assert wins_a == 20


def test_score_prefers_faster_response():
    a = {"active_cases_count": 3, "rating_avg": 4.0, "avg_response_seconds": 300}
    b = {"active_cases_count": 3, "rating_avg": 4.0, "avg_response_seconds": 3600}
    wins_a = sum(1 for _ in range(20) if compute_match_score(a) > compute_match_score(b))
    assert wins_a == 20


def test_specialty_mapping_uses_fallback_civil():
    assert infer_specialty_from_case_type("unknown_type") == "civil"
    assert infer_specialty_from_case_type(None) == "civil"


def test_specialty_mapping_extended_keys():
    assert infer_specialty_from_case_type("housing") == "logement"
    assert infer_specialty_from_case_type("employment") == "travail"
    assert infer_specialty_from_case_type("insurance") == "assurance"
    assert infer_specialty_from_case_type("consumer") == "consommation"


# =====================================================================
# match_case_to_attorney — DB filters
# =====================================================================

def test_match_returns_none_when_no_attorneys_match_jurisdiction(factory):
    factory.atty(jurisdiction="US")
    factory.atty(jurisdiction="US")
    case = factory.case(country="BE", type="eviction")
    att, n = _run(match_case_to_attorney(case))
    assert att is None
    assert n == 0


def test_match_excludes_unavailable_attorneys(factory):
    factory.atty(available_for_cases=False)
    factory.atty(available_for_cases=False)
    good = factory.atty(available_for_cases=True)
    case = factory.case()
    att, _ = _run(match_case_to_attorney(case))
    assert att is not None
    assert att["id"] == good["id"]


def test_match_excludes_attorneys_with_suspended_status(factory):
    factory.atty(status="suspended")
    good = factory.atty(status="active")
    case = factory.case()
    att, _ = _run(match_case_to_attorney(case))
    assert att["id"] == good["id"]


def test_match_stripe_gating_off_by_default(factory, monkeypatch):
    # No attorneys with stripe — must still match if flag off
    monkeypatch.setenv("REQUIRE_STRIPE_ONBOARDING", "false")
    import importlib, services.attorney_matching as m
    importlib.reload(m)
    good = m  # ensure module present
    factory.atty(stripe_onboarding_completed=False)
    case = factory.case()
    att, _ = _run(m.match_case_to_attorney(case))
    assert att is not None


def test_match_stripe_gating_on_filters_candidates(factory, monkeypatch):
    monkeypatch.setenv("REQUIRE_STRIPE_ONBOARDING", "true")
    import importlib, services.attorney_matching as m
    importlib.reload(m)
    factory.atty(stripe_onboarding_completed=False)
    with_stripe = factory.atty(stripe_onboarding_completed=True)
    case = factory.case()
    att, _ = _run(m.match_case_to_attorney(case))
    assert att is not None
    assert att["id"] == with_stripe["id"]
    monkeypatch.setenv("REQUIRE_STRIPE_ONBOARDING", "false")
    importlib.reload(m)


def test_match_excludes_attorney_ids_in_exclusion_list(factory):
    a1 = factory.atty()
    a2 = factory.atty()
    a3 = factory.atty()
    case = factory.case()
    att, _ = _run(match_case_to_attorney(case, exclude_attorney_ids=[a1["id"], a2["id"]]))
    assert att is not None
    assert att["id"] == a3["id"]


def test_match_requires_specialty_overlap(factory):
    factory.atty(specialties=["travail"])
    factory.atty(specialties=["famille"])
    case = factory.case(type="eviction")  # requires 'logement'
    att, n = _run(match_case_to_attorney(case))
    assert att is None
    assert n == 0


def test_match_load_balancing_favors_lower_load(factory):
    # Same rating, different load — lower load must win (ties break via random,
    # but with large load delta scoring dominates)
    busy = factory.atty(active_cases_count=20, rating_avg=4.5)
    idle = factory.atty(active_cases_count=0, rating_avg=4.5)
    case = factory.case()
    wins_idle = 0
    for _ in range(20):
        att, _ = _run(match_case_to_attorney(case))
        if att["id"] == idle["id"]:
            wins_idle += 1
    assert wins_idle == 20


# =====================================================================
# assign_case_to_attorney — integration
# =====================================================================

def test_assign_creates_assignment_and_logs(factory, db_sync):
    a = factory.atty()
    case = factory.case()
    assignment = _run(assign_case_to_attorney(case["case_id"], notify=False))
    assert assignment is not None
    assert assignment["attorney_id"] == a["id"]
    assert assignment["status"] == "pending"

    log = db_sync.attorney_matching_log.find_one({"case_id": case["case_id"],
                                                    "action": "auto_matched"})
    assert log is not None
    assert log["attorney_id"] == a["id"]
    assert log["match_score"] is not None
    assert log["candidates_considered"] == 1

    atty_updated = db_sync.attorneys.find_one({"id": a["id"]})
    assert atty_updated["active_cases_count"] == 1

    case_updated = db_sync.cases.find_one({"case_id": case["case_id"]})
    assert case_updated["attorney_status"] == "assigned"


def test_assign_no_match_sets_case_unassigned_and_logs(factory, db_sync):
    # No matching attorney
    factory.atty(jurisdiction="US")
    case = factory.case(country="BE", type="eviction")
    assignment = _run(assign_case_to_attorney(case["case_id"], notify=False))
    assert assignment is None

    case_updated = db_sync.cases.find_one({"case_id": case["case_id"]})
    assert case_updated["attorney_status"] == "unassigned_no_match"

    log = db_sync.attorney_matching_log.find_one({"case_id": case["case_id"],
                                                    "action": "no_match"})
    assert log is not None


def test_assign_respects_exclude_list(factory, db_sync):
    a1 = factory.atty()
    a2 = factory.atty()
    case = factory.case()
    assignment = _run(assign_case_to_attorney(
        case["case_id"], exclude_attorney_ids=[a1["id"]], notify=False,
    ))
    assert assignment is not None
    assert assignment["attorney_id"] == a2["id"]
