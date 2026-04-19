"""
Credit system constants — single source of truth for credit costs, tier
entitlements, and pack definitions.

COMMERCIAL SECRET: credit costs per action are deliberately NOT exposed on the
client. Frontend shows totals only; labels in the history feed are generic
("Analyse", "Affinement"). Every lookup must go through the server.
"""
from __future__ import annotations


# ── Tier monthly entitlement (hard-reset on 1st of month, 00:00 UTC) ──
# Free is one-time at signup and does NOT reset.
TIER_CREDITS: dict[str, int] = {
    "free": 500,
    "solo": 1000,
    "pro":  4000,
}

# Multi-Agent Debate is auto-included for Pro users.
PRO_AUTO_MULTI_AGENT = True


# ── Cost per action (hidden from client) ──
CREDIT_COSTS: dict[str, int] = {
    "analysis_standard":   200,   # 1 doc, < 5 pages, text-only
    "analysis_medium":     400,   # 1 doc, 5-20 pages or > 8k chars
    "analysis_multi_doc":  600,   # 2+ documents
    "ocr_premium":         100,   # +100 when a scan/photo is detected
    "multi_agent_pro":     300,   # +300 auto for Pro-tier analyses
    "refinement":          200,
    "switch_jurisdiction": 0,     # intentionally free
}


# ── Credit packs (one-time purchases, never reset) ──
# Every pack has a code (internal), price, and a Stripe price env var name.
# Real Stripe price IDs are resolved at runtime via os.environ so we do not
# need to hard-code them here — the launch script populates them.
CREDIT_PACKS: list[dict] = [
    {
        "code":        "starter",
        "name":        "1,000 crédits Archer",
        "credits":     1000,
        "price_eur":   29.99,
        "price_usd":   32.99,
        "stripe_env":  "STRIPE_PRICE_PACK_STARTER",
    },
    {
        "code":        "power",
        "name":        "3,000 crédits Archer",
        "credits":     3000,
        "price_eur":   79.99,
        "price_usd":   87.99,
        "stripe_env":  "STRIPE_PRICE_PACK_POWER",
    },
    {
        "code":        "mega",
        "name":        "10,000 crédits Archer",
        "credits":     10000,
        "price_eur":   229.99,
        "price_usd":   249.99,
        "stripe_env":  "STRIPE_PRICE_PACK_MEGA",
    },
]


def get_pack(code: str) -> dict | None:
    for p in CREDIT_PACKS:
        if p["code"] == code:
            return p
    return None


# ── Labels surfaced in the public history feed ──
# Keep these generic: never reveal per-action cost or internal action_type.
HISTORY_LABELS: dict[str, dict[str, str]] = {
    # (source, fallback) → {en, fr}
    "analysis":            {"en": "Analysis",             "fr": "Analyse"},
    "refinement":          {"en": "Refinement",           "fr": "Affinement"},
    "pack_purchase":       {"en": "Pack purchased",       "fr": "Pack acheté"},
    "subscription_renewal":{"en": "Subscription renewal", "fr": "Renouvellement abonnement"},
    "monthly_reset":       {"en": "Monthly reset",        "fr": "Réinitialisation mensuelle"},
    "migration_bonus":     {"en": "Welcome bonus",        "fr": "Bonus de bienvenue"},
    "refund":              {"en": "Refund",               "fr": "Remboursement"},
}


def history_label(source: str, language: str = "en") -> str:
    entry = HISTORY_LABELS.get(source)
    if not entry:
        return source
    return entry.get(language[:2], entry["en"])
