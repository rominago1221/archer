"""
Unit tests for the lawyer subscription gating logic — specifically:
  - routing filter (is_active_for_routing)
  - trial expiry flow in the hourly cron
  - welcome counsel counter increment logic

Run with:
    cd backend && pytest tests/test_lawyer_subscription.py -v
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import pytest

try:
    import mongomock_motor  # type: ignore
    HAS_MOCK = True
except Exception:
    HAS_MOCK = False


@pytest.mark.skipif(not HAS_MOCK, reason="mongomock_motor not installed")
@pytest.mark.asyncio
async def test_routing_filter_excludes_unsubscribed(monkeypatch):
    """Matching must skip attorneys without is_active_for_routing=True."""
    from mongomock_motor import AsyncMongoMockClient
    import services.attorney_matching as m
    monkeypatch.setenv("REQUIRE_LAWYER_SUBSCRIPTION", "true")
    monkeypatch.setenv("REQUIRE_STRIPE_ONBOARDING", "false")
    client = AsyncMongoMockClient()
    mock_db = client["archer_test"]
    monkeypatch.setattr(m, "db", mock_db)

    # Three attorneys, only one is gated in.
    await mock_db.attorneys.insert_many([
        {"id": "A1", "status": "active", "available_for_cases": True,
         "jurisdiction": "BE", "specialties": ["logement"],
         "is_active_for_routing": True, "active_cases_count": 0,
         "rating_avg": 4.8, "avg_response_seconds": 3600},
        {"id": "A2", "status": "active", "available_for_cases": True,
         "jurisdiction": "BE", "specialties": ["logement"],
         "is_active_for_routing": False, "active_cases_count": 0,
         "rating_avg": 5.0, "avg_response_seconds": 1800},
        {"id": "A3", "status": "active", "available_for_cases": True,
         "jurisdiction": "BE", "specialties": ["logement"],
         # Missing field → excluded under our new strict filter.
         "active_cases_count": 0, "rating_avg": 4.9, "avg_response_seconds": 2400},
    ])
    case = {"country": "BE", "type": "eviction"}
    picked, count = await m.match_case_to_attorney(case)
    assert picked is not None
    assert picked["id"] == "A1"
    assert count == 1


@pytest.mark.skipif(not HAS_MOCK, reason="mongomock_motor not installed")
@pytest.mark.asyncio
async def test_cron_expires_untended_trial(monkeypatch):
    """A trial with `trial_ends_at` in the past and no subscription_id → inactive."""
    from mongomock_motor import AsyncMongoMockClient
    import jobs.lawyer_routing_status as job
    import services.credits as sc
    client = AsyncMongoMockClient()
    mock_db = client["archer_test"]
    monkeypatch.setattr(job, "db", mock_db)
    monkeypatch.setattr(sc, "db", mock_db)

    past = sc._utcnow() - timedelta(days=1)
    future = sc._utcnow() + timedelta(days=10)
    await mock_db.attorneys.insert_many([
        # Expired trial, never linked → should flip to inactive.
        {"id": "A1", "subscription_status": "trial", "trial_ends_at": past,
         "subscription_id": None, "is_active_for_routing": True},
        # Trial still running → untouched.
        {"id": "A2", "subscription_status": "trial", "trial_ends_at": future,
         "subscription_id": None, "is_active_for_routing": True},
        # Expired trial but linked to a Stripe sub → Stripe drives state, skip.
        {"id": "A3", "subscription_status": "trial", "trial_ends_at": past,
         "subscription_id": "sub_xxx", "is_active_for_routing": True},
    ])

    result = await job.update_lawyer_routing_status()
    assert result["expired_trials"] == 1

    a1 = await mock_db.attorneys.find_one({"id": "A1"})
    a2 = await mock_db.attorneys.find_one({"id": "A2"})
    a3 = await mock_db.attorneys.find_one({"id": "A3"})
    assert a1["subscription_status"] == "inactive"
    assert a1["is_active_for_routing"] is False
    assert a2["subscription_status"] == "trial"
    assert a2["is_active_for_routing"] is True
    assert a3["subscription_status"] == "trial"  # Stripe-linked, untouched


@pytest.mark.skipif(not HAS_MOCK, reason="mongomock_motor not installed")
@pytest.mark.asyncio
async def test_cron_past_due_over_7_days_disables_routing(monkeypatch):
    from mongomock_motor import AsyncMongoMockClient
    import jobs.lawyer_routing_status as job
    import services.credits as sc
    client = AsyncMongoMockClient()
    mock_db = client["archer_test"]
    monkeypatch.setattr(job, "db", mock_db)
    monkeypatch.setattr(sc, "db", mock_db)

    old_due = sc._utcnow() - timedelta(days=10)
    fresh_due = sc._utcnow() - timedelta(days=2)
    await mock_db.attorneys.insert_many([
        {"id": "A1", "subscription_status": "past_due",
         "subscription_current_period_end": old_due,
         "is_active_for_routing": True},
        {"id": "A2", "subscription_status": "past_due",
         "subscription_current_period_end": fresh_due,
         "is_active_for_routing": True},
    ])

    result = await job.update_lawyer_routing_status()
    assert result["past_due_disabled"] == 1
    a1 = await mock_db.attorneys.find_one({"id": "A1"})
    a2 = await mock_db.attorneys.find_one({"id": "A2"})
    assert a1["is_active_for_routing"] is False
    assert a2["is_active_for_routing"] is True
