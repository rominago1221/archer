"""One-shot demo seed endpoint — lets us seed the demo accounts on a
remote environment (preview / staging) without shell access.

Usage from the browser / curl:
    POST /api/demo/seed?secret=<ADMIN_SECRET>

The handler runs the same logic as `python scripts/seed_demo.py`:
  - Deletes all docs flagged `is_demo: true` (idempotent re-run)
  - Inserts demo client (db.users), demo attorney (db.attorneys),
    5 cases (db.cases), 5 marketplace listings (db.case_marketplace)

Gated by the existing ADMIN_SECRET env var. Not exposed without the
matching secret — safe to leave in the codebase once the demo is over.
"""
from __future__ import annotations

import logging
import os
import re
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter()

ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "archer-admin-2026")


def _email_ci(email: str) -> dict:
    """Case-insensitive equality match for an email (Mongo regex)."""
    return {"$regex": f"^{re.escape(email)}$", "$options": "i"}


async def _run_seed(secret: str):
    """Shared impl used by both POST and GET variants."""
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    try:
        from scripts.seed_demo import (
            build_client_user,
            build_attorney,
            build_cases,
            build_marketplace_listings,
            CLIENT_EMAIL,
            ATTORNEY_EMAIL,
            DEMO_PASSWORD,
        )
        from db import db
    except Exception as e:
        logger.exception("demo seed: failed to import seed script")
        raise HTTPException(status_code=500, detail=f"Seed module not available: {e}")

    # Clean by is_demo flag AND by demo email (case-insensitive). The email
    # cleanup catches stale docs left over by older seed versions that did
    # not set is_demo, or by manual fixtures stored with mixed-case emails.
    # Without this, the unique email index on db.attorneys makes the insert
    # below fail with DuplicateKeyError → 500 → login broken.
    del_users = await db.users.delete_many(
        {"$or": [{"is_demo": True}, {"email": _email_ci(CLIENT_EMAIL)}]}
    )
    del_attorneys = await db.attorneys.delete_many(
        {"$or": [{"is_demo": True}, {"email": _email_ci(ATTORNEY_EMAIL)}]}
    )
    del_cases = await db.cases.delete_many({"is_demo": True})
    del_listings = await db.case_marketplace.delete_many({"is_demo": True})

    client_doc = build_client_user()
    attorney_doc = build_attorney()
    cases = build_cases(client_doc["user_id"])
    listings = build_marketplace_listings(cases)

    # Defensive insert — replace_one upsert handles any leftover doc that
    # somehow survived the deletion (e.g., custom collation on the index).
    await db.users.replace_one({"email": CLIENT_EMAIL}, client_doc, upsert=True)
    await db.attorneys.replace_one({"email": ATTORNEY_EMAIL}, attorney_doc, upsert=True)
    if cases:
        await db.cases.insert_many(cases)
    if listings:
        await db.case_marketplace.insert_many(listings)

    # Verify the demo attorney is now in the right shape for /attorneys/login.
    fresh = await db.attorneys.find_one(
        {"email": ATTORNEY_EMAIL},
        {"_id": 0, "email": 1, "id": 1, "status": 1, "password_hash": 1, "is_demo": 1},
    )
    attorney_check = {
        "found": fresh is not None,
        "email": fresh.get("email") if fresh else None,
        "id": fresh.get("id") if fresh else None,
        "status": fresh.get("status") if fresh else None,
        "is_demo": fresh.get("is_demo") if fresh else None,
        "password_hash_prefix": (fresh.get("password_hash", "") or "")[:7] if fresh else None,
        "password_hash_len": len(fresh.get("password_hash", "")) if fresh else 0,
    }

    logger.info("demo seed: accounts + data ready — attorney_check=%s", attorney_check)
    return {
        "ok": True,
        "deleted": {
            "users": del_users.deleted_count,
            "attorneys": del_attorneys.deleted_count,
            "cases": del_cases.deleted_count,
            "listings": del_listings.deleted_count,
        },
        "inserted": {
            "users": 1,
            "attorneys": 1,
            "cases": len(cases),
            "listings": len(listings),
        },
        "credentials": {
            "client": {"email": CLIENT_EMAIL, "password": DEMO_PASSWORD},
            "attorney": {"email": ATTORNEY_EMAIL, "password": DEMO_PASSWORD},
        },
        "attorney_check": attorney_check,
    }


