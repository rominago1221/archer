"""
Unit tests for the credits ledger. No Mongo required for the pure-logic
tests (cost calc, complexity detection). The ledger-mutation tests use
mongomock via motor's in-process adapter when available, otherwise they
are skipped with a clear message.

Run with:
    cd backend && pytest tests/test_credits.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make `backend/` importable when pytest is invoked from the repo root.
BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import pytest

from constants.credits import CREDIT_COSTS, TIER_CREDITS, get_pack, CREDIT_PACKS
from services.credits import (
    calculate_credit_cost,
    detect_analysis_complexity,
    next_first_of_month,
)


# ─────────────────── calculate_credit_cost ───────────────────

def test_cost_standard_free_user_no_ocr():
    assert calculate_credit_cost("analysis_standard", "free", has_ocr=False) == 200


def test_cost_standard_solo_no_ocr():
    assert calculate_credit_cost("analysis_standard", "solo", has_ocr=False) == 200


def test_cost_standard_pro_gets_multi_agent_uplift():
    # 200 (base) + 300 (multi_agent_pro) = 500
    assert calculate_credit_cost("analysis_standard", "pro", has_ocr=False) == 500


def test_cost_medium_pro_with_ocr():
    # 400 (medium) + 100 (ocr) + 300 (pro) = 800
    assert calculate_credit_cost("analysis_medium", "pro", has_ocr=True) == 800


def test_cost_multi_doc_free_with_ocr():
    # 600 (multi_doc) + 100 (ocr) = 700
    assert calculate_credit_cost("analysis_multi_doc", "free", has_ocr=True) == 700


def test_cost_refinement_is_flat():
    # Refinement does NOT get the OCR or Pro uplift.
    assert calculate_credit_cost("refinement", "pro", has_ocr=True) == 200
    assert calculate_credit_cost("refinement", "free", has_ocr=False) == 200


def test_cost_switch_jurisdiction_is_free():
    assert calculate_credit_cost("switch_jurisdiction", "pro", has_ocr=True) == 0


def test_cost_unknown_action_defaults_to_200():
    # Base 200 + (no uplift because it doesn't start with 'analysis').
    assert calculate_credit_cost("mystery_action", "pro", has_ocr=True) == 200


# ─────────────────── detect_analysis_complexity ──────────────

def test_complexity_single_short_doc():
    docs = [{"page_count": 3, "extracted_text": "abc" * 200}]  # 600 chars
    assert detect_analysis_complexity(docs) == "analysis_standard"


def test_complexity_single_long_doc_by_pages():
    docs = [{"page_count": 12, "extracted_text": "a" * 500}]
    assert detect_analysis_complexity(docs) == "analysis_medium"


def test_complexity_single_doc_by_chars_only():
    # > 8 000 chars trips medium even on a short page count.
    docs = [{"page_count": 2, "extracted_text": "x" * 9000}]
    assert detect_analysis_complexity(docs) == "analysis_medium"


def test_complexity_multi_doc_wins_over_short():
    docs = [
        {"page_count": 1, "extracted_text": "hello"},
        {"page_count": 1, "extracted_text": "hello"},
    ]
    assert detect_analysis_complexity(docs) == "analysis_multi_doc"


def test_complexity_empty_docs_falls_back_to_standard():
    assert detect_analysis_complexity([]) == "analysis_standard"


def test_complexity_none_fields_are_tolerated():
    docs = [{"page_count": None, "extracted_text": None}]
    assert detect_analysis_complexity(docs) == "analysis_standard"


# ─────────────────── tier & pack config ──────────────────────

def test_tier_credits_match_spec():
    assert TIER_CREDITS["free"] == 500
    assert TIER_CREDITS["solo"] == 1000
    assert TIER_CREDITS["pro"] == 4000


def test_credit_packs_have_expected_three():
    codes = [p["code"] for p in CREDIT_PACKS]
    assert codes == ["starter", "power", "mega"]


def test_get_pack_by_code():
    p = get_pack("power")
    assert p and p["credits"] == 3000 and abs(p["price_eur"] - 79.99) < 0.001


def test_get_pack_unknown_returns_none():
    assert get_pack("nope") is None


# ─────────────────── time helpers ────────────────────────────

def test_next_first_of_month_mid_month():
    from datetime import datetime
    n = next_first_of_month(datetime(2026, 4, 18, 14, 0, 0))
    assert n.year == 2026 and n.month == 5 and n.day == 1 and n.hour == 0


def test_next_first_of_month_december_rolls_over():
    from datetime import datetime
    n = next_first_of_month(datetime(2026, 12, 31, 23, 59, 59))
    assert n.year == 2027 and n.month == 1 and n.day == 1


# ─────────────────── ledger mutations (in-memory mongomock) ──
# These run only if mongomock + motor are available, otherwise skipped.

try:
    import mongomock_motor  # type: ignore
    HAS_MOCK = True
except Exception:
    HAS_MOCK = False


@pytest.mark.skipif(not HAS_MOCK, reason="mongomock_motor not installed")
@pytest.mark.asyncio
async def test_deduct_priority_subscription_then_pack(monkeypatch):
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
    mock_db = client["archer_test"]
    # Swap the motor `db` used by the service.
    import services.credits as sc
    monkeypatch.setattr(sc, "db", mock_db)

    user_id = "user_x"
    await mock_db.credit_balances.insert_one({
        "user_id": user_id,
        "subscription_credits": 150,
        "pack_credits": 500,
        "total_credits": 650,
        "last_reset_at": sc._utcnow(),
        "next_reset_at": sc.next_first_of_month(),
        "updated_at": sc._utcnow(),
    })

    # 400 credit spend: 150 from sub, 250 from pack.
    result = await sc.deduct_credits(user_id, 400, source="analysis", metadata={"case_id": "c1"})
    assert result["subscription_credits"] == 0
    assert result["pack_credits"] == 250
    assert result["new_balance"] == 250

    tx = await mock_db.credit_transactions.find_one({"user_id": user_id})
    assert tx["type"] == "spend"
    assert tx["amount"] == -400
    assert tx["balance_before"] == 650
    assert tx["balance_after"] == 250


@pytest.mark.skipif(not HAS_MOCK, reason="mongomock_motor not installed")
@pytest.mark.asyncio
async def test_deduct_insufficient_raises(monkeypatch):
    from mongomock_motor import AsyncMongoMockClient
    import services.credits as sc
    client = AsyncMongoMockClient()
    mock_db = client["archer_test"]
    monkeypatch.setattr(sc, "db", mock_db)

    await mock_db.credit_balances.insert_one({
        "user_id": "u1",
        "subscription_credits": 10,
        "pack_credits": 20,
        "total_credits": 30,
        "last_reset_at": sc._utcnow(),
        "next_reset_at": sc.next_first_of_month(),
        "updated_at": sc._utcnow(),
    })
    with pytest.raises(sc.CreditInsufficientError):
        await sc.deduct_credits("u1", 50, source="analysis")


@pytest.mark.skipif(not HAS_MOCK, reason="mongomock_motor not installed")
@pytest.mark.asyncio
async def test_welcome_perk_is_one_time(monkeypatch):
    from mongomock_motor import AsyncMongoMockClient
    import services.credits as sc
    client = AsyncMongoMockClient()
    mock_db = client["archer_test"]
    monkeypatch.setattr(sc, "db", mock_db)

    granted_1 = await sc.grant_welcome_perk_on_pro_upgrade("u1")
    granted_2 = await sc.grant_welcome_perk_on_pro_upgrade("u1")
    assert granted_1 is True
    assert granted_2 is False
    # Only one record exists (anti-fraud re-signup guard).
    count = await mock_db.pro_perks_usage.count_documents({"user_id": "u1"})
    assert count == 1


@pytest.mark.skipif(not HAS_MOCK, reason="mongomock_motor not installed")
@pytest.mark.asyncio
async def test_consume_welcome_perk(monkeypatch):
    from mongomock_motor import AsyncMongoMockClient
    import services.credits as sc
    client = AsyncMongoMockClient()
    mock_db = client["archer_test"]
    monkeypatch.setattr(sc, "db", mock_db)

    await sc.grant_welcome_perk_on_pro_upgrade("u1")
    ok = await sc.consume_welcome_perk("u1", case_id="c1", lawyer_id="L1", booking_id="b1")
    assert ok is True
    # Can't consume twice.
    ok2 = await sc.consume_welcome_perk("u1", case_id="c1", lawyer_id="L1", booking_id="b2")
    assert ok2 is False
