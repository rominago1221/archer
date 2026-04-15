"""Sprint D — Earnings endpoints for the attorney portal.

Mounted at /api/attorneys/earnings/*. All gated by attorney_required.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta
from typing import Literal
from fastapi import APIRouter, Depends

from db import db
from utils.attorney_auth import attorney_required

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attorneys/earnings")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _next_monday(after: datetime | None = None) -> datetime:
    base = after or _now()
    days_ahead = (7 - base.weekday()) % 7 or 7
    return (base + timedelta(days=days_ahead)).replace(
        hour=9, minute=0, second=0, microsecond=0,
    )


def _month_floor(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


async def _sum_cents(query: dict) -> int:
    pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$your_payout_cents"}}},
    ]
    cursor = db.case_assignments.aggregate(pipeline)
    async for row in cursor:
        return int(row.get("total") or 0)
    return 0


# =========================================================================
# GET /attorneys/earnings/summary
# =========================================================================

@router.get("/summary")
async def summary(attorney: dict = Depends(attorney_required)):
    now = _now()
    month_start = _month_floor(now)
    last_month_start = _month_floor(month_start - timedelta(days=1))

    atty_id = attorney["id"]

    # All-time paid out
    pipeline = [
        {"$match": {"attorney_id": atty_id, "status": {"$in": ["pending", "paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}},
    ]
    total_paid = 0
    async for row in db.payouts.aggregate(pipeline):
        total_paid = int(row.get("total") or 0)
        break

    total_cases = await db.case_assignments.count_documents(
        {"attorney_id": atty_id, "status": "completed"},
    )

    this_month_cents = await _sum_cents({
        "attorney_id": atty_id, "status": "completed",
        "completed_at": {"$gte": _iso(month_start)},
    })
    last_month_cents = await _sum_cents({
        "attorney_id": atty_id, "status": "completed",
        "completed_at": {"$gte": _iso(last_month_start), "$lt": _iso(month_start)},
    })
    growth = round(
        ((this_month_cents - last_month_cents) / last_month_cents * 100.0),
        1,
    ) if last_month_cents > 0 else 0.0

    this_month_count = await db.case_assignments.count_documents({
        "attorney_id": atty_id, "status": "completed",
        "completed_at": {"$gte": _iso(month_start)},
    })

    pending_cents = await _sum_cents({
        "attorney_id": atty_id, "status": "completed", "paid_out_at": None,
    })
    pending_count = await db.case_assignments.count_documents({
        "attorney_id": atty_id, "status": "completed", "paid_out_at": None,
    })

    return {
        "total_all_time": {
            "amount_cents": total_paid,
            "case_count": total_cases,
        },
        "this_month": {
            "amount_cents": this_month_cents,
            "growth_vs_last_month_percent": growth,
            "case_count": this_month_count,
        },
        "next_payout": {
            "amount_cents": pending_cents,
            "case_count": pending_count,
            "expected_date": _iso(_next_monday(now)),
        },
        "iban_last4": attorney.get("stripe_iban_last4"),
        "stripe_ready": bool(attorney.get("stripe_onboarding_completed")),
    }


# =========================================================================
# GET /attorneys/earnings/chart
# =========================================================================

@router.get("/chart")
async def chart(
    period: Literal["3m", "12m", "all"] = "12m",
    attorney: dict = Depends(attorney_required),
):
    months_back = {"3m": 3, "12m": 12, "all": 36}[period]
    now = _now()
    out = []
    for i in range(months_back):
        month_date = _month_floor(now) - timedelta(days=1)  # end of prior month
        month_date = _month_floor(month_date) if i > 0 else _month_floor(now)
        # Walk back `i` months safely
        y, m = now.year, now.month - i
        while m <= 0:
            m += 12
            y -= 1
        month_start = datetime(y, m, 1, tzinfo=timezone.utc)
        ny, nm = (y, m + 1) if m < 12 else (y + 1, 1)
        next_month = datetime(ny, nm, 1, tzinfo=timezone.utc)

        cents = await _sum_cents({
            "attorney_id": attorney["id"], "status": "completed",
            "completed_at": {"$gte": _iso(month_start), "$lt": _iso(next_month)},
        })
        out.append({
            "month": month_start.strftime("%Y-%m"),
            "month_label": month_start.strftime("%b %Y"),
            "amount_cents": cents,
            "is_current_month": (month_start.year == now.year and month_start.month == now.month),
        })
    return {"chart": list(reversed(out))}


# =========================================================================
# GET /attorneys/earnings/payouts
# =========================================================================

@router.get("/payouts")
async def payouts_history(
    limit: int = 20,
    attorney: dict = Depends(attorney_required),
):
    limit = max(1, min(limit, 100))
    rows = await db.payouts.find(
        {"attorney_id": attorney["id"]}, {"_id": 0},
    ).sort("created_at", -1).to_list(limit)
    return {"payouts": rows}
