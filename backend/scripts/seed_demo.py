"""Seed demo accounts + data for the live demo.

Usage:
    cd backend
    python scripts/seed_demo.py

Creates:
  - 1 client user         (db.users)          demo-client@archer.law  / Archer2026!
  - 1 attorney             (db.attorneys)      demo-avocat@archer.law  / Archer2026!
  - 5 cases for the client (db.cases)          — 3 active, 1 analyzing, 1 resolved
  - 5 marketplace listings (db.case_marketplace) — 4 available, 1 locked

All seeded docs carry `is_demo: true` so a re-run cleans up before inserting.

Idempotent: safe to run multiple times.
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Make the backend package importable when running this script standalone.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from db import db  # noqa: E402
from auth import hash_password  # noqa: E402


def _iso(d: datetime) -> str:
    return d.isoformat()


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ══════════════════════════════════════════════════════════════════════════
# Docs — built inside main() so timestamps stay close to "now" at run time.
# ══════════════════════════════════════════════════════════════════════════

CLIENT_EMAIL = "demo-client@archer.law"
ATTORNEY_EMAIL = "demo-avocat@archer.law"
DEMO_PASSWORD = "Archer2026!"


def build_client_user() -> dict:
    now = _now()
    return {
        "user_id": "user_demo_client",
        "email": CLIENT_EMAIL,
        "name": "Marie Dupont",
        "picture": None,
        "password_hash": hash_password(DEMO_PASSWORD),
        "auth_provider": "email",
        # Use "pro" (highest active tier in codebase). The UI reads `plan`,
        # not `subscription_tier`. `plan != "free"` unlocks marketplace publish.
        "plan": "pro",
        "subscription_status": "active",
        "country": "BE",
        "jurisdiction": "BE",
        "region": "Bruxelles-Capitale",
        "language": "fr",
        "account_type": "client",
        "state_of_residence": None,
        "phone": None,
        "notif_risk_score": True,
        "notif_deadlines": True,
        "notif_calls": True,
        "notif_lawyers": False,
        "notif_promo": False,
        "created_at": _iso(now - timedelta(days=12)),
        "updated_at": _iso(now),
        "is_demo": True,
    }


def build_attorney() -> dict:
    now = _now()
    attorney_id = "atty_demo_dubois"
    return {
        "id": attorney_id,
        "user_id": None,
        "email": ATTORNEY_EMAIL,
        "password_hash": hash_password(DEMO_PASSWORD),
        "first_name": "Jean-Luc",
        "last_name": "Dubois",
        "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "bio": "14 ans d'expérience au barreau de Bruxelles. Spécialiste baux, travail et consommation.",
        "bar_association": "Barreau de Bruxelles",
        "bar_number": "BXL-2012-0147",
        "year_admitted": 2012,
        "jurisdiction": "BE",
        "specialties": ["housing", "employment", "consumer"],
        "status": "active",
        "verified_at": _iso(now - timedelta(days=60)),
        "verified_by": "seed",
        "available_for_cases": True,
        "stripe_account_id": None,
        "stripe_onboarding_completed": False,
        "calendly_url": None,
        "rating_avg": 4.9,
        "cases_completed": 203,
        "avg_response_seconds": 1800,
        "is_live": True,
        "acquired_cases": [],
        "total_spent_cents": 0,
        "cases_acquired_this_month": 0,
        "email_preferences": {"daily_reminder": True},
        "created_at": _iso(now - timedelta(days=90)),
        "updated_at": _iso(now),
        "is_demo": True,
    }


def build_cases(client_user_id: str) -> list[dict]:
    now = _now()

    # Case 1 — Bail Bruxelles (action required)
    c1 = {
        "case_id": "case_demo_bail_bxl",
        "user_id": client_user_id,
        "title": "Bail 9 ans Bruxelles — loyer excessif",
        "type": "housing",
        "status": "active",
        "risk_score": 65,
        "risk_financial": 55,
        "risk_urgency": 25,
        "risk_legal_strength": 35,
        "risk_complexity": 45,
        "risk_score_history": [],
        "deadline": "2026-04-25",
        "deadline_description": "Envoyer la lettre recommandée avant le 25 avril",
        "financial_exposure": "EUR 6200",
        "ai_summary": (
            "Bail résidentiel bruxellois avec 3 clauses contestables. Score de "
            "risque modéré. Loyer 3100€ vs référentiel 1600€. Clause pénale 12%. "
            "Bail non enregistré."
        ),
        "ai_findings": [
            {
                "text": "Invalider la clause pénale de 12% (art. 5.74 C. civ.)",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. 5.74 C. civ. (ancien 1152)",
                "confidence_score": 0.85,
            },
            {
                "text": "Exiger la réduction du loyer au prix de référence bruxellois",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Ord. bxl 27/07/2017 art. 224 §1",
                "confidence_score": 0.78,
            },
            {
                "text": "Mettre en demeure d'enregistrer le bail sous 15 jours",
                "impact": "medium", "type": "opportunity",
                "legal_ref": "Loi 20/02/1991 art. 3",
                "confidence_score": 0.95,
            },
        ],
        "ai_next_steps": [
            {
                "title": "Invalider la clause pénale de 12% (art. 5.74 C. civ.)",
                "description": "Rédiger la lettre recommandée exigeant l'annulation",
                "action_type": "direct",
                "recipient": "Bailleur",
            },
            {
                "title": "Exiger la réduction du loyer au prix de référence",
                "description": "Joindre le calcul du référentiel bruxellois",
                "action_type": "direct",
                "recipient": "Bailleur",
            },
            {
                "title": "Mettre en demeure d'enregistrer le bail",
                "description": "Référence art. 3 Loi 20/02/1991",
                "action_type": "direct",
                "recipient": "Bailleur",
            },
        ],
        "success_probability": {
            "full_resolution_in_favor": 64,
            "negotiated_settlement": 19,
            "partial_loss": 11,
            "full_loss": 6,
        },
        "country": "BE",
        "region": "Bruxelles-Capitale",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 1,
        "recommend_lawyer": True,
        "created_at": _iso(now - timedelta(days=5)),
        "updated_at": _iso(now - timedelta(hours=4)),
        "marketplace_status": "listed",
        "is_demo": True,
    }

    # Case 2 — Excès de vitesse
    c2 = {
        "case_id": "case_demo_speeding",
        "user_id": client_user_id,
        "title": "Excès de vitesse 121 km/h zone 50",
        "type": "traffic",
        "status": "active",
        "risk_score": 72,
        "risk_financial": 40,
        "risk_urgency": 60,
        "risk_legal_strength": 72,
        "risk_complexity": 55,
        "risk_score_history": [],
        "deadline": "2026-04-30",
        "deadline_description": "Déposer la requête en contestation au parquet de Nivelles",
        "financial_exposure": "EUR 1200",
        "ai_summary": (
            "Excès de vitesse 4ème degré (121 km/h en zone 50 à Nivelles). "
            "Vice de forme potentiel sur la signalisation. Délai de contestation "
            "critique."
        ),
        "ai_findings": [
            {
                "text": "Contester la validité du radar (certification expirée)",
                "impact": "high", "type": "opportunity",
                "legal_ref": "AR 11/10/1997 art. 3",
                "confidence_score": 0.62,
            },
            {
                "text": "Invoquer le défaut de signalisation conforme",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Code de la route art. 68",
                "confidence_score": 0.74,
            },
        ],
        "ai_next_steps": [
            {
                "title": "Contester la validité du radar (certification expirée)",
                "description": "Demander la copie du certificat de calibrage",
                "action_type": "direct",
                "recipient": "Procureur du Roi Nivelles",
            },
            {
                "title": "Invoquer le défaut de signalisation zone 50",
                "description": "Photos panneau à joindre au dossier",
                "action_type": "direct",
                "recipient": "Procureur du Roi Nivelles",
            },
        ],
        "success_probability": {
            "full_resolution_in_favor": 35,
            "negotiated_settlement": 30,
            "partial_loss": 20,
            "full_loss": 15,
        },
        "country": "BE",
        "region": "Brabant wallon",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 2,
        "recommend_lawyer": True,
        "created_at": _iso(now - timedelta(days=6)),
        "updated_at": _iso(now - timedelta(hours=8)),
        "marketplace_status": "listed",
        "is_demo": True,
    }

    # Case 3 — Restitution caution
    c3 = {
        "case_id": "case_demo_deposit",
        "user_id": client_user_id,
        "title": "Récupération caution 1,900€ — Bruxelles",
        "type": "housing",
        "status": "active",
        "risk_score": 25,
        "risk_financial": 30,
        "risk_urgency": 15,
        "risk_legal_strength": 20,
        "risk_complexity": 15,
        "risk_score_history": [],
        "deadline": "2026-05-15",
        "deadline_description": "Attendre la réponse du bailleur sous 15 jours",
        "financial_exposure": "EUR 1900",
        "ai_summary": (
            "Restitution caution locative de 1,900€. État des lieux de sortie "
            "conforme. Mise en demeure envoyée. Dossier solide."
        ),
        "ai_findings": [
            {
                "text": "Exiger la restitution intégrale de la garantie locative",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. 10 Loi 20/02/1991",
                "confidence_score": 0.92,
            },
            {
                "text": "Réclamer les intérêts légaux sur la caution non restituée",
                "impact": "medium", "type": "opportunity",
                "legal_ref": "Art. 1153 C. civ.",
                "confidence_score": 0.88,
            },
        ],
        "ai_next_steps": [
            {
                "title": "Exiger la restitution intégrale de la caution",
                "description": "Mise en demeure avec délai de 15 jours",
                "action_type": "direct",
                "recipient": "Ancien bailleur",
            },
            {
                "title": "Réclamer les intérêts légaux sur la caution",
                "description": "Calcul depuis la date de sortie",
                "action_type": "direct",
                "recipient": "Ancien bailleur",
            },
        ],
        "success_probability": {
            "full_resolution_in_favor": 82,
            "negotiated_settlement": 12,
            "partial_loss": 4,
            "full_loss": 2,
        },
        "country": "BE",
        "region": "Bruxelles-Capitale",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 1,
        "recommend_lawyer": False,
        "created_at": _iso(now - timedelta(days=5)),
        "updated_at": _iso(now - timedelta(hours=14)),
        "marketplace_status": "listed",
        "is_demo": True,
    }

    # Case 4 — Licenciement (in analysis, no findings yet)
    c4 = {
        "case_id": "case_demo_dismissal",
        "user_id": client_user_id,
        "title": "Licenciement abusif — motif grave contesté",
        "type": "employment",
        "status": "active",
        "risk_score": 45,
        "risk_financial": 70,
        "risk_urgency": 50,
        "risk_legal_strength": 40,
        "risk_complexity": 55,
        "risk_score_history": [],
        "deadline": None,
        "deadline_description": None,
        "financial_exposure": "EUR 18500",
        "ai_summary": "Analyse en cours — le contrat de travail et les dernières fiches de paie sont attendus.",
        "ai_findings": [],
        "ai_next_steps": [
            {
                "title": "Uploader le contrat de travail et 3 dernières fiches de paie",
                "description": "Nécessaire pour lancer l'analyse détaillée",
                "action_type": "verification_required",
                "recipient": "Vous-même",
            }
        ],
        "success_probability": None,
        "country": "BE",
        "region": "Liège",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 0,
        "recommend_lawyer": True,
        "created_at": _iso(now - timedelta(days=2)),
        "updated_at": _iso(now - timedelta(days=2)),
        "marketplace_status": "not_listed",
        "is_demo": True,
    }

    # Case 5 — Resolved
    c5 = {
        "case_id": "case_demo_resolved",
        "user_id": client_user_id,
        "title": "Avenant bail signé — dossier résolu",
        "type": "housing",
        "status": "resolved",
        "risk_score": 18,
        "risk_financial": 15,
        "risk_urgency": 0,
        "risk_legal_strength": 15,
        "risk_complexity": 20,
        "risk_score_history": [],
        "deadline": None,
        "deadline_description": None,
        "financial_exposure": "EUR 4800",
        "ai_summary": "Négociation amiable réussie. Réduction de loyer de 15% obtenue.",
        "ai_findings": [
            {
                "text": "Réduction de loyer de 15% obtenue via négociation amiable",
                "impact": "high", "type": "opportunity",
                "legal_ref": "",
                "confidence_score": 1.0,
            },
        ],
        "ai_next_steps": [],
        "success_probability": {
            "full_resolution_in_favor": 100,
            "negotiated_settlement": 0,
            "partial_loss": 0,
            "full_loss": 0,
        },
        "country": "BE",
        "region": "Bruxelles-Capitale",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 1,
        "recommend_lawyer": False,
        "created_at": _iso(now - timedelta(days=10)),
        "updated_at": _iso(now - timedelta(days=1)),
        "marketplace_status": "acquired",
        "is_demo": True,
    }

    return [c1, c2, c3, c4, c5]


def build_marketplace_listings(cases: list[dict]) -> list[dict]:
    """4 available listings mapped to the first 4 cases + 1 locked fake."""
    now = _now()
    by_id = {c["case_id"]: c for c in cases}

    listings = []

    # Listing 1 — Bail Bruxelles
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_bail_bxl"]["case_id"],
        "status": "available",
        "case_type": "housing",
        "case_type_label": "Bail · Immobilier",
        "case_type_icon": "🏠",
        "region": "Bruxelles",
        "country": "BE",
        "title": "Contestation loyer excessif — bail 9 ans résidence principale",
        "summary": (
            "Locataire conteste un loyer 2× supérieur au référentiel bruxellois. "
            "Clause pénale à 12%. Bail non enregistré. 3 arguments juridiques identifiés."
        ),
        "financial_stakes": 6200,
        "risk_score": 65,
        "risk_level": "mid",
        "document_count": 1,
        "price_cents": 8000,
        "created_at": _iso(now - timedelta(minutes=4)),
        "expires_at": _iso(now + timedelta(hours=68)),
        "view_count": 12,
        "current_viewers": [],
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
        "is_demo": True,
    })

    # Listing 2 — Excès de vitesse
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_speeding"]["case_id"],
        "status": "available",
        "case_type": "traffic",
        "case_type_label": "Routier",
        "case_type_icon": "🚗",
        "region": "Brabant wallon",
        "country": "BE",
        "title": "Excès de vitesse 4ème degré — 121 km/h en zone 50",
        "summary": (
            "Contestation PV radar. Vice de forme potentiel sur la signalisation. "
            "Requête à déposer au parquet de Nivelles."
        ),
        "financial_stakes": 1200,
        "risk_score": 72,
        "risk_level": "high",
        "document_count": 2,
        "price_cents": 5000,
        "created_at": _iso(now - timedelta(minutes=12)),
        "expires_at": _iso(now + timedelta(hours=60)),
        "view_count": 8,
        "current_viewers": [],
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
        "is_demo": True,
    })

    # Listing 3 — Caution
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_deposit"]["case_id"],
        "status": "available",
        "case_type": "housing",
        "case_type_label": "Bail · Caution",
        "case_type_icon": "🏠",
        "region": "Bruxelles",
        "country": "BE",
        "title": "Récupération caution locative — 1,900€ non restituée",
        "summary": (
            "Bailleur refuse la restitution malgré état des lieux conforme. "
            "Mise en demeure nécessaire. Dossier solide."
        ),
        "financial_stakes": 1900,
        "risk_score": 25,
        "risk_level": "low",
        "document_count": 1,
        "price_cents": 6000,
        "created_at": _iso(now - timedelta(hours=2)),
        "expires_at": _iso(now + timedelta(hours=46)),
        "view_count": 5,
        "current_viewers": [],
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
        "is_demo": True,
    })

    # Listing 4 — Licenciement
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_dismissal"]["case_id"],
        "status": "available",
        "case_type": "employment",
        "case_type_label": "Droit du travail",
        "case_type_icon": "💼",
        "region": "Liège",
        "country": "BE",
        "title": "Licenciement pour motif grave contesté — 8 ans d'ancienneté",
        "summary": (
            "Employé licencié pour retards répétés. Absence de procédure "
            "d'avertissement documentée. Indemnité de préavis potentiellement due."
        ),
        "financial_stakes": 18500,
        "risk_score": 45,
        "risk_level": "mid",
        "document_count": 4,
        "price_cents": 12000,
        "created_at": _iso(now - timedelta(hours=1)),
        "expires_at": _iso(now + timedelta(hours=71)),
        "view_count": 18,
        "current_viewers": [],
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
        "is_demo": True,
    })

    # Listing 5 — Surfacturation telecom (LOCKED by a fake attorney, to show "pris")
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": "case_demo_telecom_locked",
        "status": "locked",
        "case_type": "consumer",
        "case_type_label": "Consommation",
        "case_type_icon": "🛒",
        "region": "Namur",
        "country": "BE",
        "title": "Surfacturation opérateur télécom — services non souscrits",
        "summary": (
            "Client facturé €450 pour des services non souscrits. Mise en demeure nécessaire."
        ),
        "financial_stakes": 450,
        "risk_score": 28,
        "risk_level": "low",
        "document_count": 2,
        "price_cents": 6000,
        "created_at": _iso(now - timedelta(hours=3)),
        "expires_at": _iso(now + timedelta(hours=45)),
        "view_count": 9,
        "current_viewers": [],
        "locked_by": "atty_fake_competitor",
        "locked_at": _iso(now - timedelta(minutes=20)),
        "stripe_payment_id": None,
        "is_demo": True,
    })

    return listings


# ══════════════════════════════════════════════════════════════════════════
# Seed orchestration
# ══════════════════════════════════════════════════════════════════════════
async def seed_demo() -> None:
    print("🔧 Suppression des docs is_demo=true existants…")
    del_users = await db.users.delete_many({"is_demo": True})
    del_attorneys = await db.attorneys.delete_many({"is_demo": True})
    del_cases = await db.cases.delete_many({"is_demo": True})
    del_listings = await db.case_marketplace.delete_many({"is_demo": True})
    print(
        f"   users={del_users.deleted_count} · "
        f"attorneys={del_attorneys.deleted_count} · "
        f"cases={del_cases.deleted_count} · "
        f"listings={del_listings.deleted_count}"
    )

    print("👤 Insertion client démo…")
    client_doc = build_client_user()
    await db.users.insert_one(client_doc)

    print("⚖️  Insertion avocat démo…")
    attorney_doc = build_attorney()
    await db.attorneys.insert_one(attorney_doc)

    print("📁 Insertion 5 dossiers client…")
    cases = build_cases(client_doc["user_id"])
    await db.cases.insert_many(cases)

    print("🏪 Insertion 5 listings marketplace…")
    listings = build_marketplace_listings(cases)
    await db.case_marketplace.insert_many(listings)

    print()
    print("✅ DÉMO PRÊTE")
    print("=" * 54)
    print(f"CLIENT   → {CLIENT_EMAIL}  /  {DEMO_PASSWORD}")
    print(f"AVOCAT   → {ATTORNEY_EMAIL}  /  {DEMO_PASSWORD}")
    print("-" * 54)
    print(f"Cases client     : 5 (3 actifs · 1 en analyse · 1 résolu)")
    print(f"Marketplace      : 5 (4 disponibles · 1 pris)")
    print(f"Attorney status  : active · is_live=true · BE")
    print(f"Client plan      : pro (full access, hors Free gating)")
    print("=" * 54)


def main() -> None:
    if not os.environ.get("MONGO_URL") and not os.environ.get("DATABASE_URL"):
        print("⚠️  Aucune var MONGO_URL/DATABASE_URL détectée — vérifie ton .env avant de lancer.", file=sys.stderr)
    asyncio.run(seed_demo())


if __name__ == "__main__":
    main()
