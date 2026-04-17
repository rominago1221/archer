"""Per-case_type expertise blocks injected into analysis prompts.

One block per case_type × jurisdiction. Blocks are terse (~200 tokens) and
surgical — they list the frameworks, laws, and common pitfalls Claude must
apply. Full prose persona stays in SENIOR_ATTORNEY_PERSONA; this module
produces the domain-specific addendum grafted onto PASS 2 / 3 / 4A / 4B / 5.

Structure:
  CASE_TYPE_EXPERTISE[case_type][jurisdiction]  →  str

jurisdiction key is "BE" or "US". Unknown case_types fall back to "other",
unknown jurisdictions fall back to "US".
"""
from typing import Optional

# ═══════════════════════════════════════════════════════════════════════════
# Blocks
# ═══════════════════════════════════════════════════════════════════════════

_BE = {}
_US = {}

# ─── HOUSING ──────────────────────────────────────────────────────────────
_BE["eviction"] = """DOMAINE: ÉVICTION / BAIL RÉSIDENTIEL (droit belge)
Cadres: Loi du 20/02/1991 sur les baux (régime résidence principale), Code civil art. 1714-1762bis, Code judiciaire art. 1344bis-decies (procédure d'expulsion), Ordonnance Bxl-Cap. 19/10/2017, Décret wallon 15/03/2018, Vlaams Woninghuurdecreet 09/11/2018.
Points à vérifier: enregistrement du bail (obligation bailleur), garantie locative max 2 mois (Bxl/Wallonie) ou 3 mois (Flandre), état des lieux d'entrée daté et signé, indexation conforme à l'indice santé, motif de congé légalement recevable + délais de préavis exacts, respect de la trêve hivernale régionale, compétence exclusive du juge de paix.
Pièges fréquents: congés sans motif valable, restitution de garantie retenue abusivement, travaux à charge du locataire vs bailleur, sous-location non autorisée, présence enfants majeurs et bail glissant.
Mentionner systématiquement l'URL ejustice.be pour toute loi citée."""

_US["eviction"] = """DOMAIN: EVICTION / RESIDENTIAL LEASE (U.S. law)
Frameworks: state landlord-tenant acts (Fla. Stat. Ch. 83, Cal. Civ. Code §§ 1940-1954.05, N.Y. RPL), Fair Housing Act (42 U.S.C. §§ 3601-3619), state security-deposit statutes, local rent-control ordinances (NYC RSC, SF Rent Board, LA RSO), CDC/federal eviction moratoria if temporally relevant.
Check: type of tenancy (month-to-month vs fixed-term), proper notice period per state (3/7/30/60-day), notice content requirements (Cal. CCP § 1161, Fla. Stat. § 83.56), habitability warranty, security deposit accounting timeline (14-30 days typical), retaliation defense, self-help eviction prohibition.
Common pitfalls: improper service, vague notice, discrimination defenses under FHA, tenant cure rights, small claims for deposit recovery."""

_BE["real_estate"] = """DOMAINE: IMMOBILIER / COPROPRIÉTÉ / VOISINAGE (droit belge)
Cadres: Code civil art. 1582-1701 (vente), art. 1641-1649 (vices cachés), Loi 30/06/1994 sur la copropriété, Code civil livre 3 (droit des biens), art. 544 (troubles de voisinage), jurisprudence Cass. sur la responsabilité objective du propriétaire.
Points à vérifier: délai de prescription vices cachés (bref délai à partir de la découverte), contenu obligatoire acte authentique, certificats PEB/électrique/mazout, procès-verbaux ACP, quote-parts charges communes, servitudes enregistrées, permis d'urbanisme, troubles anormaux de voisinage.
Pièges fréquents: clauses de style exonérant le vendeur (non opposables au vendeur professionnel), vice de consentement, empiètement, nuisances sonores répétées."""

_US["real_estate"] = """DOMAIN: REAL ESTATE / PROPERTY / HOA (U.S. law)
Frameworks: state real estate contract laws, UCC Article 2A for certain fixtures, Statute of Frauds, state disclosure statutes (e.g. Cal. Civ. Code § 1102, Fla. Stat. § 475.278), HOA covenants and Davis-Stirling Act (CA), Uniform Condominium Act (adopting states), Marketable Title Acts, RESPA for closing.
Check: inspection contingency timing, seller disclosure scope (especially for latent defects), title insurance exceptions, HOA CC&Rs restrictions, easements of record, boundary by agreement / acquiescence, constructive eviction standards.
Common pitfalls: as-is clauses and their limits, mortgage contingency financing, ADR clauses in purchase agreements, retaliatory HOA enforcement."""

