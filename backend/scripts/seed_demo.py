"""Seed demo accounts + data for the live demo.

Usage:
    cd backend
    python scripts/seed_demo.py

Creates:
  - 1 client user          (db.users)             demo-client@archer.law  / Archer2026!
  - 1 attorney             (db.attorneys)         demo-avocat@archer.law  / Archer2026!
  - 5 cases for the client (db.cases)             5 actifs, multi-domaines
                                                  (travail · bail · routier · conso · commercial)
  - 5 marketplace listings (db.case_marketplace)  4 disponibles, 1 pris

Each case is fully populated with `battle_preview` (rapport de force tactique)
and critical-type `ai_findings` (points critiques) so the demo lawyer view
shows a real case-detail experience with no empty panels.

All seeded docs carry `is_demo: true` so a re-run cleans up before inserting.

Idempotent: safe to run multiple times.
"""
from __future__ import annotations

import asyncio
import os
import re
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


def build_attorney_profile(attorney_doc: dict) -> dict:
    """Legacy `attorney_profiles` doc — required because the deployed backend
    on the demo environment routes `GET /api/attorneys/me` to the legacy
    catch-all `attorney_routes.py:GET /attorneys/{slug}` (slug=`"me"`), which
    reads `db.attorney_profiles` with filter `{slug, application_status}`.

    HACK FOR DEMO. Cleaned up by the existing `is_demo=true` deletion. Once
    `attorney_portal_routes.py` is properly mounted in prod, this insertion
    can be dropped.
    """
    now = _now()
    full_name = (
        f"{attorney_doc.get('first_name','')} {attorney_doc.get('last_name','')}"
    ).strip()
    year_admitted = int(attorney_doc.get("year_admitted") or 2012)
    years_exp = max(0, datetime.now(timezone.utc).year - year_admitted)
    return {
        # ── Fields read by the legacy /attorneys/{slug} response ─────────
        "attorney_id": attorney_doc["id"],
        "slug": "me",  # CRITICAL — matches /api/attorneys/me path param
        "application_status": "approved",  # required filter on legacy route
        "full_name": full_name,
        "bar_number": attorney_doc.get("bar_number", ""),
        "states_licensed": [],
        "country": attorney_doc.get("jurisdiction", "BE"),
        "years_experience": years_exp,
        "specialties": attorney_doc.get("specialties", []),
        "bio": attorney_doc.get("bio", ""),
        "photo_url": attorney_doc.get("photo_url"),
        "languages": ["French", "English", "Dutch"],
        "session_price": 150,
        "rating": attorney_doc.get("rating_avg", 4.9),
        "total_sessions": attorney_doc.get("cases_completed", 0),
        "review_count": 0,
        "is_available": attorney_doc.get("available_for_cases", True),
        "available_from": None,
        "available_until": None,
        # ── Sprint A fields kept alongside in case any downstream reader
        #    looks for them on the same doc.
        "id": attorney_doc["id"],
        "email": attorney_doc.get("email"),
        "first_name": attorney_doc.get("first_name"),
        "last_name": attorney_doc.get("last_name"),
        "status": "active",
        "user_id": attorney_doc.get("user_id"),
        "created_at": _iso(now - timedelta(days=90)),
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
        "bio": (
            "14 ans d'expérience au barreau de Bruxelles. Spécialiste droit du "
            "travail, baux, droit de la consommation, droit routier et "
            "contentieux commercial."
        ),
        "bar_association": "Barreau de Bruxelles",
        "bar_number": "BXL-2012-0147",
        "year_admitted": 2012,
        "jurisdiction": "BE",
        "specialties": ["employment", "housing", "consumer", "traffic", "commercial"],
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

    # ── Case 1 — Droit du travail : licenciement abusif (€18,500) ──────────
    c_travail = {
        "case_id": "case_demo_dismissal",
        "user_id": client_user_id,
        "title": "Licenciement abusif — 8 ans d'ancienneté, motif grave contesté",
        "type": "employment",
        "status": "active",
        "risk_score": 45,
        "risk_financial": 75,
        "risk_urgency": 55,
        "risk_legal_strength": 70,
        "risk_complexity": 50,
        "risk_score_history": [],
        "deadline": "2026-05-20",
        "deadline_description": (
            "Préparer la citation devant le tribunal du travail de Liège — "
            "délai d'un an depuis la fin du contrat"
        ),
        "financial_exposure": "EUR 18500",
        "ai_summary": (
            "Licenciement pour motif grave après 8 ans d'ancienneté irréprochable. "
            "Aucune procédure d'avertissement écrit, motif disproportionné. "
            "Indemnité de préavis (27 semaines ≈ €12,300) + dommages CCT 109 + "
            "indemnité de protection à explorer. Position client solide."
        ),
        "ai_findings": [
            # Opportunities (points forts)
            {
                "text": "Réclamer l'indemnité de préavis (27 semaines pour 8 ans d'ancienneté)",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. 39 § 1 Loi du 03/07/1978",
                "confidence_score": 0.92,
            },
            {
                "text": "Contester le motif grave — absence d'avertissements écrits préalables",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. 35 Loi 03/07/1978 + Cass. 06/03/2017",
                "confidence_score": 0.81,
            },
            {
                "text": "Demander dommages et intérêts pour licenciement manifestement déraisonnable",
                "impact": "medium", "type": "opportunity",
                "legal_ref": "CCT 109 art. 9",
                "confidence_score": 0.74,
            },
            # Critical (points critiques)
            {
                "text": "Délai d'un an pour citer l'employeur",
                "type": "deadline",
                "risk_if_ignored": "Forclusion totale de l'action en contestation du motif grave — perte définitive du dossier",
                "do_now": "Préparer la citation devant le tribunal du travail avant le 20 mai 2026",
                "legal_ref": "Art. 15 Loi du 03/07/1978",
                "legal_refs": [
                    {"label": "Art. 15 Loi 03/07/1978", "archer_explanation": "Délai de prescription d'un an à compter de la fin du contrat"},
                ],
                "impact": "high",
                "confidence_score": 0.99,
            },
            {
                "text": "Absence d'avertissements écrits préalables au licenciement",
                "type": "risk",
                "risk_if_ignored": "Argument central non soulevé — affaiblit considérablement la contestation du motif grave",
                "do_now": "Compiler tous les emails RH des 24 derniers mois pour démontrer l'absence d'avertissement formel",
                "legal_ref": "Cass. 06/03/2017, S.16.0008.F",
                "legal_refs": [
                    {"label": "Cass. 06/03/2017", "archer_explanation": "L'absence de procédure d'avertissement écrit affaiblit le motif grave"},
                ],
                "impact": "high",
                "confidence_score": 0.85,
            },
            {
                "text": "Vérifier le statut de délégué syndical / représentant du personnel",
                "type": "risk",
                "risk_if_ignored": "Si statut protégé : indemnité spéciale (2 à 4 ans de rémunération) non réclamée",
                "do_now": "Confirmer auprès de la délégation syndicale la liste des mandats en cours au moment du licenciement",
                "legal_ref": "Loi du 19/03/1991 art. 16",
                "legal_refs": [
                    {"label": "Loi 19/03/1991 art. 16", "archer_explanation": "Indemnité spéciale en cas de licenciement d'un travailleur protégé"},
                ],
                "impact": "medium",
                "confidence_score": 0.55,
            },
        ],
        "ai_next_steps": [
            {
                "title": "Préparer la citation devant le tribunal du travail de Liège",
                "description": "Citation sur indemnité de préavis + dommages CCT 109",
                "action_type": "direct",
                "recipient": "Employeur",
            },
            {
                "title": "Compiler le dossier d'absence d'avertissements",
                "description": "Emails RH, évaluations annuelles, dossier disciplinaire vide",
                "action_type": "verification_required",
                "recipient": "Vous-même",
            },
            {
                "title": "Vérifier statut de représentant du personnel",
                "description": "Pour activer l'indemnité de protection si applicable",
                "action_type": "verification_required",
                "recipient": "Délégation syndicale",
            },
        ],
        "success_probability": {
            "full_resolution_in_favor": 58,
            "negotiated_settlement": 28,
            "partial_loss": 10,
            "full_loss": 4,
        },
        "battle_preview": {
            "user_side": {
                "strongest_arguments": [
                    {
                        "argument": "8 ans d'ancienneté sans aucun avertissement écrit documenté — la cohérence du parcours fragilise toute allégation de motif grave",
                        "strength": "strong",
                        "legal_basis": "Cass. 06/03/2017, S.16.0008.F",
                    },
                    {
                        "argument": "Indemnité légale de préavis incompressible (27 semaines, ≈ €12,300) — due quel que soit le motif si le motif grave tombe",
                        "strength": "strong",
                        "legal_basis": "Art. 39 § 1 Loi du 03/07/1978",
                    },
                    {
                        "argument": "Dommages pour licenciement manifestement déraisonnable (CCT 109) — jusqu'à 17 semaines additionnelles",
                        "strength": "strong",
                        "legal_basis": "CCT 109 art. 9",
                    },
                    {
                        "argument": "Absence de procès-verbal d'audition préalable — vice de procédure documenté",
                        "strength": "medium",
                        "legal_basis": "Principe général du contradictoire",
                    },
                ],
                "best_outcome_scenario": "Annulation du motif grave + indemnité de préavis + dommages CCT 109 (~€18,500 total)",
            },
            "opposing_side": {
                "opposing_arguments": [
                    {
                        "argument": "Retards répétés sur les 6 derniers mois invoqués comme motif grave",
                        "strength": "weak",
                        "legal_basis": "Art. 35 Loi 03/07/1978",
                    },
                    {
                        "argument": "Email du 12/02 mentionnant des retards (sans valeur d'avertissement formel)",
                        "strength": "weak",
                        "legal_basis": "—",
                    },
                ],
                "user_weaknesses": [
                    "Quelques retards effectivement constatés sur les pointages (atténué par accord verbal sur télétravail)",
                    "Absence de saisine antérieure de la délégation syndicale sur ces retards",
                ],
                "worst_outcome_scenario": "Maintien partiel du motif grave — récupération limitée à l'indemnité CCT 109",
            },
        },
        "strategy": {
            "recommended_approach": "offensive",
            "rationale": (
                "Position client solide (4 arguments forts vs 2 faibles côté employeur). "
                "Citation directe au tribunal sans phase de négociation préalable — "
                "l'employeur cèdera sur l'indemnité de préavis dès la signification."
            ),
        },
        "country": "BE",
        "region": "Liège",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 4,
        "recommend_lawyer": True,
        "created_at": _iso(now - timedelta(days=8)),
        "updated_at": _iso(now - timedelta(hours=6)),
        "marketplace_status": "listed",
        "is_demo": True,
    }

    # ── Case 2 — Bail/Logement : caution locative non restituée (€1,900) ──
    c_caution = {
        "case_id": "case_demo_deposit",
        "user_id": client_user_id,
        "title": "Récupération caution locative 1,900€ — Bruxelles",
        "type": "housing",
        "status": "active",
        "risk_score": 22,
        "risk_financial": 25,
        "risk_urgency": 35,
        "risk_legal_strength": 18,
        "risk_complexity": 15,
        "risk_score_history": [],
        "deadline": "2026-05-12",
        "deadline_description": "Délai de réponse à la mise en demeure du 27/04 expire le 12 mai 2026",
        "financial_exposure": "EUR 1900",
        "ai_summary": (
            "Caution locative de 1,900€ retenue abusivement après état des lieux "
            "de sortie conforme. Mise en demeure recommandée envoyée le 27 avril. "
            "Dossier très solide — restitution intégrale + intérêts attendue."
        ),
        "ai_findings": [
            {
                "text": "Exiger la restitution intégrale de la garantie locative",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. 10 Loi 20/02/1991",
                "confidence_score": 0.94,
            },
            {
                "text": "Réclamer les intérêts légaux depuis la sortie (~€42)",
                "impact": "low", "type": "opportunity",
                "legal_ref": "Art. 1153 C. civ.",
                "confidence_score": 0.90,
            },
            {
                "text": "Citer le bailleur devant le juge de paix si refus persistant",
                "impact": "medium", "type": "opportunity",
                "legal_ref": "Art. 591 11° C. jud.",
                "confidence_score": 0.85,
            },
            {
                "text": "Délai de réponse à la mise en demeure : 15 jours",
                "type": "deadline",
                "risk_if_ignored": "Sans réponse au 12 mai, citation devant le juge de paix obligatoire — coûts de procédure additionnels",
                "do_now": "Surveiller la boîte aux lettres et préparer la citation pour le 13 mai",
                "legal_ref": "Mise en demeure du 27/04/2026",
                "legal_refs": [
                    {"label": "Mise en demeure 27/04/2026", "archer_explanation": "Délai de 15 jours expire le 12/05/2026"},
                ],
                "impact": "medium",
                "confidence_score": 0.95,
            },
            {
                "text": "Conservation impérative de l'état des lieux d'entrée et de sortie signés",
                "type": "risk",
                "risk_if_ignored": "Sans EDL signé, la charge de la preuve s'inverse — le bailleur peut alléguer des dégâts non documentés",
                "do_now": "Sauvegarder les originaux + scans haute résolution dans 2 emplacements distincts",
                "legal_ref": "Art. 1731 C. civ.",
                "legal_refs": [
                    {"label": "Art. 1731 C. civ.", "archer_explanation": "État des lieux d'entrée signé fait foi de l'état initial"},
                ],
                "impact": "high",
                "confidence_score": 0.99,
            },
        ],
        "ai_next_steps": [
            {
                "title": "Surveiller la réponse à la mise en demeure",
                "description": "Délai de 15 jours — réponse attendue avant le 12 mai 2026",
                "action_type": "verification_required",
                "recipient": "Vous-même",
            },
            {
                "title": "Préparer la citation devant le juge de paix",
                "description": "Si pas de réponse — modèle de requête disponible",
                "action_type": "direct",
                "recipient": "Justice de paix Bruxelles",
            },
        ],
        "success_probability": {
            "full_resolution_in_favor": 84,
            "negotiated_settlement": 11,
            "partial_loss": 4,
            "full_loss": 1,
        },
        "battle_preview": {
            "user_side": {
                "strongest_arguments": [
                    {"argument": "État des lieux de sortie signé sans réserve par le bailleur", "strength": "strong", "legal_basis": "Art. 1731 C. civ."},
                    {"argument": "Caution déposée sur compte bloqué — restitution automatique de droit", "strength": "strong", "legal_basis": "Art. 10 § 2 Loi 20/02/1991"},
                    {"argument": "Quittances de loyer à jour jusqu'à la sortie", "strength": "strong", "legal_basis": "—"},
                    {"argument": "Photos datées de sortie + témoignage de l'agent immobilier", "strength": "medium", "legal_basis": "—"},
                ],
                "best_outcome_scenario": "Restitution intégrale 1,900€ + intérêts légaux (~€42) sous 15 jours",
            },
            "opposing_side": {
                "opposing_arguments": [
                    {"argument": "Le bailleur invoque des dégâts qui n'apparaissent pas à l'EDL de sortie", "strength": "weak", "legal_basis": "—"},
                ],
                "user_weaknesses": [
                    "Aucune faiblesse identifiée — dossier solide",
                ],
                "worst_outcome_scenario": "Retenue partielle 200-400€ négociée sans aller en justice (improbable)",
            },
        },
        "strategy": {
            "recommended_approach": "offensive",
            "rationale": (
                "Mise en demeure envoyée — escalade automatique en justice de paix "
                "si pas de réponse. Probabilité de gain >80%. Pas besoin d'avocat "
                "à ce stade."
            ),
        },
        "country": "BE",
        "region": "Bruxelles-Capitale",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 3,
        "recommend_lawyer": False,
        "created_at": _iso(now - timedelta(days=4)),
        "updated_at": _iso(now - timedelta(hours=3)),
        "marketplace_status": "listed",
        "is_demo": True,
    }

    # ── Case 3 — Routier : excès de vitesse 4ème degré (€1,200, vice de forme) ─
    c_routier = {
        "case_id": "case_demo_speeding",
        "user_id": client_user_id,
        "title": "Excès de vitesse 4ème degré — 121 km/h en zone 50 (Nivelles)",
        "type": "traffic",
        "status": "active",
        "risk_score": 68,
        "risk_financial": 35,
        "risk_urgency": 78,
        "risk_legal_strength": 55,
        "risk_complexity": 45,
        "risk_score_history": [],
        "deadline": "2026-05-08",
        "deadline_description": "Audience tribunal de police Nivelles — 8 mai 2026",
        "financial_exposure": "EUR 1200",
        "ai_summary": (
            "Excès de vitesse 4ème degré à Nivelles (radar fixe). Vice de forme "
            "potentiel : certificat de calibrage radar expiré 11 jours avant le "
            "PV + signalisation zone 50 partiellement masquée. Audience le 8 mai. "
            "Avocat fortement recommandé."
        ),
        "ai_findings": [
            {
                "text": "Invoquer l'expiration du certificat de calibrage du radar",
                "impact": "high", "type": "opportunity",
                "legal_ref": "AR 11/10/1997 art. 3",
                "confidence_score": 0.71,
            },
            {
                "text": "Soulever le défaut de signalisation conforme zone 50",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Code de la route art. 68",
                "confidence_score": 0.62,
            },
            {
                "text": "Demander la requalification en 3ème degré (réduction amende et points)",
                "impact": "medium", "type": "opportunity",
                "legal_ref": "Code de la route art. 11",
                "confidence_score": 0.45,
            },
            {
                "text": "Audience du 8 mai 2026 — délai de constitution dossier critique",
                "type": "deadline",
                "risk_if_ignored": "Sans contestation déposée, condamnation par défaut + déchéance immédiate du droit de conduire",
                "do_now": "Déposer la requête au parquet de Nivelles au plus tard le 6 mai (J-2)",
                "legal_ref": "Citation du 12/04/2026",
                "legal_refs": [
                    {"label": "Citation 12/04/2026", "archer_explanation": "Audience fixée au 08/05/2026 — Tribunal de police Nivelles"},
                ],
                "impact": "high",
                "confidence_score": 0.99,
            },
            {
                "text": "Risque de retrait immédiat du permis si maintien du 4ème degré",
                "type": "risk",
                "risk_if_ignored": "Retrait de 8 jours à 5 ans du droit de conduire + amende €1,200-€12,000 + 6 points",
                "do_now": "Préparer mémoire en défense centré sur le vice de calibrage radar",
                "legal_ref": "Code de la route art. 38 § 6",
                "legal_refs": [
                    {"label": "Art. 38 § 6 Code de la route", "archer_explanation": "Déchéance obligatoire en cas d'excès >40 km/h en zone 50"},
                ],
                "impact": "high",
                "confidence_score": 0.92,
            },
            {
                "text": "Photos du panneau zone 50 manquantes au dossier",
                "type": "risk",
                "risk_if_ignored": "Argument 'défaut de signalisation' inexploitable sans preuve photographique datée et géolocalisée",
                "do_now": "Se rendre sur les lieux ce week-end avec un témoin pour photographier panneau + relevé GPS",
                "legal_ref": "Charge de la preuve",
                "legal_refs": [
                    {"label": "Cass. 13/01/2015", "archer_explanation": "La signalisation insuffisante est cause d'acquittement"},
                ],
                "impact": "high",
                "confidence_score": 0.78,
            },
        ],
        "ai_next_steps": [
            {
                "title": "Demander le certificat de calibrage du radar",
                "description": "Demande au parquet de Nivelles — copie du dernier contrôle METAS",
                "action_type": "direct",
                "recipient": "Procureur du Roi Nivelles",
            },
            {
                "title": "Photographier la signalisation zone 50",
                "description": "Photos datées + relevé GPS du panneau",
                "action_type": "verification_required",
                "recipient": "Vous-même",
            },
            {
                "title": "Déposer le mémoire en défense au parquet",
                "description": "Centré sur le vice de calibrage + signalisation",
                "action_type": "direct",
                "recipient": "Tribunal de police Nivelles",
            },
        ],
        "success_probability": {
            "full_resolution_in_favor": 32,
            "negotiated_settlement": 38,
            "partial_loss": 22,
            "full_loss": 8,
        },
        "battle_preview": {
            "user_side": {
                "strongest_arguments": [
                    {"argument": "Certificat de calibrage du radar expiré 11 jours avant le PV (vérification METAS)", "strength": "strong", "legal_basis": "AR 11/10/1997 art. 3"},
                    {"argument": "Signalisation zone 50 partiellement masquée par végétation (Street View 03/2026)", "strength": "medium", "legal_basis": "Cass. 13/01/2015"},
                    {"argument": "Casier vierge + 11 ans de permis sans incident — circonstances atténuantes", "strength": "medium", "legal_basis": "Art. 38 § 5 Code de la route"},
                ],
                "best_outcome_scenario": "Acquittement pur ou requalification en 3ème degré (amende ~€480, sans déchéance)",
            },
            "opposing_side": {
                "opposing_arguments": [
                    {"argument": "Mesure radar 121 km/h confirmée par photo PV", "strength": "strong", "legal_basis": "Art. 62 Code de la route"},
                    {"argument": "Excès >40 km/h déclenche la déchéance obligatoire", "strength": "strong", "legal_basis": "Art. 38 § 6 Code de la route"},
                    {"argument": "Pas de circonstance d'urgence invoquée", "strength": "medium", "legal_basis": "—"},
                ],
                "user_weaknesses": [
                    "Mesure radar à 121 km/h objectivement très supérieure à 50 km/h",
                    "Aucune justification factuelle de la vitesse au moment du PV",
                ],
                "worst_outcome_scenario": "Maintien 4ème degré : amende €1,200 + déchéance 15 jours + 6 points",
            },
        },
        "strategy": {
            "recommended_approach": "défensive",
            "rationale": (
                "Position mixte (3 arguments client / 3 ministère public). Stratégie "
                "défensive centrée sur le vice technique (calibrage radar) — viable "
                "mais issue incertaine. Avocat fortement recommandé."
            ),
        },
        "country": "BE",
        "region": "Brabant wallon",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 2,
        "recommend_lawyer": True,
        "created_at": _iso(now - timedelta(days=6)),
        "updated_at": _iso(now - timedelta(hours=10)),
        "marketplace_status": "listed",
        "is_demo": True,
    }

    # ── Case 4 — Consommation : surfacturation télécom (€2,400) ────────────
    c_telecom = {
        "case_id": "case_demo_telecom",
        "user_id": client_user_id,
        "title": "Surfacturation télécom — €2,400 prélèvements non autorisés",
        "type": "consumer",
        "status": "active",
        "risk_score": 32,
        "risk_financial": 35,
        "risk_urgency": 40,
        "risk_legal_strength": 25,
        "risk_complexity": 30,
        "risk_score_history": [],
        "deadline": "2026-06-15",
        "deadline_description": "Délai SEPA de 13 mois pour contester les prélèvements non autorisés",
        "financial_exposure": "EUR 2400",
        "ai_summary": (
            "L'opérateur télécom a effectué €2,400 de prélèvements pour des "
            "services jamais souscrits par le client (forfait pro + assurance "
            "+ cloud). Aucun mandat signé. Délai SEPA de 13 mois encore ouvert. "
            "Restitution automatique exigible auprès de la banque + résiliation "
            "pour faute de l'opérateur."
        ),
        "ai_findings": [
            {
                "text": "Exiger remboursement intégral via opposition SEPA (procédure bancaire automatique)",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. VII.55 CDE + règlement SEPA",
                "confidence_score": 0.95,
            },
            {
                "text": "Résilier le contrat pour faute de l'opérateur — sans frais de résiliation",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. VI.83 1° CDE",
                "confidence_score": 0.86,
            },
            {
                "text": "Saisir le Service de Médiation pour les Télécommunications",
                "impact": "medium", "type": "opportunity",
                "legal_ref": "Art. 43bis Loi 21/03/1991",
                "confidence_score": 0.82,
            },
            {
                "text": "Demander dommages et intérêts pour pratique commerciale déloyale",
                "impact": "medium", "type": "opportunity",
                "legal_ref": "Art. VI.95 CDE",
                "confidence_score": 0.58,
            },
            {
                "text": "Délai SEPA de 13 mois — opposition à exercer avant le 15 juin 2026",
                "type": "deadline",
                "risk_if_ignored": "Au-delà de 13 mois, le remboursement automatique SEPA n'est plus possible — recouvrement uniquement par voie judiciaire",
                "do_now": "Demander à la banque l'opposition SEPA (formulaire R-Transaction) sur les prélèvements de mai 2025 à ce jour",
                "legal_ref": "Règlement (UE) 260/2012 + Art. VII.55 CDE",
                "legal_refs": [
                    {"label": "Art. VII.55 CDE", "archer_explanation": "Remboursement automatique SEPA dans un délai de 8 semaines / 13 mois pour transactions non autorisées"},
                ],
                "impact": "high",
                "confidence_score": 0.99,
            },
            {
                "text": "Absence de mandat de prélèvement signé par le client",
                "type": "risk",
                "risk_if_ignored": "Si l'opérateur produit un mandat ou une signature électronique douteuse, la charge de la preuve pourrait basculer",
                "do_now": "Demander à l'opérateur — par recommandé — copie du mandat de prélèvement et de la souscription électronique signée",
                "legal_ref": "Art. 1326 C. civ. + Art. 8.7 nouveau C. civ.",
                "legal_refs": [
                    {"label": "Art. 8.7 nouveau C. civ.", "archer_explanation": "La charge de la preuve incombe à celui qui invoque l'existence du contrat"},
                ],
                "impact": "high",
                "confidence_score": 0.88,
            },
            {
                "text": "Conservation des relevés bancaires et historique des appels au service client",
                "type": "risk",
                "risk_if_ignored": "Sans traces des contestations préalables, l'opérateur peut alléguer 'acceptation tacite' par silence prolongé",
                "do_now": "Exporter tous les relevés bancaires depuis mai 2025 + journal des appels au service client (avec horodatage)",
                "legal_ref": "Art. 8.4 nouveau C. civ.",
                "legal_refs": [
                    {"label": "Art. 8.4 nouveau C. civ.", "archer_explanation": "Charge de la preuve par celui qui réclame l'exécution"},
                ],
                "impact": "medium",
                "confidence_score": 0.81,
            },
        ],
        "ai_next_steps": [
            {
                "title": "Demander l'opposition SEPA à votre banque",
                "description": "Formulaire R-Transaction sur les 12 derniers prélèvements",
                "action_type": "direct",
                "recipient": "Banque",
            },
            {
                "title": "Mise en demeure à l'opérateur télécom",
                "description": "Exiger production du mandat signé + résiliation pour faute",
                "action_type": "direct",
                "recipient": "Opérateur télécom",
            },
            {
                "title": "Saisir le Service de Médiation pour les Télécommunications",
                "description": "Recours gratuit en cas de blocage",
                "action_type": "direct",
                "recipient": "Médiateur Télécom",
            },
        ],
        "success_probability": {
            "full_resolution_in_favor": 76,
            "negotiated_settlement": 18,
            "partial_loss": 5,
            "full_loss": 1,
        },
        "battle_preview": {
            "user_side": {
                "strongest_arguments": [
                    {"argument": "Aucun contrat écrit ni signature électronique pour les services facturés — l'opérateur ne peut produire de mandat", "strength": "strong", "legal_basis": "Art. 8.7 nouveau C. civ."},
                    {"argument": "Procédure SEPA de remboursement automatique — la banque restitue sans débat sur le fond", "strength": "strong", "legal_basis": "Art. VII.55 CDE"},
                    {"argument": "12 mois de relevés bancaires montrant des prélèvements progressifs et non sollicités", "strength": "strong", "legal_basis": "Art. 8.4 nouveau C. civ."},
                    {"argument": "Demandes répétées et tracées de résiliation auprès du service client (3 appels enregistrés)", "strength": "medium", "legal_basis": "Art. VI.83 CDE"},
                ],
                "best_outcome_scenario": "Remboursement intégral 2,400€ via SEPA + résiliation sans frais + dommages ~€250 via médiateur",
            },
            "opposing_side": {
                "opposing_arguments": [
                    {"argument": "Acceptation tacite par absence de contestation pendant 12 mois", "strength": "weak", "legal_basis": "—"},
                    {"argument": "Activation des services confirmée par utilisation (cloud accessible)", "strength": "weak", "legal_basis": "—"},
                ],
                "user_weaknesses": [
                    "12 mois de prélèvements non contestés via courrier formel (uniquement appels téléphoniques)",
                ],
                "worst_outcome_scenario": "SEPA accordé pour 8 mois récents (~€1,600), reste à recouvrer en justice",
            },
        },
        "strategy": {
            "recommended_approach": "offensive",
            "rationale": (
                "Action directe via SEPA (pas de procédure judiciaire nécessaire) — "
                "la banque rembourse automatiquement sur 13 mois. Mise en demeure "
                "parallèle pour résiliation. Probabilité de récupération intégrale "
                "très élevée."
            ),
        },
        "country": "BE",
        "region": "Namur",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 3,
        "recommend_lawyer": False,
        "created_at": _iso(now - timedelta(days=3)),
        "updated_at": _iso(now - timedelta(hours=2)),
        "marketplace_status": "listed",
        "is_demo": True,
    }

    # ── Case 5 — Contrat commercial : rupture freelance (€8,500) ───────────
    c_freelance = {
        "case_id": "case_demo_freelance",
        "user_id": client_user_id,
        "title": "Rupture abusive contrat freelance — €8,500 d'honoraires impayés",
        "type": "commercial",
        "status": "active",
        "risk_score": 52,
        "risk_financial": 65,
        "risk_urgency": 50,
        "risk_legal_strength": 48,
        "risk_complexity": 60,
        "risk_score_history": [],
        "deadline": "2026-06-10",
        "deadline_description": "Réponse à la mise en demeure attendue avant le 10 juin — citation à préparer ensuite",
        "financial_exposure": "EUR 8500",
        "ai_summary": (
            "Mission freelance de 6 mois rompue brutalement à mi-parcours. "
            "€8,500 d'honoraires facturés et impayés + indemnité de rupture "
            "brutale potentielle. Pas de contrat écrit signé, mais 47 emails de "
            "validation des livrables + 3 factures antérieures payées sans "
            "contestation. Issue probable : transaction à 80-90% du montant."
        ),
        "ai_findings": [
            {
                "text": "Réclamer le paiement des honoraires facturés (3 factures impayées)",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. 5.69 nouveau C. civ.",
                "confidence_score": 0.84,
            },
            {
                "text": "Indemnité de rupture brutale de relation commerciale établie",
                "impact": "high", "type": "opportunity",
                "legal_ref": "Art. X.4 CDE",
                "confidence_score": 0.71,
            },
            {
                "text": "Intérêts de retard à 8% (loi paiement 02/08/2002 — relations B2B)",
                "impact": "medium", "type": "opportunity",
                "legal_ref": "Loi du 02/08/2002 art. 5",
                "confidence_score": 0.92,
            },
            {
                "text": "Indemnité forfaitaire de €40 par facture impayée (frais de recouvrement)",
                "impact": "low", "type": "opportunity",
                "legal_ref": "Loi du 02/08/2002 art. 6",
                "confidence_score": 0.95,
            },
            {
                "text": "Absence de contrat écrit — preuves emails essentielles",
                "type": "risk",
                "risk_if_ignored": "Sans contrat écrit, l'existence et l'étendue de la mission doivent être prouvées par les 47 emails — un email manquant peut affaiblir la chaîne",
                "do_now": "Exporter et indexer les 47 emails de validation (objet, date, auteur, instructions) en un seul PDF horodaté",
                "legal_ref": "Art. 8.7 nouveau C. civ.",
                "legal_refs": [
                    {"label": "Art. 8.7 nouveau C. civ.", "archer_explanation": "La charge de la preuve incombe à celui qui invoque l'obligation"},
                ],
                "impact": "high",
                "confidence_score": 0.91,
            },
            {
                "text": "Délai de prescription action commerciale : 5 ans",
                "type": "deadline",
                "risk_if_ignored": "Prescription à 5 ans à compter de chaque facture — pas de risque immédiat, mais le délai court",
                "do_now": "Documenter la date de chaque facture pour figer le point de départ de la prescription",
                "legal_ref": "Art. 2262bis C. civ.",
                "legal_refs": [
                    {"label": "Art. 2262bis C. civ.", "archer_explanation": "Prescription des actions commerciales : 5 ans"},
                ],
                "impact": "low",
                "confidence_score": 0.99,
            },
            {
                "text": "Risque de qualification en relation salariée déguisée",
                "type": "risk",
                "risk_if_ignored": "Si le tribunal requalifie la mission en contrat de travail, l'indemnité commerciale tombe (mais préavis salarial s'ouvre)",
                "do_now": "Vérifier indices d'autonomie : multi-clients, facturation TVA, matériel propre — pour préparer un mémoire préemptif",
                "legal_ref": "Loi du 27/12/2006 sur les relations de travail",
                "legal_refs": [
                    {"label": "Loi 27/12/2006", "archer_explanation": "Critères de distinction entre travailleur indépendant et salarié"},
                ],
                "impact": "medium",
                "confidence_score": 0.42,
            },
            {
                "text": "Conservation impérative des preuves emails et factures payées antérieurement",
                "type": "risk",
                "risk_if_ignored": "Les factures antérieures payées sans contestation sont la preuve clé de l'existence d'une relation commerciale établie",
                "do_now": "Sauvegarder PDF des 3 factures payées + relevés bancaires correspondants (sur clé USB + cloud)",
                "legal_ref": "Art. X.4 CDE",
                "legal_refs": [
                    {"label": "Art. X.4 CDE", "archer_explanation": "Indemnité de rupture en cas de relation commerciale établie"},
                ],
                "impact": "high",
                "confidence_score": 0.88,
            },
        ],
        "ai_next_steps": [
            {
                "title": "Mise en demeure de paiement (€8,500 + intérêts + indemnité)",
                "description": "Recommandé avec accusé de réception — délai 30 jours",
                "action_type": "direct",
                "recipient": "Client commercial",
            },
            {
                "title": "Compiler le dossier emails de validation",
                "description": "47 emails à exporter, horodatés et indexés en PDF",
                "action_type": "verification_required",
                "recipient": "Vous-même",
            },
            {
                "title": "Préparer la citation devant le tribunal de l'entreprise",
                "description": "À déclencher si pas de réponse à la mise en demeure",
                "action_type": "direct",
                "recipient": "Tribunal de l'entreprise Bruxelles",
            },
        ],
        "success_probability": {
            "full_resolution_in_favor": 42,
            "negotiated_settlement": 41,
            "partial_loss": 13,
            "full_loss": 4,
        },
        "battle_preview": {
            "user_side": {
                "strongest_arguments": [
                    {"argument": "47 emails de validation explicite des livrables sur 4 mois — preuve d'exécution acceptée", "strength": "strong", "legal_basis": "Art. 8.7 nouveau C. civ."},
                    {"argument": "3 factures antérieures payées sans contestation — relation commerciale établie", "strength": "strong", "legal_basis": "Art. X.4 CDE"},
                    {"argument": "Rupture brutale sans préavis raisonnable (mission de 6 mois rompue à mi-parcours)", "strength": "medium", "legal_basis": "Art. X.4 CDE"},
                    {"argument": "Intérêts B2B 8% + indemnité forfaitaire €40/facture (acquis automatiquement)", "strength": "strong", "legal_basis": "Loi du 02/08/2002"},
                ],
                "best_outcome_scenario": "Paiement intégral 8,500€ + intérêts + indemnité de rupture (~€11,000 total) via transaction",
            },
            "opposing_side": {
                "opposing_arguments": [
                    {"argument": "Pas de contrat écrit signé — l'étendue de la mission est contestable", "strength": "medium", "legal_basis": "Art. 8.7 nouveau C. civ."},
                    {"argument": "Livrables jugés non conformes au cahier des charges oral", "strength": "weak", "legal_basis": "—"},
                    {"argument": "Tentative de requalification en contrat de travail pour neutraliser l'indemnité commerciale", "strength": "medium", "legal_basis": "Loi 27/12/2006"},
                ],
                "user_weaknesses": [
                    "Aucun contrat écrit pour figer l'étendue exacte des prestations",
                    "Pas de PV de réception des livrables — uniquement validations email",
                ],
                "worst_outcome_scenario": "Transaction à 60% des honoraires (€5,100) sans indemnité de rupture",
            },
        },
        "strategy": {
            "recommended_approach": "négociation",
            "rationale": (
                "Position client solide sur les honoraires (preuve emails + "
                "factures antérieures) mais l'absence de contrat écrit fragilise "
                "l'indemnité de rupture. Stratégie : mise en demeure ferme, "
                "ouverture rapide à une transaction à 80-90% du montant total."
            ),
        },
        "country": "BE",
        "region": "Bruxelles-Capitale",
        "language": "fr",
        "jurisdiction": "BE",
        "document_count": 5,
        "recommend_lawyer": True,
        "created_at": _iso(now - timedelta(days=10)),
        "updated_at": _iso(now - timedelta(hours=18)),
        "marketplace_status": "listed",
        "is_demo": True,
    }

    return [c_travail, c_caution, c_routier, c_telecom, c_freelance]


def build_marketplace_listings(cases: list[dict]) -> list[dict]:
    """5 listings — 1 per demo case. 4 available + 1 locked (caution) for UI variety."""
    now = _now()
    by_id = {c["case_id"]: c for c in cases}

    listings = []

    # Listing 1 — Travail (licenciement) — high stakes, available
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_dismissal"]["case_id"],
        "status": "available",
        "case_type": "employment",
        "case_type_label": "Droit du travail",
        "case_type_icon": "💼",
        "region": "Liège",
        "country": "BE",
        "title": "Licenciement abusif — 8 ans d'ancienneté, motif grave contesté",
        "summary": (
            "8 ans d'ancienneté sans avertissement écrit — motif grave fragile. "
            "Indemnité de préavis (~€12,300) + dommages CCT 109 + indemnité de "
            "protection à explorer. Citation à préparer pour le tribunal du "
            "travail de Liège."
        ),
        "financial_stakes": 18500,
        "risk_score": 45,
        "risk_level": "mid",
        "document_count": 4,
        "price_cents": 12000,
        "created_at": _iso(now - timedelta(minutes=8)),
        "expires_at": _iso(now + timedelta(hours=70)),
        "view_count": 18,
        "current_viewers": [],
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
        "is_demo": True,
    })

    # Listing 2 — Routier (urgent) — high urgency, available
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_speeding"]["case_id"],
        "status": "available",
        "case_type": "traffic",
        "case_type_label": "Routier",
        "case_type_icon": "🚗",
        "region": "Brabant wallon",
        "country": "BE",
        "title": "Excès de vitesse 4ème degré — vice de calibrage radar",
        "summary": (
            "Audience tribunal de police Nivelles le 8 mai. Certificat de "
            "calibrage radar expiré 11 jours avant le PV — argument central. "
            "Risque déchéance permis. Affaire urgente."
        ),
        "financial_stakes": 1200,
        "risk_score": 68,
        "risk_level": "high",
        "document_count": 2,
        "price_cents": 5000,
        "created_at": _iso(now - timedelta(minutes=22)),
        "expires_at": _iso(now + timedelta(hours=58)),
        "view_count": 14,
        "current_viewers": [],
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
        "is_demo": True,
    })

    # Listing 3 — Consommation télécom — available
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_telecom"]["case_id"],
        "status": "available",
        "case_type": "consumer",
        "case_type_label": "Consommation",
        "case_type_icon": "🛒",
        "region": "Namur",
        "country": "BE",
        "title": "Surfacturation télécom €2,400 — prélèvements non autorisés",
        "summary": (
            "12 mois de prélèvements pour services jamais souscrits. Aucun "
            "mandat signé. Délai SEPA encore ouvert (13 mois). Dossier solide — "
            "récupération automatique via banque + résiliation pour faute de "
            "l'opérateur."
        ),
        "financial_stakes": 2400,
        "risk_score": 32,
        "risk_level": "low",
        "document_count": 3,
        "price_cents": 7500,
        "created_at": _iso(now - timedelta(minutes=45)),
        "expires_at": _iso(now + timedelta(hours=63)),
        "view_count": 11,
        "current_viewers": [],
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
        "is_demo": True,
    })

    # Listing 4 — Contrat commercial freelance — available
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_freelance"]["case_id"],
        "status": "available",
        "case_type": "commercial",
        "case_type_label": "Contrat commercial",
        "case_type_icon": "📑",
        "region": "Bruxelles",
        "country": "BE",
        "title": "Rupture abusive contrat freelance — €8,500 honoraires impayés",
        "summary": (
            "Mission 6 mois rompue à mi-parcours. 47 emails de validation des "
            "livrables + 3 factures antérieures payées sans contestation. Pas "
            "de contrat écrit. Honoraires impayés + indemnité de rupture B2B. "
            "Issue probable : transaction."
        ),
        "financial_stakes": 8500,
        "risk_score": 52,
        "risk_level": "mid",
        "document_count": 5,
        "price_cents": 9500,
        "created_at": _iso(now - timedelta(hours=1)),
        "expires_at": _iso(now + timedelta(hours=71)),
        "view_count": 22,
        "current_viewers": [],
        "locked_by": None,
        "locked_at": None,
        "stripe_payment_id": None,
        "is_demo": True,
    })

    # Listing 5 — Bail/Caution — LOCKED (lowest stakes, locked to demo UI variety)
    listings.append({
        "listing_id": f"mkt_demo_{uuid.uuid4().hex[:12]}",
        "case_id": by_id["case_demo_deposit"]["case_id"],
        "status": "locked",
        "case_type": "housing",
        "case_type_label": "Bail · Caution",
        "case_type_icon": "🏠",
        "region": "Bruxelles",
        "country": "BE",
        "title": "Récupération caution locative 1,900€ — état des lieux conforme",
        "summary": (
            "Bailleur refuse la restitution malgré état des lieux de sortie "
            "signé sans réserve. Mise en demeure envoyée — citation juge de "
            "paix si pas de réponse. Dossier très solide."
        ),
        "financial_stakes": 1900,
        "risk_score": 22,
        "risk_level": "low",
        "document_count": 3,
        "price_cents": 6000,
        "created_at": _iso(now - timedelta(hours=3)),
        "expires_at": _iso(now + timedelta(hours=44)),
        "view_count": 7,
        "current_viewers": [],
        "locked_by": "atty_fake_competitor",
        "locked_at": _iso(now - timedelta(minutes=18)),
        "stripe_payment_id": None,
        "is_demo": True,
    })

    return listings


