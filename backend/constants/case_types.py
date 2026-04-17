"""Single source of truth for Archer's case_type taxonomy.

17 specialised categories + 1 catch-all = 18 canonical values.
Every backend module (models, prompts, matching, API) and every frontend constant
must ultimately reconcile with this file.
"""
from typing import Literal, Tuple

# Canonical case_type identifiers. Everything else in the codebase must use these.
CASE_TYPES: Tuple[str, ...] = (
    # HOUSING
    "eviction",
    "real_estate",
    # EMPLOYMENT
    "wrongful_termination",
    "severance",
    "workplace_discrimination",
    "harassment",
    # FINANCIAL
    "consumer_disputes",
    "debt",
    "insurance_disputes",
    "tax_disputes",
    "identity_theft",
    # HEALTH
    "medical_malpractice",
    "disability_claims",
    # PERSONAL
    "family",
    "criminal",
    "immigration",
    "traffic",
    # CATCH-ALL
    "other",
)

CaseTypeLiteral = Literal[
    "eviction", "real_estate",
    "wrongful_termination", "severance", "workplace_discrimination", "harassment",
    "consumer_disputes", "debt", "insurance_disputes", "tax_disputes", "identity_theft",
    "medical_malpractice", "disability_claims",
    "family", "criminal", "immigration", "traffic",
    "other",
]


# Families for the frontend card-picker grid. Order matters for display.
CASE_TYPE_FAMILIES: Tuple[Tuple[str, Tuple[str, ...]], ...] = (
    ("housing",   ("eviction", "real_estate")),
    ("employment", ("wrongful_termination", "severance", "workplace_discrimination", "harassment")),
    ("financial", ("consumer_disputes", "debt", "insurance_disputes", "tax_disputes", "identity_theft")),
    ("health",    ("medical_malpractice", "disability_claims")),
    ("personal",  ("family", "criminal", "immigration", "traffic")),
    ("catchall",  ("other",)),
)


# Map legacy values (historical DB rows + old prompt enums) to canonical values.
# Applied by the Case model validator on read/write so historical cases remain queryable.
LEGACY_ALIASES = {
    # Legacy singular types that are subsumed into broader new ones
    "housing": "eviction",            # old umbrella → most common specific
    "nda": "other",                   # NDA specific type dropped — reclassify per input
    "contract": "other",              # same — user will hit 'other' when unsure
    "demand": "debt",                 # demand letters are almost always debt-related
    "court": "other",                 # court notices can be any domain
    "penal": "criminal",              # Belgian term → canonical
    "commercial": "other",            # commercial disputes too broad for the new taxonomy
    "insurance": "insurance_disputes",  # old name → new canonical
    "tenant_dispute": "eviction",
    "consumer": "consumer_disputes",
    "consumer_refund": "consumer_disputes",
    "insurance_claim": "insurance_disputes",
    "contract_dispute": "other",
    "family_law": "family",
    "speeding_ticket": "traffic",
    "administrative": "other",
    "civil": "other",
    "employment": "wrongful_termination",  # legacy generic employment → most common subtype
}


def normalize_case_type(value: str) -> str:
    """Return the canonical case_type for a raw input.
    Unknown values fall back to 'other' — never raises."""
    if value is None:
        return "other"
    v = str(value).strip().lower()
    if v in CASE_TYPES:
        return v
    if v in LEGACY_ALIASES:
        return LEGACY_ALIASES[v]
    return "other"


def is_known_case_type(value: str) -> bool:
    return value in CASE_TYPES


# Used by PASS 1 prompts to constrain case_type detection.
CASE_TYPES_PIPE = "|".join(CASE_TYPES)