# ─── EMPLOYMENT ──────────────────────────────────────────────────────────
_BE["wrongful_termination"] = """DOMAINE: LICENCIEMENT ABUSIF (droit belge)
Cadres: Loi du 03/07/1978 sur les contrats de travail (art. 32 motifs graves, art. 63 licenciement abusif ouvrier, art. 35 indemnités), CCT 109 (motivation du licenciement), Loi du 26/12/2013 unifiant statuts, jurisprudence Cass. sur motif grave et abus de droit.
Points à vérifier: délai de 3 jours ouvrables pour invoquer motif grave après connaissance, motivation écrite demandée sous 2 mois (CCT 109 — sanction 2 semaines rémunération), délais de préavis Claeys ou barèmes, solde de tout compte contesté avec réserves, préavis pendant maladie/grossesse/crédit-temps/congé parental (protection), C4 correct pour chômage.
Pièges: requalification de motif grave en préavis insuffisant, représailles liées à plainte harcèlement, licenciement collectif (loi Renault 13/02/1998)."""

_US["wrongful_termination"] = """DOMAIN: WRONGFUL TERMINATION (U.S. law)
Frameworks: at-will doctrine + exceptions (public policy, implied contract, covenant of good faith), Title VII (42 U.S.C. § 2000e), ADA (42 U.S.C. § 12101), ADEA (29 U.S.C. § 621), FMLA retaliation (29 U.S.C. § 2615), state WARN Acts, NLRA § 7 for concerted activity, whistleblower statutes (SOX, Dodd-Frank, state).
Check: protected-class membership, temporal proximity to protected activity, stated vs. actual reason (pretext analysis under McDonnell Douglas), employee handbook as implied contract, state-specific implied covenant, constructive discharge elements.
Common pitfalls: forced arbitration clauses, severance-conditioned releases, mixed-motive vs. but-for causation, short EEOC filing window (180/300 days)."""

_BE["severance"] = """DOMAINE: INDEMNITÉ DE DÉPART (droit belge)
Cadres: Loi du 03/07/1978 art. 39 et suivants (indemnité compensatoire préavis), Claeys formula + CCT 84 (durée préavis pour cadres supérieurs), art. 40 (indemnité protection), Loi statut unique 2014.
Points à vérifier: calcul exact de l'indemnité (rémunération annuelle × nombre de mois), prise en compte avantages en nature et bonus, protection spéciale (DS, conseil entreprise, CPPT), cumul indemnité protection + préavis, outplacement obligatoire (45+ ans, 30+ semaines), clause non-concurrence (durée max 12 mois, indemnité min).
Pièges: bonus non inclus dans la base, solde de tout compte signé sans réserve, renonciation à des droits indisponibles."""

_US["severance"] = """DOMAIN: SEVERANCE (U.S. law)
Frameworks: OWBPA (29 U.S.C. § 626(f)) for ADEA waivers (21/45-day consideration + 7-day revocation), ERISA for severance plans, state-specific severance laws (MA, PR, NJ plant closings), tax treatment under IRC § 409A.
Check: release scope (known vs. unknown claims), carve-outs required (EEOC cooperation, whistleblower claims, vested benefits), non-compete enforceability per state (CA/ND/OK ban; FTC rule), garden-leave arrangements, WARN/mini-WARN notice obligations, neutral-reference clauses.
Common pitfalls: invalid ADEA waivers (21-day minimum), overly broad non-solicits, unclear COBRA continuation obligations, 409A penalties on deferred payments."""

_BE["workplace_discrimination"] = """DOMAINE: DISCRIMINATION AU TRAVAIL (droit belge)
Cadres: Loi du 10/05/2007 luttant contre certaines formes de discrimination (critères protégés), Loi du 30/07/1981 (racisme/xénophobie), Loi du 10/05/2007 genre, CCT 95 relations de travail, Directive 2000/78/CE, Unia compétent.
Points à vérifier: critère protégé (âge, origine, sexe, handicap, orientation, convictions, état de santé…), preuve par présomption + renversement de charge, aménagements raisonnables (handicap), dommages-intérêts forfaitaires 6 mois rémunération, protection contre représailles.
Pièges: preuve directe rare (analyse comparative nécessaire), harcèlement discriminatoire cumulé avec harcèlement moral, action Unia en parallèle de tribunal du travail."""

