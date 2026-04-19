"""
Create the 6 Stripe products + prices required by the credits + lawyer
subscription sprint. Prints the resulting price IDs so they can be
copied into `.env`:

    STRIPE_PRICE_SOLO_MONTHLY
    STRIPE_PRICE_PRO_MONTHLY
    STRIPE_PRICE_PACK_STARTER
    STRIPE_PRICE_PACK_POWER
    STRIPE_PRICE_PACK_MEGA
    STRIPE_PRICE_LAWYER_BE_MONTHLY

Usage (from the repo root):

    cd backend && python -m scripts.create_stripe_products

Prerequisites: STRIPE_API_KEY must be set (live or test). The script
is idempotent by product name — it reuses an existing product with the
same name, and attaches a new Price only if no price of the same
unit_amount+currency exists.
"""
from __future__ import annotations

import os
import sys
import logging
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

import stripe  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("create_stripe_products")

API_KEY = os.environ.get("STRIPE_API_KEY")
if not API_KEY:
    raise SystemExit("STRIPE_API_KEY not set — aborting. Create a test key first.")

stripe.api_key = API_KEY


SPEC = [
    # (name, interval_or_None_for_one_time, amount_cents, currency, env_name, description)
    ("Archer Solo",               "month", 2499, "eur", "STRIPE_PRICE_SOLO_MONTHLY",
     "Archer Solo monthly subscription — 1,000 credits/month"),
    ("Archer Pro",                "month", 8999, "eur", "STRIPE_PRICE_PRO_MONTHLY",
     "Archer Pro monthly subscription — 4,000 credits/month + Multi-Agent"),
    ("Archer Credits Starter",    None,    2999, "eur", "STRIPE_PRICE_PACK_STARTER",
     "Archer 1,000 credits pack"),
    ("Archer Credits Power",      None,    7999, "eur", "STRIPE_PRICE_PACK_POWER",
     "Archer 3,000 credits pack"),
    ("Archer Credits Mega",       None,   22999, "eur", "STRIPE_PRICE_PACK_MEGA",
     "Archer 10,000 credits pack"),
    ("Archer Partner BE",         "month", 9900, "eur", "STRIPE_PRICE_LAWYER_BE_MONTHLY",
     "Archer Partner monthly subscription (Belgium) — €99/month, 100% of fees, trial 30d via early_access"),
]


def _find_or_create_product(name: str, description: str) -> stripe.Product:
    existing = stripe.Product.list(limit=100, active=True)
    for p in existing.data:
        if p.name == name:
            log.info(f"Product exists: {name} → {p.id}")
            return p
    p = stripe.Product.create(name=name, description=description)
    log.info(f"Created product: {name} → {p.id}")
    return p


def _find_or_create_price(product: stripe.Product, amount: int, currency: str, interval: str | None) -> stripe.Price:
    prices = stripe.Price.list(product=product.id, active=True, limit=100)
    for pr in prices.data:
        same_amount = pr.unit_amount == amount and pr.currency == currency
        same_recur = bool(pr.recurring) == bool(interval) and (
            (interval is None) or (pr.recurring and pr.recurring["interval"] == interval)
        )
        if same_amount and same_recur:
            log.info(f"Price exists: {product.name} {amount}¢/{currency}/{interval or 'one_time'} → {pr.id}")
            return pr
    kwargs = dict(product=product.id, unit_amount=amount, currency=currency)
    if interval:
        kwargs["recurring"] = {"interval": interval}
    pr = stripe.Price.create(**kwargs)
    log.info(f"Created price: {product.name} {amount}¢ → {pr.id}")
    return pr


def main():
    print("\nAdd these to backend/.env :\n")
    for name, interval, amount, currency, env_name, description in SPEC:
        product = _find_or_create_product(name, description)
        price = _find_or_create_price(product, amount, currency, interval)
        print(f"{env_name}={price.id}")
    print("\nDone.\n")


if __name__ == "__main__":
    main()
