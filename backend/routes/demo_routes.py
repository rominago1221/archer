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
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter()

ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "archer-admin-2026")


@router.post("/demo/seed")
async def run_demo_seed(secret: str = Query(...)):
    """Run scripts.seed_demo.seed_demo() in-process.
    Returns the demo credentials + a counts breakdown so the caller
    can confirm the seed landed."""
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    try:
        # Late import so the server doesn't crash at boot if scripts/ moves.
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

    # 1. Cleanup previous demo docs.
    del_users = await db.users.delete_many({"is_demo": True})
    del_attorneys = await db.attorneys.delete_many({"is_demo": True})
    del_cases = await db.cases.delete_many({"is_demo": True})
    del_listings = await db.case_marketplace.delete_many({"is_demo": True})

    # 2. Insert fresh docs.
    client_doc = build_client_user()
    attorney_doc = build_attorney()
    cases = build_cases(client_doc["user_id"])
    listings = build_marketplace_listings(cases)

    await db.users.insert_one(client_doc)
    await db.attorneys.insert_one(attorney_doc)
    if cases:
        await db.cases.insert_many(cases)
    if listings:
        await db.case_marketplace.insert_many(listings)

    logger.info("demo seed: accounts + data ready")

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
    }


@router.get("/demo/seed/status")
async def demo_seed_status(secret: str = Query(...)):
    """Quick check: does the demo data exist? Useful to confirm a seed without re-running."""
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    from db import db
    return {
        "users": await db.users.count_documents({"is_demo": True}),
        "attorneys": await db.attorneys.count_documents({"is_demo": True}),
        "cases": await db.cases.count_documents({"is_demo": True}),
        "listings": await db.case_marketplace.count_documents({"is_demo": True}),
    }
