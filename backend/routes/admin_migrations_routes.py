"""
Admin-only endpoints for running the credits + lawyer subscription
migrations in production (or any hosted env) without shell access.

    POST /api/admin/migrate/credits   → seed credit balances for all users
    POST /api/admin/migrate/lawyers   → seed subscription fields for all attorneys

Both protected by `admin_required`. Both idempotent — safe to re-run.
Every run appends a row to `admin_audit_log` (via `log_admin_action`).

The underlying functions live in `backend/scripts/*.py` and are imported
directly so we keep a single source of truth.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from utils.admin_auth import admin_required, log_admin_action

from scripts.migrate_to_credits import migrate_existing_users
from scripts.migrate_lawyers_to_subscription import migrate_existing_lawyers

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/migrate")


@router.post("/credits")
async def admin_migrate_credits(admin: dict = Depends(admin_required)) -> dict[str, Any]:
    """
    Seed `credit_balances` for every user who doesn't have one yet.
    Free users get 500 subscription credits + 500 pack migration bonus.
    Solo → 1 000 sub + 500 bonus. Pro → 4 000 sub + 500 bonus + lifetime
    welcome_live_counsel perk (unless the user already had one).

    Idempotent. Already-migrated users are skipped.
    """
    logger.info(f"[admin-migrate] credits started by admin={admin.get('email')}")
    try:
        result = await migrate_existing_users()
    except Exception as e:
        logger.exception("Credits migration crashed")
        raise HTTPException(status_code=500, detail=f"Migration crashed: {e}")

    await log_admin_action(
        admin=admin,
        action="migrate_credits",
        entity_type="user",
        entity_id=None,
        metadata=result,
    )
    logger.info(
        f"[admin-migrate] credits done — total={result.get('total')} "
        f"migrated={result.get('migrated')} skipped={result.get('skipped')} "
        f"failed={result.get('failed')}"
    )
    return {
        "ok":       True,
        "stats":    result,
        "admin":    admin.get("email"),
        "message":  (
            f"Migrated {result.get('migrated', 0)} users; "
            f"skipped {result.get('skipped', 0)} (already had a balance); "
            f"{result.get('failed', 0)} failures."
        ),
    }


@router.post("/lawyers")
async def admin_migrate_lawyers(admin: dict = Depends(admin_required)) -> dict[str, Any]:
    """
    Initialise subscription fields on every attorney:
        subscription_status=inactive, early_access=True,
        is_active_for_routing=False, …

    Attorneys who already have a `subscription_status` are skipped.
    Returns the list of migrated attorney IDs so the admin can cross-check.
    """
    logger.info(f"[admin-migrate] lawyers started by admin={admin.get('email')}")
    try:
        result = await migrate_existing_lawyers()
    except Exception as e:
        logger.exception("Lawyers migration crashed")
        raise HTTPException(status_code=500, detail=f"Migration crashed: {e}")

    await log_admin_action(
        admin=admin,
        action="migrate_lawyers",
        entity_type="attorney",
        entity_id=None,
        metadata={k: v for k, v in result.items() if k != "ids"},
    )
    logger.info(
        f"[admin-migrate] lawyers done — total={result.get('total')} "
        f"migrated={result.get('migrated')} skipped={result.get('skipped')}"
    )
    return {
        "ok":       True,
        "stats":    {k: v for k, v in result.items() if k != "ids"},
        "migrated_ids": result.get("ids", []),
        "admin":    admin.get("email"),
        "message":  (
            f"Migrated {result.get('migrated', 0)} attorneys with early_access=True; "
            f"skipped {result.get('skipped', 0)} (already migrated)."
        ),
    }
