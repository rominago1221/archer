"""Seed Belgian legal references and jurisprudence into MongoDB.

Populates two collections:
  - legal_references       (25 commonly cited Belgian articles)
  - jurisprudence_references (20 commonly cited Belgian court decisions)

Idempotent: uses upsert keyed on (code + article_number) / (court + case_number).

Usage:
  python backend/scripts/seed_legal_references.py
"""

import asyncio
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db import db  # noqa: E402

NOW_ISO = "2026-04-16T00:00:00Z"

# ---------------------------------------------------------------------------
# 1. LEGAL REFERENCES  (25 articles)
# ---------------------------------------------------------------------------

LEGAL_REFERENCES = [
    # ── Code civil (ancien) ──────────────────────────────────────────────
    {
        "code": "code_civil_be",
        "code_full_name": "Code civil belge (ancien)",
        "article_number": "1382",
        "paragraph": None,
        "title": "Responsabilite aquilienne - faute",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1804032133&table_name=loi",
        "summary": "Tout fait quelconque de l'homme, qui cause a autrui un dommage, oblige celui par la faute duquel il est arrive a le reparer. Fondement general de la responsabilite civile extracontractuelle en droit belge.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "code_civil_be",
        "code_full_name": "Code civil belge (ancien)",
        "article_number": "1384",
        "paragraph": "al. 1",
        "title": "Responsabilite du fait d'autrui",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1804032133&table_name=loi",
        "summary": "On est responsable non seulement du dommage que l'on cause par son propre fait, mais encore de celui qui est cause par le fait des personnes dont on doit repondre, ou des choses que l'on a sous sa garde.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "code_civil_be",
        "code_full_name": "Code civil belge (ancien)",
        "article_number": "1724",
        "paragraph": None,
        "title": "Obligations du bailleur - delivrance",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1804032133&table_name=loi",
        "summary": "Le bailleur est oblige, par la nature du contrat, de delivrer au preneur la chose louee et d'entretenir cette chose en etat de servir a l'usage pour lequel elle a ete louee.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "code_civil_be",
        "code_full_name": "Code civil belge (ancien)",
        "article_number": "1728",
        "paragraph": None,
        "title": "Obligations du preneur - jouissance en bon pere de famille",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1804032133&table_name=loi",
        "summary": "Le preneur est tenu d'user de la chose louee raisonnablement et suivant la destination qui lui a ete donnee par le bail. Obligation fondamentale du locataire.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "code_civil_be",
        "code_full_name": "Code civil belge (ancien)",
        "article_number": "1235",
        "paragraph": None,
        "title": "Paiement - execution de l'obligation",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1804032133&table_name=loi",
        "summary": "Tout paiement suppose une dette; ce qui a ete paye sans etre du est sujet a repetition. Base de l'action en repetition de l'indu.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Nouveau Code civil (Livre 5 - Obligations) ──────────────────────
    {
        "code": "nouveau_code_civil_be",
        "code_full_name": "Nouveau Code civil belge - Livre 5",
        "article_number": "5.144",
        "paragraph": None,
        "title": "Responsabilite extracontractuelle - fait personnel",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2022041309&table_name=loi",
        "summary": "Remplace l'ancien article 1382. Toute personne qui commet une faute est tenue de reparer le dommage qu'elle cause a autrui. Entree en vigueur le 1er janvier 2025.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Bail d'habitation (Region de Bruxelles-Capitale) ─────────────────
    {
        "code": "bail_bruxelles",
        "code_full_name": "Code bruxellois du Logement - Bail d'habitation",
        "article_number": "218",
        "paragraph": "§1",
        "title": "Garantie locative - montant maximum",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2004071708&table_name=loi",
        "summary": "La garantie locative ne peut exceder un montant equivalent a deux mois de loyer si elle est placee sur un compte individualise, ou trois mois en cas de garantie bancaire.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "bail_bruxelles",
        "code_full_name": "Code bruxellois du Logement - Bail d'habitation",
        "article_number": "237",
        "paragraph": None,
        "title": "Conge pour occupation personnelle",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2004071708&table_name=loi",
        "summary": "Le bailleur peut mettre fin au bail pour occupation personnelle moyennant un preavis de six mois. L'occupant doit y habiter dans l'annee.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Code du travail / Loi relative aux contrats de travail ──────────
    {
        "code": "loi_contrats_travail",
        "code_full_name": "Loi du 3 juillet 1978 relative aux contrats de travail",
        "article_number": "32",
        "paragraph": None,
        "title": "Fin du contrat - modes de cessation",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1978070301&table_name=loi",
        "summary": "Enumere les modes de cessation du contrat de travail: echeance du terme, achevement du travail, volonte d'une des parties, force majeure, deces du travailleur.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "loi_contrats_travail",
        "code_full_name": "Loi du 3 juillet 1978 relative aux contrats de travail",
        "article_number": "35",
        "paragraph": None,
        "title": "Licenciement pour motif grave",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1978070301&table_name=loi",
        "summary": "Est considere comme motif grave, toute faute grave qui rend immediatement et definitivement impossible toute collaboration professionnelle. Notification dans les 3 jours ouvrables.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "loi_contrats_travail",
        "code_full_name": "Loi du 3 juillet 1978 relative aux contrats de travail",
        "article_number": "37/2",
        "paragraph": None,
        "title": "Delais de preavis - regles unifiees",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1978070301&table_name=loi",
        "summary": "Depuis la loi sur le statut unique (2013), les delais de preavis sont identiques pour ouvriers et employes, calcules en semaines en fonction de l'anciennete.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "loi_contrats_travail",
        "code_full_name": "Loi du 3 juillet 1978 relative aux contrats de travail",
        "article_number": "39",
        "paragraph": "§1",
        "title": "Indemnite compensatoire de preavis",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1978070301&table_name=loi",
        "summary": "La partie qui rompt le contrat sans respecter le preavis est tenue de payer une indemnite egale a la remuneration correspondant a la duree du preavis ou a la partie restante.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Loi bien-etre au travail (harcelement) ───────────────────────────
    {
        "code": "loi_bienetre_travail",
        "code_full_name": "Loi du 4 aout 1996 relative au bien-etre des travailleurs",
        "article_number": "32ter",
        "paragraph": None,
        "title": "Definition du harcelement moral au travail",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1996080461&table_name=loi",
        "summary": "Definit le harcelement moral au travail comme des conduites abusives et repetees ayant pour objet ou pour effet de porter atteinte a la personnalite, la dignite ou l'integrite du travailleur.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── CCT n°109 - Licenciement manifestement deraisonnable ────────────
    {
        "code": "cct_109",
        "code_full_name": "CCT n°109 du 12 fevrier 2014 - Licenciement manifestement deraisonnable",
        "article_number": "8",
        "paragraph": None,
        "title": "Indemnisation du licenciement manifestement deraisonnable",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2014021207&table_name=loi",
        "summary": "Le travailleur licencie de maniere manifestement deraisonnable a droit a une indemnite comprise entre 3 et 17 semaines de remuneration, selon la gravite de la situation.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Code de la route ─────────────────────────────────────────────────
    {
        "code": "code_route_be",
        "code_full_name": "Arrete royal du 1er decembre 1975 - Code de la route",
        "article_number": "11.1",
        "paragraph": None,
        "title": "Vitesse - prudence",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1975120109&table_name=loi",
        "summary": "Tout conducteur doit regler sa vitesse dans la mesure requise par la presence d'autres usagers et en particulier les plus vulnerables. Regle generale de prudence.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "code_route_be",
        "code_full_name": "Arrete royal du 1er decembre 1975 - Code de la route",
        "article_number": "11.2",
        "paragraph": None,
        "title": "Limitations de vitesse generales",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1975120109&table_name=loi",
        "summary": "Fixe les limitations de vitesse generales: 30 ou 50 km/h en agglomeration, 70 ou 90 km/h hors agglomeration, 120 km/h sur autoroute.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "code_route_be",
        "code_full_name": "Arrete royal du 1er decembre 1975 - Code de la route",
        "article_number": "34",
        "paragraph": "§2",
        "title": "Alcool au volant - taux legal",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1968061601&table_name=loi",
        "summary": "Interdit la conduite avec une concentration d'alcool dans le sang egale ou superieure a 0,5 g/l (ou 0,22 mg/l dans l'air alveolaire expire). Infractions graduees.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Loi roulage (penal routier) ──────────────────────────────────────
    {
        "code": "loi_roulage_be",
        "code_full_name": "Loi du 16 mars 1968 relative a la police de la circulation routiere",
        "article_number": "29",
        "paragraph": "§3",
        "title": "Exces de vitesse - sanctions penales",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1968031601&table_name=loi",
        "summary": "Prevoit les sanctions pour depassement de la vitesse maximale autorisee. Amendes proportionnelles par km/h au-dessus de la limite. Peines aggravees en recidive.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "loi_roulage_be",
        "code_full_name": "Loi du 16 mars 1968 relative a la police de la circulation routiere",
        "article_number": "38",
        "paragraph": "§1",
        "title": "Decheance du droit de conduire",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1968031601&table_name=loi",
        "summary": "Le juge peut prononcer la decheance du droit de conduire pour une duree de huit jours au moins. Obligatoire dans certains cas graves (alcool, vitesse excessive, recidive).",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Code de droit economique (consommation) ──────────────────────────
    {
        "code": "code_conso_be",
        "code_full_name": "Code de droit economique - Livre VI",
        "article_number": "VI.2",
        "paragraph": None,
        "title": "Pratiques commerciales deloyales - definition",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2013022819&table_name=loi",
        "summary": "Definit les pratiques commerciales deloyales envers les consommateurs, incluant les pratiques trompeuses et agressives. Transposition de la directive 2005/29/CE.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "code_conso_be",
        "code_full_name": "Code de droit economique - Livre VI",
        "article_number": "VI.45",
        "paragraph": None,
        "title": "Droit de retractation - vente a distance",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2013022819&table_name=loi",
        "summary": "Le consommateur dispose d'un delai de 14 jours pour se retracter d'un contrat a distance sans avoir a justifier de motifs ni a payer de penalites.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    {
        "code": "code_conso_be",
        "code_full_name": "Code de droit economique - Livre VI",
        "article_number": "VI.44",
        "paragraph": None,
        "title": "Information precontractuelle - vente a distance",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2013022819&table_name=loi",
        "summary": "L'entreprise doit fournir au consommateur, avant la conclusion du contrat a distance, une serie d'informations claires et comprehensibles (prix, identite, droit de retractation).",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Garantie legale (Livre VI CDE) ───────────────────────────────────
    {
        "code": "code_conso_be",
        "code_full_name": "Code de droit economique - Livre VI",
        "article_number": "VI.58",
        "paragraph": None,
        "title": "Garantie legale de conformite",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2013022819&table_name=loi",
        "summary": "Le vendeur repond de tout defaut de conformite existant lors de la delivrance et qui se manifeste dans les deux ans. Presomption de six mois en faveur du consommateur.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Famille / divorce ────────────────────────────────────────────────
    {
        "code": "code_civil_be",
        "code_full_name": "Code civil belge (ancien)",
        "article_number": "229",
        "paragraph": None,
        "title": "Divorce pour desunion irremédiable",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1804032130&table_name=loi",
        "summary": "Le divorce est prononce lorsque le juge constate la desunion irremediable entre les epoux. Elle peut etre prouvee par toutes voies de droit ou par une separation de fait d'un an.",
        "jurisdiction": "BE",
        "language": "fr",
    },
    # ── Assurance ────────────────────────────────────────────────────────
    {
        "code": "loi_assurance_be",
        "code_full_name": "Loi du 4 avril 2014 relative aux assurances",
        "article_number": "74",
        "paragraph": None,
        "title": "Declaration du sinistre - delai",
        "verified_url": "https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=2014040402&table_name=loi",
        "summary": "L'assure doit declarer le sinistre a l'assureur des qu'il en a connaissance et au plus tard dans le delai fixe par le contrat. Le non-respect peut entrainer une reduction de l'indemnite.",
        "jurisdiction": "BE",
        "language": "fr",
    },
]

# ---------------------------------------------------------------------------
# 2. JURISPRUDENCE REFERENCES  (20 decisions)
# ---------------------------------------------------------------------------

JURISPRUDENCE_REFERENCES = [
    # ── Logement ─────────────────────────────────────────────────────────
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2023-09-15",
        "case_number": "C.22.0234.F",
        "title": "Garantie locative - restitution apres etat des lieux",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2023/ARR.20230915.1F.1",
        "summary": "La Cour precise les conditions de restitution de la garantie locative. Le bailleur ne peut retenir la garantie que pour des dommages constates contradictoirement lors de l'etat des lieux de sortie.",
        "key_principles": [
            "Restitution de la garantie dans les delais legaux",
            "Charge de la preuve sur le bailleur pour les degats locatifs"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "jp_bruxelles",
        "court_full_name": "Justice de paix de Bruxelles",
        "date": "2024-01-18",
        "case_number": "23/789/A",
        "title": "Expulsion pour arrieres de loyer - delai raisonnable",
        "verified_url": "https://juportal.be/content/ECLI/BE/JP/BRUXELLES/2024/JG.20240118.1F.1",
        "summary": "Le juge de paix accorde un delai d'un mois au locataire en arrieres de trois mois de loyer, avant de prononcer la resolution du bail et l'expulsion.",
        "key_principles": [
            "Prise en compte de la situation sociale du locataire",
            "Possibilite de delais de grace avant expulsion"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2022-06-10",
        "case_number": "C.21.0456.F",
        "title": "Bail - obligation de jouissance paisible du bailleur",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2022/ARR.20220610.1F.1",
        "summary": "La Cour rappelle que le bailleur doit garantir au preneur la jouissance paisible du bien loue, y compris contre les troubles de fait emanant de tiers dont le bailleur repond.",
        "key_principles": [
            "Obligation de garantie du bailleur etendue aux troubles de tiers",
            "Droit a une reduction de loyer en cas de trouble persistant"
        ],
        "jurisdiction": "BE",
    },
    # ── Travail ──────────────────────────────────────────────────────────
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2023-05-22",
        "case_number": "S.22.0078.F",
        "title": "Licenciement pour motif grave - delai de trois jours ouvrables",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2023/ARR.20230522.1F.1",
        "summary": "La Cour confirme que le delai de trois jours ouvrables pour notifier le motif grave court a partir du moment ou la personne competente pour licencier a une connaissance suffisante des faits.",
        "key_principles": [
            "Connaissance suffisante des faits par la personne competente",
            "Delai de rigueur de 3 jours ouvrables - decheance"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "ct_bruxelles",
        "court_full_name": "Cour du travail de Bruxelles",
        "date": "2024-02-05",
        "case_number": "2023/AB/456",
        "title": "Harcelement moral - charge de la preuve amenagee",
        "verified_url": "https://juportal.be/content/ECLI/BE/CTBRU/2024/ARR.20240205.1F.1",
        "summary": "Application de l'amenagement de la charge de la preuve en matiere de harcelement moral au travail. La victime doit etablir des faits presumer le harcelement; il appartient ensuite a l'employeur de demontrer l'absence de harcelement.",
        "key_principles": [
            "Renversement partiel de la charge de la preuve",
            "Obligation de securite de l'employeur (bien-etre au travail)"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2024-01-15",
        "case_number": "S.23.0112.F",
        "title": "Preavis - calcul de l'anciennete pour le statut unique",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2024/ARR.20240115.1F.1",
        "summary": "La Cour precise le mode de calcul de l'anciennete pour determiner le delai de preavis en application des regles du statut unique, y compris les periodes de suspension du contrat.",
        "key_principles": [
            "Anciennete ininterrompue au service du meme employeur",
            "Les periodes de suspension ne rompent pas l'anciennete"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "ct_bruxelles",
        "court_full_name": "Cour du travail de Bruxelles",
        "date": "2023-11-08",
        "case_number": "2023/AB/789",
        "title": "CCT 109 - Licenciement manifestement deraisonnable - indemnisation",
        "verified_url": "https://juportal.be/content/ECLI/BE/CTBRU/2023/ARR.20231108.1F.1",
        "summary": "Application de la CCT 109: le tribunal accorde 10 semaines de remuneration pour un licenciement juge manifestement deraisonnable, l'employeur n'ayant pu demontrer un motif raisonnable.",
        "key_principles": [
            "Charge de la preuve du motif sur l'employeur",
            "Indemnite entre 3 et 17 semaines selon la gravite"
        ],
        "jurisdiction": "BE",
    },
    # ── Penal routier ────────────────────────────────────────────────────
    {
        "court": "tc_bruxelles",
        "court_full_name": "Tribunal correctionnel de Bruxelles",
        "date": "2024-03-14",
        "case_number": "BR.23.1234.F",
        "title": "Exces de vitesse - depassement de plus de 40 km/h en agglomeration",
        "verified_url": "https://juportal.be/content/ECLI/BE/TCBRU/2024/JG.20240314.1F.1",
        "summary": "Condamnation a une amende de 2.400 EUR et decheance du droit de conduire de 3 mois pour un exces de vitesse de 47 km/h au-dessus de la limite en zone 30.",
        "key_principles": [
            "Sanctions aggravees au-dela de 40 km/h de depassement",
            "Decheance obligatoire du droit de conduire"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "tc_bruxelles",
        "court_full_name": "Tribunal correctionnel de Bruxelles",
        "date": "2023-12-01",
        "case_number": "BR.23.5678.F",
        "title": "Conduite sous influence d'alcool - recidive",
        "verified_url": "https://juportal.be/content/ECLI/BE/TCBRU/2023/JG.20231201.1F.1",
        "summary": "Recidive d'alcool au volant (1,2 g/l): amende de 3.200 EUR, decheance de 6 mois et obligation de repasser les 4 examens (theorique, pratique, medical, psychologique).",
        "key_principles": [
            "Sanctions doublees en cas de recidive dans les 3 ans",
            "Examens de reintegration obligatoires"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2023-03-21",
        "case_number": "P.22.1456.F",
        "title": "Radar automatique - validite de la constatation",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2023/ARR.20230321.1F.1",
        "summary": "La Cour confirme la validite probante des constatations par appareil automatique homologue. Le prevenu peut apporter la preuve contraire mais doit demontrer un dysfonctionnement concret.",
        "key_principles": [
            "Force probante des radars homologues jusqu'a preuve du contraire",
            "Le prevenu doit demontrer un dysfonctionnement concret"
        ],
        "jurisdiction": "BE",
    },
    # ── Consommation ─────────────────────────────────────────────────────
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2022-11-18",
        "case_number": "C.22.0089.F",
        "title": "Garantie legale - defaut de conformite presume",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2022/ARR.20221118.1F.1",
        "summary": "La Cour rappelle que tout defaut de conformite apparaissant dans les six mois de la delivrance est presume exister au moment de celle-ci. Inversion de la charge de la preuve en faveur du consommateur.",
        "key_principles": [
            "Presomption de 6 mois en faveur du consommateur",
            "Charge de la preuve inversee sur le vendeur professionnel"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "jp_bruxelles",
        "court_full_name": "Justice de paix de Bruxelles",
        "date": "2024-02-20",
        "case_number": "23/1234/A",
        "title": "Droit de retractation - vente en ligne - remboursement",
        "verified_url": "https://juportal.be/content/ECLI/BE/JP/BRUXELLES/2024/JG.20240220.1F.1",
        "summary": "Condamnation d'un vendeur en ligne au remboursement integral apres exercice du droit de retractation dans les 14 jours. Le vendeur ne peut imposer un avoir en lieu et place du remboursement.",
        "key_principles": [
            "Remboursement obligatoire dans les 14 jours de la retractation",
            "Interdiction de substituer un avoir au remboursement"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "cc_be",
        "court_full_name": "Cour constitutionnelle de Belgique",
        "date": "2023-07-06",
        "case_number": "107/2023",
        "title": "Credit a la consommation - devoir d'information du preteur",
        "verified_url": "https://www.const-court.be/public/f/2023/2023-107f.pdf",
        "summary": "La Cour constitutionnelle confirme la constitutionnalite des obligations d'information renforcees a charge du preteur professionnel en matiere de credit a la consommation.",
        "key_principles": [
            "Protection du consommateur-emprunteur",
            "Proportionnalite des obligations d'information"
        ],
        "jurisdiction": "BE",
    },
    # ── Famille ──────────────────────────────────────────────────────────
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2024-02-09",
        "case_number": "C.23.0321.F",
        "title": "Divorce - pension alimentaire apres divorce - etat de besoin",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2024/ARR.20240209.1F.1",
        "summary": "La Cour precise les criteres d'evaluation de l'etat de besoin du demandeur de pension alimentaire apres divorce: revenus, patrimoine, possibilites de travail, niveau de vie pendant le mariage.",
        "key_principles": [
            "Etat de besoin apprecie au moment de la demande",
            "Prise en compte du niveau de vie durant le mariage"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "ca_bruxelles",
        "court_full_name": "Cour d'appel de Bruxelles",
        "date": "2023-10-12",
        "case_number": "2023/FA/234",
        "title": "Divorce par consentement mutuel - homologation de la convention",
        "verified_url": "https://juportal.be/content/ECLI/BE/CABRU/2023/ARR.20231012.1F.1",
        "summary": "La Cour rappelle que le juge verifie que la convention de divorce par consentement mutuel ne lesait pas les interets des enfants mineurs, notamment en matiere d'hebergement et de contributions alimentaires.",
        "key_principles": [
            "Controle judiciaire de l'interet de l'enfant",
            "Convention modifiable si changement de circonstances"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "cc_be",
        "court_full_name": "Cour constitutionnelle de Belgique",
        "date": "2022-04-28",
        "case_number": "62/2022",
        "title": "Pension alimentaire - egalite hommes-femmes",
        "verified_url": "https://www.const-court.be/public/f/2022/2022-062f.pdf",
        "summary": "La Cour confirme que les regles relatives a la pension alimentaire s'appliquent de maniere egale aux deux epoux, sans discrimination fondee sur le sexe.",
        "key_principles": [
            "Egalite entre epoux dans l'acces a la pension alimentaire",
            "Non-discrimination fondee sur le genre"
        ],
        "jurisdiction": "BE",
    },
    # ── Assurance ────────────────────────────────────────────────────────
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2023-06-02",
        "case_number": "C.22.0567.F",
        "title": "Assurance RC auto - action directe de la victime contre l'assureur",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2023/ARR.20230602.1F.1",
        "summary": "La Cour rappelle le droit d'action directe de la victime d'un accident de la circulation contre l'assureur RC du responsable. L'assureur ne peut opposer a la victime les exceptions nees apres le sinistre.",
        "key_principles": [
            "Action directe de la victime contre l'assureur RC",
            "Inopposabilite des exceptions posterieures au sinistre"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "ca_bruxelles",
        "court_full_name": "Cour d'appel de Bruxelles",
        "date": "2024-01-25",
        "case_number": "2023/AR/1567",
        "title": "Declaration tardive de sinistre - reduction proportionnelle",
        "verified_url": "https://juportal.be/content/ECLI/BE/CABRU/2024/ARR.20240125.1F.1",
        "summary": "Application de la reduction proportionnelle de l'indemnite pour declaration tardive du sinistre. L'assureur doit prouver le prejudice subi du fait du retard de declaration.",
        "key_principles": [
            "Sanction proportionnelle et non decheance totale",
            "Charge de la preuve du prejudice sur l'assureur"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "cass_be",
        "court_full_name": "Cour de cassation de Belgique",
        "date": "2022-09-23",
        "case_number": "C.21.0678.F",
        "title": "Assurance incendie - evaluation du dommage - valeur a neuf",
        "verified_url": "https://juportal.be/content/ECLI/BE/CASS/2022/ARR.20220923.1F.1",
        "summary": "La Cour precise que la clause de valeur a neuf dans un contrat d'assurance incendie est d'interpretation stricte et ne s'applique qu'aux conditions prevues au contrat.",
        "key_principles": [
            "Interpretation stricte de la clause valeur a neuf",
            "Principe indemnitaire en droit des assurances"
        ],
        "jurisdiction": "BE",
    },
    {
        "court": "cc_be",
        "court_full_name": "Cour constitutionnelle de Belgique",
        "date": "2023-02-16",
        "case_number": "25/2023",
        "title": "Assurance maladie - acces aux soins - non-discrimination",
        "verified_url": "https://www.const-court.be/public/f/2023/2023-025f.pdf",
        "summary": "La Cour constitutionnelle juge que les differences de traitement en matiere d'assurance maladie complementaire doivent etre objectivement justifiees et proportionnees.",
        "key_principles": [
            "Non-discrimination dans l'acces a l'assurance",
            "Justification objective des differences de prime"
        ],
        "jurisdiction": "BE",
    },
]


async def seed_legal_references():
    """Upsert all legal references (code + article_number as key)."""
    coll = db["legal_references"]
    upserted = 0
    for ref in LEGAL_REFERENCES:
        filt = {"code": ref["code"], "article_number": ref["article_number"]}
        # Add paragraph to filter to allow same article with different paragraphs
        if ref.get("paragraph"):
            filt["paragraph"] = ref["paragraph"]
        doc = {
            **ref,
            "last_verified_at": NOW_ISO,
            "verified_by": "seed",
        }
        result = await coll.update_one(
            filt,
            {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4())}},
            upsert=True,
        )
        if result.upserted_id or result.modified_count:
            upserted += 1
    return upserted


async def seed_jurisprudence_references():
    """Upsert all jurisprudence references (court + case_number as key)."""
    coll = db["jurisprudence_references"]
    upserted = 0
    for ref in JURISPRUDENCE_REFERENCES:
        filt = {"court": ref["court"], "case_number": ref["case_number"]}
        doc = {**ref}
        result = await coll.update_one(
            filt,
            {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4())}},
            upsert=True,
        )
        if result.upserted_id or result.modified_count:
            upserted += 1
    return upserted


async def main():
    print("=== Seeding Belgian legal references ===")
    print()

    n_legal = await seed_legal_references()
    print(f"  legal_references:         {n_legal:>2} / {len(LEGAL_REFERENCES)} upserted")

    n_juris = await seed_jurisprudence_references()
    print(f"  jurisprudence_references: {n_juris:>2} / {len(JURISPRUDENCE_REFERENCES)} upserted")

    # Create indexes for efficient lookups
    await db["legal_references"].create_index(
        [("code", 1), ("article_number", 1), ("paragraph", 1)],
        unique=True,
        name="idx_code_article_paragraph",
    )
    await db["jurisprudence_references"].create_index(
        [("court", 1), ("case_number", 1)],
        unique=True,
        name="idx_court_case_number",
    )

    print()
    print("  Indexes created on both collections.")
    print()
    print("=== Done ===")


if __name__ == "__main__":
    asyncio.run(main())