_US["workplace_discrimination"] = """DOMAIN: WORKPLACE DISCRIMINATION (U.S. law)
Frameworks: Title VII (race/color/religion/sex/national origin/pregnancy), ADA, ADEA (40+), GINA, Section 1981 for race, state FEPAs (CA FEHA, NY HRL, etc.), municipal ordinances.
Check: protected class, adverse action, causation (mixed motive vs. but-for), McDonnell Douglas burden-shifting, disparate impact vs. disparate treatment, reasonable accommodation interactive process (ADA/Title VII religion), administrative exhaustion (EEOC/DFEH filing, right-to-sue letter).
Common pitfalls: tight 180/300-day EEOC window, continuing violation doctrine scope, faragher/ellerth affirmative defense, same-actor inference."""

_BE["harassment"] = """DOMAINE: HARCÈLEMENT AU TRAVAIL (droit belge)
Cadres: Loi du 04/08/1996 bien-être au travail modifiée 28/02/2014, AR du 10/04/2014 (procédures), Code pénal social art. 119 (sanctions employeur), CCT 72, compétence CCT + conseiller prévention aspects psychosociaux.
Points à vérifier: qualification harcèlement moral vs sexuel vs violence, demande d'intervention psychosociale formelle/informelle, protection contre représailles (licenciement nul + indemnité 6 mois), tiers payant par CEPPT, dépôt plainte SPF Emploi.
Pièges: stress au travail n'est PAS du harcèlement, conflit interpersonnel ≠ harcèlement caractérisé, obligation employeur analyse des risques psychosociaux."""

_US["harassment"] = """DOMAIN: WORKPLACE HARASSMENT (U.S. law)
Frameworks: Title VII hostile work environment standard (severe OR pervasive), Meritor/Harris/Faragher/Ellerth cases, EEOC guidance 1990/2024, state laws (CA FEHA, NYSHRL 2019 amendments lowering severity threshold), #MeToo-era legislation (MA anti-NDA, CA Silenced No More).
Check: unwelcome conduct, based on protected trait, severity/pervasiveness, tangible employment action vs. environment-only, employer knowledge + corrective action, vicarious liability via supervisor.
Common pitfalls: off-duty conduct reaching work, bystander standing, same-sex harassment (Oncale), retaliation easier to prove than underlying claim."""

# ─── FINANCIAL ───────────────────────────────────────────────────────────
_BE["consumer_disputes"] = """DOMAINE: LITIGES CONSOMMATION (droit belge)
Cadres: Code de droit économique Livre VI (pratiques du marché et protection du consommateur), Livre XVII (procédures judiciaires), Loi 01/09/2004 sur la vente, Directive 2011/83/UE transposée, garantie légale 2 ans sur biens de consommation (art. 1649bis-octies CC).
Points à vérifier: qualité consommateur/professionnel, information précontractuelle obligatoire, droit de rétractation 14 jours (vente à distance), garantie de conformité, clauses abusives (liste noire/grise), pratiques commerciales déloyales et trompeuses, inertie commerciale interdite.
Pièges: clauses exonératoires disproportionnées, frais cachés, abonnements tacite reconduction, achats groupés numériques, médiation Belmed / SPF Économie."""

_US["consumer_disputes"] = """DOMAIN: CONSUMER DISPUTES (U.S. law)
Frameworks: state UDAP statutes (e.g. Fla. DUTPA, Cal. CLRA/UCL), Magnuson-Moss Warranty Act (15 U.S.C. § 2301), state lemon laws, UCC Article 2 warranties, FTC Act § 5, CPSC recalls, state deceptive trade acts.
Check: express/implied warranty terms, merchantability, fitness for purpose, breach + notice, lemon-law threshold (attempts + days OOS), treble damages + attorney's fees availability under UDAP.
Common pitfalls: mandatory arbitration clauses (Epic Systems), class action waivers, limitation of liability caps (must be conspicuous + not unconscionable)."""