# ══════════════════════════════════════════════════════════════════════════
# Seed orchestration
# ══════════════════════════════════════════════════════════════════════════
async def seed_demo() -> None:
    print("🔧 Suppression des docs is_demo=true existants…")
    # Delete by is_demo flag AND by demo email (case-insensitive). The email
    # cleanup catches stale docs (older seed versions that did not set is_demo,
    # or manual fixtures stored with mixed-case emails). Without this, the
    # unique email index on db.attorneys makes the insert below fail with
    # DuplicateKeyError → login broken.
    client_email_ci = {"$regex": f"^{re.escape(CLIENT_EMAIL)}$", "$options": "i"}
    attorney_email_ci = {"$regex": f"^{re.escape(ATTORNEY_EMAIL)}$", "$options": "i"}
    del_users = await db.users.delete_many(
        {"$or": [{"is_demo": True}, {"email": client_email_ci}]}
    )
    del_attorneys = await db.attorneys.delete_many(
        {"$or": [{"is_demo": True}, {"email": attorney_email_ci}]}
    )
    del_cases = await db.cases.delete_many({"is_demo": True})
    del_listings = await db.case_marketplace.delete_many({"is_demo": True})
    # Demo workaround: legacy attorney_profiles collection — see build_attorney_profile.
    del_profiles = await db.attorney_profiles.delete_many(
        {"$or": [{"is_demo": True}, {"slug": "me"}]}
    )
    print(
        f"   users={del_users.deleted_count} · "
        f"attorneys={del_attorneys.deleted_count} · "
        f"cases={del_cases.deleted_count} · "
        f"listings={del_listings.deleted_count} · "
        f"profiles={del_profiles.deleted_count}"
    )

    print("👤 Insertion client démo…")
    client_doc = build_client_user()
    # Defensive: replace_one upsert handles any leftover doc that survived
    # deletion (e.g., custom Mongo collation on the unique index).
    await db.users.replace_one({"email": CLIENT_EMAIL}, client_doc, upsert=True)

    print("⚖️  Insertion avocat démo…")
    attorney_doc = build_attorney()
    await db.attorneys.replace_one({"email": ATTORNEY_EMAIL}, attorney_doc, upsert=True)
    # Demo workaround — also insert into legacy attorney_profiles so that the
    # /attorneys/{slug} catch-all returns 200 on /api/attorneys/me.
    profile_doc = build_attorney_profile(attorney_doc)
    await db.attorney_profiles.replace_one({"slug": "me"}, profile_doc, upsert=True)

    print("📁 Insertion 5 dossiers client (multi-domaines)…")
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
    print("Cases client     : 5 (travail · bail · routier · conso · commercial)")
    print("Marketplace      : 5 (4 disponibles · 1 pris)")
    print("Attorney status  : active · is_live=true · BE · 5 specialties")
    print("Client plan      : pro (full access, hors Free gating)")
    print("=" * 54)


def main() -> None:
    if not os.environ.get("MONGO_URL") and not os.environ.get("DATABASE_URL"):
        print("⚠️  Aucune var MONGO_URL/DATABASE_URL détectée — vérifie ton .env avant de lancer.", file=sys.stderr)
    asyncio.run(seed_demo())


if __name__ == "__main__":
    main()
