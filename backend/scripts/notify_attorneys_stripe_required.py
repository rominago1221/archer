"""Pre-flip email blast to attorneys without Stripe Connect onboarding.

Run this BEFORE flipping REQUIRE_STRIPE_ONBOARDING=true.
All active attorneys with stripe_onboarding_completed=False receive a 7-day
deadline email with a direct link to the onboarding page.

Usage:
  python backend/scripts/notify_attorneys_stripe_required.py              # dry-run
  python backend/scripts/notify_attorneys_stripe_required.py --send       # actually send
  python backend/scripts/notify_attorneys_stripe_required.py --send --deadline-days 14
"""
from __future__ import annotations
import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db import db  # noqa: E402
from routes.attorney_routes import send_email  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("notify_attorneys_stripe_required")


def _app_url() -> str:
    return os.environ.get("APP_URL", "https://archer.legal").rstrip("/")


def _build_email(attorney: dict, deadline_date: datetime) -> tuple[str, str]:
    url = f"{_app_url()}/attorneys/onboarding/stripe"
    deadline_str = deadline_date.strftime("%d %B %Y")
    first = attorney.get("first_name") or ""
    subject = "Action requise : configurez Stripe pour continuer à recevoir des cases"
    html = (
        f"<p>Maître {first},</p>"
        f"<p>Pour continuer à recevoir des cases sur Archer et être payé automatiquement "
        f"chaque lundi, vous devez configurer votre compte Stripe Connect.</p>"
        f"<p><b>⏰ Deadline : {deadline_str}</b></p>"
        f"<p>Après cette date, les cases ne seront plus attribuées aux avocats "
        f"sans compte Stripe configuré.</p>"
        f"<p>La configuration prend environ 2 minutes :</p>"
        f"<ul>"
        f"<li>Vérification d'identité (KYC)</li>"
        f"<li>Ajout de votre IBAN</li>"
        f"<li>Activation des versements automatiques</li>"
        f"</ul>"
        f"<p style=\"margin: 24px 0;\">"
        f"<a href=\"{url}\" "
        f"style=\"display: inline-block; background: #635bff; color: white; "
        f"text-decoration: none; padding: 12px 24px; border-radius: 8px; "
        f"font-weight: 500;\">Configurer Stripe maintenant →</a>"
        f"</p>"
        f"<p>Si vous avez déjà commencé l'onboarding et qu'il n'est pas encore validé, "
        f"cliquez sur le même lien pour reprendre là où vous en étiez.</p>"
        f"<p>L'équipe Archer</p>"
    )
    return subject, html


async def notify_all(dry_run: bool, deadline_days: int) -> dict:
    deadline = datetime.now(timezone.utc) + timedelta(days=deadline_days)

    cursor = db.attorneys.find(
        {"status": "active",
         "$or": [
             {"stripe_onboarding_completed": False},
             {"stripe_onboarding_completed": {"$exists": False}},
         ]},
        {"_id": 0, "id": 1, "email": 1, "first_name": 1, "last_name": 1,
         "stripe_account_id": 1, "stripe_onboarding_started_at": 1},
    )
    attorneys = await cursor.to_list(1000)

    stats = {"total": len(attorneys), "sent": 0, "skipped_no_email": 0, "errors": 0}
    logger.info(f"Found {len(attorneys)} active attorneys without Stripe completed.")
    for a in attorneys:
        email = a.get("email")
        if not email:
            stats["skipped_no_email"] += 1
            continue
        started = "started onboarding" if a.get("stripe_onboarding_started_at") else "never started"
        name = f"{a.get('first_name','')} {a.get('last_name','')}".strip() or email
        logger.info(f"  • {name} <{email}> ({started})")
        if dry_run:
            continue
        try:
            subject, html = _build_email(a, deadline)
            await send_email(email, subject, html)
            stats["sent"] += 1
        except Exception as e:
            stats["errors"] += 1
            logger.error(f"    email failed for {email}: {e}")

    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--send", action="store_true",
                        help="Actually send emails. Default is dry-run (list only).")
    parser.add_argument("--deadline-days", type=int, default=7,
                        help="Days until REQUIRE_STRIPE_ONBOARDING flips (default 7).")
    args = parser.parse_args()

    dry = not args.send
    stats = asyncio.run(notify_all(dry_run=dry, deadline_days=args.deadline_days))

    print("")
    print("=" * 60)
    mode = "DRY-RUN" if dry else "SEND"
    print(f"{mode} summary — deadline: {args.deadline_days} days")
    print(f"  Total attorneys without Stripe : {stats['total']}")
    if not dry:
        print(f"  Emails sent                    : {stats['sent']}")
        print(f"  Errors                         : {stats['errors']}")
    print(f"  Skipped (no email)             : {stats['skipped_no_email']}")
    print("=" * 60)
    if dry:
        print("\n→ Re-run with --send to actually send.")


if __name__ == "__main__":
    main()
