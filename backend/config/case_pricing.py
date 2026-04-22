"""Prix (centimes EUR) pour debloquer un dossier dans la marketplace avocat.

Les avocats payent un montant fixe par type de dossier pour acceder aux
donnees client completes (nom, contact, documents, analyse IA complete).
Les prix sont calibres selon la complexite et la valeur typique du dossier.

Usage:
    from config.case_pricing import get_case_price, get_case_price_display
    cents = get_case_price("housing")       # 8000
    label = get_case_price_display("housing")  # "€80"
"""
from __future__ import annotations

# Canonical prices in cents (EUR).
CASE_TYPE_PRICES: dict[str, int] = {
    # Routier — simple, fort volume
    "traffic":       5000,   # €50
    "driving":       5000,

    # Consommation / telecom / achat
    "consumer":      6000,   # €60
    "consumer_disputes": 6000,
    "telecom":       6000,
    "purchase":      6000,

    # Logement / bail / immobilier
    "housing":       8000,   # €80
    "rental":        8000,
    "lease":         8000,
    "eviction":      8000,
    "real_estate":  10000,   # €100

    # Travail
    "employment":           12000,  # €120
    "labor":                12000,
    "dismissal":            15000,  # €150
    "workplace":            10000,
    "wrongful_termination": 15000,
    "severance":            12000,
    "workplace_discrimination": 12000,
    "harassment":           12000,

    # Famille / couple
    "family":     15000,   # €150
    "divorce":    20000,   # €200
    "custody":    18000,   # €180

    # Penal
    "criminal": 15000,
    "penal":    15000,

    # Contrats / commercial
    "contract":   8000,
    "commercial": 10000,

    # Sante / assurance / dette / banque / succession / voisinage
    "insurance":          8000,
    "insurance_disputes": 8000,
    "banking":           10000,
    "debt":               6000,
    "tax_disputes":       8000,
    "identity_theft":     6000,
    "medical":           12000,
    "medical_malpractice": 12000,
    "disability_claims":  8000,
    "inheritance":       15000,
    "neighbor":           5000,
    "immigration":       10000,

    # Fallbacks
    "other":    8000,
    "general":  8000,
}

# Conservative fallback when an unknown case_type lands in the marketplace.
DEFAULT_PRICE_CENTS = 8000


def _normalize(case_type: str | None) -> str:
    return (case_type or "other").strip().lower().replace("-", "_").replace(" ", "_")


def get_case_price(case_type: str | None) -> int:
    """Return unlock price in cents for a given case_type (unknown → default)."""
    return CASE_TYPE_PRICES.get(_normalize(case_type), DEFAULT_PRICE_CENTS)


def get_case_price_display(case_type: str | None) -> str:
    """Return the price as a short human label, e.g. "€80"."""
    cents = get_case_price(case_type)
    whole = cents // 100
    remainder = cents % 100
    if remainder == 0:
        return f"€{whole}"
    return f"€{whole}.{remainder:02d}"


def risk_level_for_score(score: int | None) -> str:
    """3-bucket risk level used by the marketplace UI badge colour."""
    try:
        s = int(score or 0)
    except (TypeError, ValueError):
        s = 0
    if s <= 30:
        return "low"
    if s <= 60:
        return "mid"
    return "high"
