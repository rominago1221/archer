#!/usr/bin/env python3
"""Seed initial admin account.

Usage:
    ADMIN_INITIAL_PASSWORD=your-strong-password python backend/scripts/seed_admin.py

Idempotent: skips if romain@archer.law already exists.
"""
import os
import sys
import uuid
import asyncio
from pathlib import Path
from datetime import datetime, timezone

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

ADMIN_EMAIL = "romain@archer.law"
ADMIN_NAME = "Romain Debecq"


async def main():
    password = os.environ.get("ADMIN_INITIAL_PASSWORD")
    if not password:
        print("ERROR: Set ADMIN_INITIAL_PASSWORD env var")
        sys.exit(1)
    if len(password) < 12:
        print("ERROR: Password must be at least 12 characters")
        sys.exit(1)

    from db import db
    from utils.admin_auth import hash_password

    existing = await db.admins.find_one({"email": ADMIN_EMAIL})
    if existing:
        print(f"Admin {ADMIN_EMAIL} already exists (id={existing.get('id')}). Skipping.")
        return

    admin_doc = {
        "id": f"admin_{uuid.uuid4().hex[:12]}",
        "email": ADMIN_EMAIL,
        "password_hash": hash_password(password),
        "full_name": ADMIN_NAME,
        "role": "super_admin",
        "is_active": True,
        "last_login_at": None,
        "totp_secret": None,
        "totp_enabled": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admins.insert_one(admin_doc)
    print(f"Admin created: {ADMIN_EMAIL} (id={admin_doc['id']})")
    print("Change password after first login via POST /api/admin/auth/change-password")

    # Create unique index
    await db.admins.create_index("email", unique=True)
    await db.admin_audit_log.create_index("created_at")
    print("Indexes created.")


if __name__ == "__main__":
    asyncio.run(main())
