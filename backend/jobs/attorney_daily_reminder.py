"""Daily 09:00 UTC email — each active attorney with
`email_preferences.daily_reminder != false` gets a digest of available
qualified cases + an "unsubscribe" link.

Runs only when there is at least one available listing in the marketplace.
The email is FR-only for now (Belgium-only freeze). Max 5 cases inline
+ "see all" CTA for the rest.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from db import db

logger = logging.getLogger(__name__)


APP_URL = os.environ.get("APP_URL", "https://archer.legal").rstrip("/")


def _bar_line(attorney: dict) -> str:
    last = attorney.get("last_name") or attorney.get("first_name") or ""
    return f"Me {last}".strip() or attorney.get("email") or "Confrère"


def _hours_left(expires_at: str | None) -> int:
    if not expires_at:
        return 72
    try:
        ts = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    except Exception:
        return 72
    delta = ts - datetime.now(timezone.utc)
    return max(0, int(delta.total_seconds() / 3600))


def _stakes_label(stakes: int | float | None) -> str:
    if not stakes:
        return "—"
    try:
        n = int(stakes)
    except (TypeError, ValueError):
        return "—"
    if n >= 10_000:
        return f"€{n // 1000}k"
    return f"€{n:,}".replace(",", ".")


def _price_eur(price_cents: int | None) -> int:
    try:
        return int(price_cents or 0) // 100
    except (TypeError, ValueError):
        return 0


def _case_row_html(c: dict) -> str:
    hours = _hours_left(c.get("expires_at"))
    urgency = (
        f"Expire dans {hours}h"
        if hours < 24
        else (c.get("region") or "Belgique")
    )
    icon = c.get("case_type_icon") or "📁"
    title = c.get("title") or (c.get("case_type_label") or "Dossier qualifié")
    type_label = c.get("case_type_label") or (c.get("case_type") or "").title()
    stakes = _stakes_label(c.get("financial_stakes"))
    price = _price_eur(c.get("price_cents"))
    return f"""
<tr style="border-bottom:1px solid #e4e6eb">
  <td style="padding:14px 0;width:36px"><span style="font-size:18px">{icon}</span></td>
  <td style="padding:14px 12px">
    <div style="font-weight:600;color:#222a38;font-size:14px">{title}</div>
    <div style="color:#6b7a8d;font-size:12px;margin-top:2px">{type_label} · {urgency}</div>
  </td>
  <td style="padding:14px 0;text-align:center;width:110px">
    <div style="font-weight:700;color:#222a38;font-size:15px">{stakes}</div>
    <div style="color:#6b7a8d;font-size:11px">enjeu</div>
  </td>
  <td style="padding:14px 0;text-align:right;width:90px">
    <span style="display:inline-block;padding:7px 14px;background:#222a38;color:white;border-radius:6px;font-weight:700;font-size:13px">€{price}</span>
  </td>
</tr>"""


async def send_daily_attorney_reminders() -> dict:
    """Cron callable. Returns a stats dict: { attorneys_emailed, available }."""
    # Lazy import of send_email to avoid circular import at module load.
    try:
        from routes.attorney_routes import send_email
    except Exception as e:
        logger.error(f"daily reminder: cannot import send_email ({e})")
        return {"attorneys_emailed": 0, "available": 0, "error": "import"}

    # 1. Gather available listings once — shared across all emails.
    available = await db.case_marketplace.find(
        {"status": "available", "country": "BE"},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)

    if not available:
        logger.info("daily reminder: no listings available, skipping blast")
        return {"attorneys_emailed": 0, "available": 0}

    cases_top5 = available[:5]
    remaining = max(0, len(available) - len(cases_top5))

    # 2. Fetch opted-in active attorneys (BE-only per freeze).
    attorneys_cursor = db.attorneys.find(
        {
            "status": "active",
            "$or": [
                {"email_preferences.daily_reminder": {"$ne": False}},
                {"email_preferences": {"$exists": False}},
            ],
        },
        {"_id": 0, "id": 1, "email": 1, "first_name": 1, "last_name": 1, "jurisdiction": 1},
    )
    attorneys = await attorneys_cursor.to_list(2000)

    # Build shared table HTML once — same for every recipient.
    rows_html = "\n".join(_case_row_html(c) for c in cases_top5)
    plus_text = (
        f'<p style="color:#6b7a8d;font-size:13px;margin-top:18px">+ {remaining} autres dossiers sur votre portail.</p>'
        if remaining > 0 else ""
    )
    settings_url = f"{APP_URL}/attorneys/profile"
    desk_url = f"{APP_URL}/attorneys/desk"

    emailed = 0
    for a in attorneys:
        email = a.get("email")
        if not email:
            continue
        if (a.get("jurisdiction") or "").upper() not in ("", "BE"):
            continue  # Only BE attorneys during freeze.
        name_line = _bar_line(a)
        html = f"""
<div style="max-width:620px;margin:0 auto;font-family:-apple-system,Segoe UI,sans-serif">
  <div style="padding:28px 0 18px;border-bottom:2px solid #222a38">
    <span style="font-size:22px;font-weight:800;color:#222a38">Archer</span>
    <span style="font-size:11px;color:#9a7b4f;font-weight:700;letter-spacing:1px;margin-left:8px">PORTAIL AVOCAT</span>
  </div>
  <div style="padding:26px 0">
    <h1 style="font-size:22px;font-weight:700;color:#222a38;margin:0 0 8px">Bonjour {name_line},</h1>
    <p style="font-size:15px;color:#5c6478;line-height:1.55;margin:0">
      <strong style="color:#222a38">{len(available)} dossiers qualifiés</strong> sont disponibles ce matin. Premier arrivé, premier servi.
    </p>
  </div>
  <table style="width:100%;border-collapse:collapse">
    {rows_html}
  </table>
  {plus_text}
  <div style="margin-top:28px;text-align:center">
    <a href="{desk_url}" style="display:inline-block;padding:14px 32px;background:#222a38;color:white;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">
      Voir tous les dossiers
    </a>
  </div>
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e4e6eb;text-align:center">
    <p style="font-size:11px;color:#8b93a5;margin:0">
      Archer — Portail Avocat ·
      <a href="{settings_url}" style="color:#9a7b4f;text-decoration:none">Gérer mes notifications</a>
    </p>
  </div>
</div>
"""
        try:
            await send_email(
                to=email,
                subject=f"{len(available)} dossiers disponibles — Archer",
                html_body=html,
            )
            emailed += 1
        except Exception as e:
            logger.error(f"daily reminder: send to {email} failed ({e})")

    logger.info(f"daily reminder: {emailed}/{len(attorneys)} attorneys emailed ({len(available)} listings)")
    return {"attorneys_emailed": emailed, "available": len(available)}