_BE["debt"] = """DOMAINE: DETTE / CRÉANCE / RECOUVREMENT (droit belge)
Cadres: Loi du 20/12/2002 recouvrement amiable dettes consommateur, Code judiciaire saisies (art. 1409-1544), Livre XIX CDE dettes consommateur (mise en demeure + délai 14 jours + plafonnement frais), prescription civile 10 ans (art. 2262bis CC), commerciale 5 ans.
Points à vérifier: validité mise en demeure (titre, montant, fondement, décompte détaillé), calcul intérêts légaux conformes, respect règles recouvrement (pas d'appels avant 8h/après 21h, pas plus de 2x/semaine, info précontractuelle), saisie sur rémunération plafonnée barème indexé.
Pièges: frais de recouvrement disproportionnés (frais pour mise en demeure max 40 €), clauses pénales réductibles, compensation de dettes, règlement collectif de dettes (RCD)."""

_US["debt"] = """DOMAIN: DEBT COLLECTION (U.S. law)
Frameworks: FDCPA (15 U.S.C. § 1692), FCRA (15 U.S.C. § 1681), state debt collection acts (Rosenthal Act CA, NY GBL), TCPA for call restrictions, state statutes of limitations (3-6 years typical on credit card), garnishment limits (CCPA 25% of disposable).
Check: validation notice (§ 1692g 5-day), cease-and-desist rights, third-party disclosure violations, time/place restrictions, mini-Miranda in initial contact, time-barred debt re-aging.
Common pitfalls: zombie debt buyers lacking chain of title, improper 1099-C cancellation of debt reporting, bankruptcy Chapter 7/13 alternatives, settlement tax consequences."""

_BE["insurance_disputes"] = """DOMAINE: LITIGES ASSURANCE (droit belge)
Cadres: Loi du 04/04/2014 relative aux assurances (art. 54 déclaration sinistre, 52 délai 30 jours réponse assureur), Code droit économique Livre IV (contrats financiers), AR exécution, jurisprudence sur mauvaise foi et abus de droit assureur.
Points à vérifier: clauses de la police (interprétation contra proferentem), exclusions formelles dans une clause distincte et visible, délai déclaration respecté par preneur, expertise contradictoire si désaccord montant, délai 30 jours pour décision assureur, intérêts moratoires.
Pièges: sous-assurance et règle proportionnelle, fausse déclaration intentionnelle vs bonne foi, franchise appliquée, litige avec Ombudsman des Assurances (gratuit, avant tribunal)."""

_US["insurance_disputes"] = """DOMAIN: INSURANCE DISPUTES (U.S. law)
Frameworks: state insurance codes, NAIC Unfair Claim Settlement Practices Act, state bad-faith common law (e.g. Crisci Cal. 1967), ERISA § 502(a)(1)(B) for employer-sponsored plans, state PIP/UM statutes, Prompt Pay Acts.
Check: policy interpretation (ambiguity → insured), first-party vs. third-party claim, reservation of rights letters, statutory unfair practices, damages breakdown (contract + consequential + bad-faith punitives where allowed).
Common pitfalls: ERISA preemption of state bad-faith (limited de novo review), time-limited demand letters under Arch v. GEICO, appraisal clauses, anti-assignment clauses."""

_BE["tax_disputes"] = """DOMAINE: LITIGES FISCAUX (droit belge)
Cadres: CIR 92 (Code des impôts sur les revenus), Code TVA, Code de procédure fiscale, AR procédure de réclamation, décrets régionaux droits de succession/enregistrement/ISCALE.
Points à vérifier: délai de réclamation (6 mois à dater de l'envoi AER), recours contre décision SPF Finances, voies d'exécution (contrainte), dégrèvement d'office (art. 376 CIR), transaction avec administration, abus fiscal vs optimisation, prescription 3/5/7/10 ans selon fraude.
Pièges: signature reçue entame délai, forclusion stricte, preuve dépenses professionnelles réelles, exonérations régionales immobilières."""

_US["tax_disputes"] = """DOMAIN: TAX DISPUTES (U.S. law)
Frameworks: IRC, Tax Court Rules, IRS procedures (CDP hearings, OIC § 7122, installment agreements § 6159), FBAR/FATCA disclosures, state tax codes, TBOR (Taxpayer Bill of Rights).
Check: 30-day letter vs 90-day Statutory Notice of Deficiency (petition to Tax Court), innocent spouse relief (§ 6015), penalty abatement for reasonable cause, offer in compromise eligibility (DATL/DATC/ETA), collection due process rights.
Common pitfalls: missed SNOD deadline (loses Tax Court path), trust fund recovery penalty on owners, tax liens priority vs. other creditors, state conformity differences."""