@router.get("/demo/seed")
async def run_demo_seed_get(secret: str = Query(...)):
    """GET variant for browser/URL execution — same behavior as POST."""
    return await _run_seed(secret)


@router.post("/demo/seed")
async def run_demo_seed(secret: str = Query(...)):
    """POST variant (kept for curl / API callers)."""
    return await _run_seed(secret)


@router.get("/demo/seed/status")
async def demo_seed_status(secret: str = Query(...)):
    """Quick check: does the demo data exist? Also dumps the demo attorney
    fingerprint (without password hash) so we can debug login issues without
    redeploying."""
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    from db import db
    from scripts.seed_demo import ATTORNEY_EMAIL, CLIENT_EMAIL

    attorney = await db.attorneys.find_one(
        {"email": _email_ci(ATTORNEY_EMAIL)},
        {"_id": 0, "email": 1, "id": 1, "status": 1, "is_demo": 1, "password_hash": 1},
    )
    user = await db.users.find_one(
        {"email": _email_ci(CLIENT_EMAIL)},
        {"_id": 0, "email": 1, "user_id": 1, "is_demo": 1, "password_hash": 1},
    )
    return {
        "counts": {
            "users_is_demo": await db.users.count_documents({"is_demo": True}),
            "attorneys_is_demo": await db.attorneys.count_documents({"is_demo": True}),
            "cases_is_demo": await db.cases.count_documents({"is_demo": True}),
            "listings_is_demo": await db.case_marketplace.count_documents({"is_demo": True}),
        },
        "attorney": {
            "found": attorney is not None,
            "email": attorney.get("email") if attorney else None,
            "id": attorney.get("id") if attorney else None,
            "status": attorney.get("status") if attorney else None,
            "is_demo": attorney.get("is_demo") if attorney else None,
            "password_hash_prefix": (attorney.get("password_hash", "") or "")[:7] if attorney else None,
            "password_hash_len": len(attorney.get("password_hash", "")) if attorney else 0,
        },
        "client": {
            "found": user is not None,
            "email": user.get("email") if user else None,
            "user_id": user.get("user_id") if user else None,
            "is_demo": user.get("is_demo") if user else None,
            "password_hash_prefix": (user.get("password_hash", "") or "")[:7] if user else None,
        },
    }


@router.post("/demo/login-probe")
async def demo_login_probe(secret: str = Query(...)):
    """Reproduce the attorney login pipeline locally and report exactly which
    step fails — no need to wait for a redeploy + curl + UI feedback loop.

    Returns a JSON breakdown: doc found, password_hash present, verify_password
    succeeds, status check. Pinpoints the exact reason `/attorneys/login` would
    return 401 for the demo credentials.
    """
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    from db import db
    from scripts.seed_demo import ATTORNEY_EMAIL, DEMO_PASSWORD
    from utils.attorney_auth import verify_password

    by_lower = await db.attorneys.find_one({"email": ATTORNEY_EMAIL.lower()}, {"_id": 0})
    by_exact = await db.attorneys.find_one({"email": ATTORNEY_EMAIL}, {"_id": 0})
    by_ci = await db.attorneys.find_one({"email": _email_ci(ATTORNEY_EMAIL)}, {"_id": 0})

    chosen = by_lower or by_exact
    pwd_ok = None
    if chosen:
        pwd_ok = bool(verify_password(DEMO_PASSWORD, chosen.get("password_hash", "")))

    return {
        "lookup": {
            "by_lower": bool(by_lower),
            "by_exact": bool(by_exact),
            "by_case_insensitive": bool(by_ci),
        },
        "found_doc": {
            "email": chosen.get("email") if chosen else None,
            "id": chosen.get("id") if chosen else None,
            "status": chosen.get("status") if chosen else None,
            "is_demo": chosen.get("is_demo") if chosen else None,
            "password_hash_prefix": (chosen.get("password_hash", "") or "")[:7] if chosen else None,
        } if chosen else None,
        "verify_password_result": pwd_ok,
        "status_active": (chosen.get("status") == "active") if chosen else None,
        "expected_login_outcome": (
            "200 OK" if (chosen and pwd_ok and chosen.get("status") == "active")
            else "401 (no doc)" if not chosen
            else "401 (bad password)" if pwd_ok is False
            else "403 (status not active)" if chosen and chosen.get("status") != "active"
            else "unknown"
        ),
    }
