"""Create an attorney invitation code.

Usage:
  python backend/scripts/create_attorney_invitation.py --email marc@cabinet.be \\
      --first-name Marc --last-name Delcourt

Prints the signup URL to share with the attorney.
"""
import argparse
import asyncio
import secrets
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Make `backend/` importable whether invoked from repo root or backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db import db  # noqa: E402


async def create(email: str, first_name: str | None, last_name: str | None,
                 admin: str, app_url: str, days_valid: int) -> dict:
    code = secrets.token_urlsafe(12)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=days_valid)
    doc = {
        "id": secrets.token_urlsafe(8),
        "code": code,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "created_by": admin,
        "used": False,
        "used_at": None,
        "attorney_id": None,
        "expires_at": expires_at.isoformat(),
        "created_at": now.isoformat(),
    }
    await db.attorney_invitations.insert_one(doc)
    return {"code": code, "expires_at": expires_at, "url": f"{app_url}/attorneys/join?code={code}"}


def main():
    import os
    parser = argparse.ArgumentParser(description="Create an attorney invitation")
    parser.add_argument("--email", required=True)
    parser.add_argument("--first-name", required=False, default=None)
    parser.add_argument("--last-name", required=False, default=None)
    parser.add_argument("--admin", default=os.environ.get("ADMIN_NOTIFY_EMAIL", "romain@archer.legal"))
    parser.add_argument("--app-url", default=os.environ.get("APP_URL", "https://archer.legal"))
    parser.add_argument("--days", type=int, default=30)
    args = parser.parse_args()

    result = asyncio.run(create(
        args.email, args.first_name, args.last_name,
        args.admin, args.app_url, args.days,
    ))
    print("")
    print(f"✅ Invitation créée pour {args.email}")
    print("")
    print(f"Code     : {result['code']}")
    print(f"URL      : {result['url']}")
    print(f"Expire le: {result['expires_at'].strftime('%Y-%m-%d')}")
    print("")


if __name__ == "__main__":
    main()