_BE["identity_theft"] = """DOMAINE: VOL D'IDENTITÉ / FRAUDE (droit belge)
Cadres: Code pénal art. 210bis et 504quater (fraude informatique), Loi 05/12/2006 paiements électroniques, RGPD + Loi vie privée 30/07/2018, Loi 22/04/2016 sur la prévention fraude, compétence Centre de Cybercriminalité fédéral.
Points à vérifier: dépôt plainte pénale immédiat + attestation, blocage cartes via Card Stop, signalement banque (remboursement opération non autorisée art. VII.35 CDE sauf négligence grave), demande radiation BNB/Centrale crédit, plainte APD (données personnelles).
Pièges: négligence grave (PIN écrit, code SMS partagé), délai de réclamation 13 mois pour opérations non autorisées, phishing vs faute du consommateur."""

_US["identity_theft"] = """DOMAIN: IDENTITY THEFT / FRAUD (U.S. law)
Frameworks: FCRA § 605B (block credit reporting), FACTA § 151 (free fraud alerts), FTC IdentityTheft.gov affidavit, state ID theft passport programs (TX, OH), 18 U.S.C. § 1028A aggravated ID theft.
Check: file FTC Identity Theft Report, place fraud alert (initial 1-year) or credit freeze (free, state law), dispute fraudulent accounts (FCRA 30-day), law enforcement report, SSN replacement eligibility.
Common pitfalls: synthetic identity (mixed real/fake SSN), ITIN misuse, tax-return identity theft (IRS IP PIN), medical identity theft (HIPAA breach notice)."""

# ─── HEALTH ──────────────────────────────────────────────────────────────
_BE["medical_malpractice"] = """DOMAINE: ERREUR MÉDICALE (droit belge)
Cadres: Loi du 22/08/2002 droits du patient, Loi du 31/03/2010 indemnisation dommages médicaux (FAM), Loi blanche, Code civil art. 1382-1383, jurisprudence Cass. responsabilité faute + aléa thérapeutique.
Points à vérifier: dossier médical complet (droit d'accès), information et consentement éclairé documentés, faute déontologique ou technique vs aléa non-fautif, causalité certaine (perte de chance = damage distinct), expertise contradictoire, compétence FAM pour accidents sans faute ≥ 25% IPP.
Pièges: prescription 5 ans à dater connaissance dommage + identité (art. 2262bis § 1er al. 2 CC), aléa thérapeutique vs faute, preuve du manquement au standard de soins."""

_US["medical_malpractice"] = """DOMAIN: MEDICAL MALPRACTICE (U.S. law)
Frameworks: state-specific medical malpractice acts, common-law elements (duty, breach, causation, damages), state-mandated certificate/affidavit of merit (FL, NJ, PA, etc.), damage caps (non-economic caps in CA MICRA $350k, TX $250k, etc.), statute of limitations + discovery rule + statute of repose.
Check: standard of care + expert qualifications, informed consent violation, res ipsa loquitur (foreign object), lost-chance doctrine, Good Samaritan exception, HIPAA records requests.
Common pitfalls: short SOL (often 2 years + discovery), pre-suit notice periods, tort reform caps, hospital corporate-negligence theories."""

_BE["disability_claims"] = """DOMAINE: INVALIDITÉ / INCAPACITÉ (droit belge)
Cadres: Loi relative à l'assurance maladie-invalidité (INAMI), AR 16/03/1968 allocations handicapés, Loi 27/02/1987 + AR exécution, compétence Tribunal du travail (section) + SPF Sécurité sociale.
Points à vérifier: taux d'incapacité reconnu par médecin-conseil mutuelle vs médecin du travail vs médecin INAMI, reconnaissance handicap DGPH (aide revenus), allocation intégration + aide tierce personne, recours contre décision INAMI (délai 3 mois), cumul avec pension, congé maladie/invalidité distinction.
Pièges: différence capacité de gain vs capacité médicale, expertise adversaire, rechutes pas automatiquement reconnues."""

_US["disability_claims"] = """DOMAIN: DISABILITY CLAIMS (U.S. law)
Frameworks: SSDI/SSI (42 U.S.C. § 423), ADA Title I (accommodation), FMLA (12-week job-protected), state workers' comp statutes, ERISA LTD plans (§ 502), VA disability ratings, railroad/federal employee programs.
Check: SSA five-step sequential evaluation, substantial gainful activity (SGA 2026 threshold), residual functional capacity, treating physician rule post-2017, ERISA de novo vs. arbitrary & capricious review, COBRA interaction.
Common pitfalls: failure to exhaust admin appeals (SSA reconsideration/ALJ/Appeals Council/Federal Court), pre-existing condition exclusions, offset provisions, onset date disputes."""

# ─── PERSONAL ────────────────────────────────────────────────────────────
_BE["family"] = """DOMAINE: FAMILLE (droit belge)
Cadres: Code civil Livres I-II, Loi 27/04/2007 réforme divorce, Loi 30/07/2013 création Tribunal famille, Code judiciaire compétences JP/TF, Loi du 08/04/1965 protection jeunesse + Communautés (aide jeunesse).
Points à vérifier: fondement divorce (DC désunion irrémédiable vs consentement mutuel), autorité parentale conjointe vs exclusive, hébergement égalitaire vs principal, contributions alimentaires calcul (tables SPF Justice), pension alimentaire entre ex-époux + durée, liquidation-partage communauté, SECAL créances alimentaires.
Pièges: accords notariés modifiables uniquement au motif grave, audition enfants 12+ obligatoire, ordonnance de protection (art. 223 CC)."""

_US["family"] = """DOMAIN: FAMILY LAW (U.S. law)
Frameworks: state family codes, UCCJEA (jurisdiction for custody), UIFSA (interstate child support), UPAA (premarital agreements), VAWA (domestic violence protections), state child-support guidelines, federal QDRO for retirement splits.
Check: jurisdiction (home-state rule for child, domicile for divorce), best-interests factors, imputed income for support, relocation standards, custody modification material change, DVPO issuance standards.
Common pitfalls: automatic temporary restraining orders on filing, prenup unconscionability at execution + enforcement, tax consequences of alimony post-2018 TCJA, social-security split."""

_BE["criminal"] = """DOMAINE: PÉNAL (droit belge)
Cadres: Code pénal, Code d'instruction criminelle, Loi 29/11/2012 et suivantes (réforme Salduz), Convention Européenne Droits de l'Homme art. 6, Loi sur la détention préventive 20/07/1990.
Points à vérifier: droit au silence, assistance avocat Salduz immédiate dès privation de liberté, juge d'instruction vs parquet fédéral, contrôle détention préventive chambre du conseil/mises en accusation, droits de la défense accès dossier, transaction pénale étendue, partie civile.
Pièges: procédure accélérée (comparution immédiate, sommaire), extradition, casier judiciaire effacement/réhabilitation. POUR CRIMES SÉRIEUX: orienter impérativement vers pénaliste spécialisé."""

_US["criminal"] = """DOMAIN: CRIMINAL DEFENSE (U.S. law)
Frameworks: 4th/5th/6th Amendment, Miranda v. Arizona, state criminal codes, federal criminal procedure (Fed. R. Crim. P.), Brady v. Maryland disclosure, Strickland ineffective-assistance standard.
Check: stop/search legality (Terry/Carroll), Miranda triggers, custodial interrogation, plea offers vs. trial odds, diversion/deferred judgment eligibility, expungement/record-sealing post-disposition.
Common pitfalls: waiver of counsel, failure to preserve appellate issues, collateral consequences (immigration under Padilla, housing, employment). FOR SERIOUS FELONIES: strongly recommend specialist criminal defense counsel."""

_BE["immigration"] = """DOMAINE: IMMIGRATION (droit belge)
Cadres: Loi du 15/12/1980 sur l'accès au territoire (Loi étrangers), AR 08/10/1981, Directives UE accueil + retour + regroupement, compétence CGRA (asile), CCE (recours), Office des Étrangers.
Points à vérifier: titre de séjour (A/B/C/F/D), regroupement familial conditions, demande protection internationale asile vs subsidiaire, ordre de quitter le territoire (délai 30 jours → recours suspensif CCE), fraude mariage blanc, naturalisation déclaration vs demande selon profil.
Pièges: délai strict 30 jours recours OQT, rétention administrative (centres fermés), apatridie non reconnue automatiquement, interdictions d'entrée Schengen."""

_US["immigration"] = """DOMAIN: IMMIGRATION (U.S. law)
Frameworks: INA (8 U.S.C. § 1101+), USCIS/EOIR/ICE procedures, consular processing via DOS, asylum (§ 208), adjustment of status (§ 245), family + employment petitions, DACA policy memoranda.
Check: status + overstay history, admissibility grounds (§ 212), removability grounds (§ 237), cancellation eligibility (10-year non-LPR), voluntary departure, bond hearings under Matter of Joseph, Padilla criminal consequences.
Common pitfalls: frivolous-filing bars, 3/10-year unlawful-presence bars, mis-filed I-9, expired priority dates, missed BIA 30-day appeal deadline, interview pitfalls."""

_BE["traffic"] = """DOMAINE: ROUTIER / INFRACTIONS DE ROULAGE (droit belge)
Cadres: Code de la route (AR 01/12/1975), Loi 16/03/1968 police circulation routière, Ordonnances régionales zones contrôle, Loi ICR assurance automobile, degré infractions 1-4 → Tribunal de police.
Points à vérifier: degré infraction (1 à 4), amende vs transaction (perception immédiate), CPI (Citation à Comparaître), déchéance droit conduire + examens médicaux/psychologiques, alcoolémie contradictoire, recours OMP.
Pièges: paiement perception immédiate vaut reconnaissance (court délai contester), radar automatique présomption à renverser, récidive calendrier 3 ans."""

_US["traffic"] = """DOMAIN: TRAFFIC / MOVING VIOLATIONS (U.S. law)
Frameworks: state vehicle codes (CA VC, NY VTL, Fla. Stat. Ch. 316), state DMV point systems, Implied Consent laws (DUI blood/breath refusal), traffic-school/diversion programs, CDL stricter standards.
Check: stop legality (reasonable suspicion), radar/LIDAR certification + calibration records, SFST admissibility, Miranda for post-arrest statements, statute-of-limitations (state-specific), appearance vs. mail-in payment (admission of guilt).
Common pitfalls: automatic license suspension for refusal, insurance surcharge impact, CDL disqualification from non-CDL ticket, immigration consequences for repeat DUI."""

# ─── CATCH-ALL ───────────────────────────────────────────────────────────
_BE["other"] = """DOMAINE: AUTRE (hors 17 catégories spécialisées)
Cette affaire ne rentre pas dans une des catégories pour lesquelles Archer dispose d'une expertise dédiée. Applique l'analyse juridique générale avec EXTRA PRUDENCE:
1. Identifie le domaine probable (pénal, commercial, administratif, civil général…) et mentionne-le dans case_type_notes.
2. Cite le fondement légal belge pertinent (Code civil, Code judiciaire, lois spéciales) mais reste plus large dans les conclusions.
3. Recommande FORTEMENT une consultation avec un avocat spécialisé pour toute décision importante — ajoute une phrase explicite dans summary et key_insight.
4. Évite les chiffres précis (indemnité, délai) quand le domaine exact est incertain.
5. Suggère à la fin si le dossier ressemble à une catégorie spécialisée (« ce cas pourrait relever de [XYZ], une catégorie mieux couverte par Archer »)."""

_US["other"] = """DOMAIN: OTHER (outside the 17 specialised categories)
This matter does not fit any of Archer's dedicated expertise areas. Apply general legal analysis with EXTRA CAUTION:
1. Identify the likely domain (commercial, administrative, civil, regulatory, IP, etc.) and note it in case_type_notes.
2. Cite general U.S. legal frameworks (UCC, common law, federal statutes) but remain broad in conclusions.
3. STRONGLY recommend a specialist attorney for any important decision — include an explicit line in both summary and key_insight.
4. Avoid precise figures (damages, deadlines) when the exact domain is uncertain.
5. At the end, suggest whether the case might fit a specialised category ("this matter may actually fall under [XYZ], a category Archer supports natively")."""


CASE_TYPE_EXPERTISE = {"BE": _BE, "US": _US}


def get_expertise_block(case_type: str, jurisdiction: str, language: Optional[str] = None) -> str:
    """Return the per-case_type expertise addendum to graft onto analysis prompts.
    Unknown case_types fall back to 'other'. Unknown jurisdictions fall back to US."""
    j = (jurisdiction or "US").upper()
    if j not in CASE_TYPE_EXPERTISE:
        j = "US"
    ct_map = CASE_TYPE_EXPERTISE[j]
    block = ct_map.get(case_type) or ct_map["other"]
    header = "\n\n" + ("═" * 60) + "\n"
    footer = "\n" + ("═" * 60) + "\n"
    return header + block + footer
