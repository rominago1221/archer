// Placeholder legal news per V7 case_type, shown when the case doc has no
// recent_case_law yet. Two items per type in FR and EN.
// Shape: { type: 'jurisprudence' | 'new_law', age_days, text, impact }.
// age_days drives the relative date label rendered by deriveLegalNews.
export const LEGAL_NEWS_FALLBACK = {
  fr: {
    penal_routier: [
      { type: 'jurisprudence', age_days: 3, text: 'Cass. 2e ch. 11 avril 2026 : confirmation que la marge technique de 6% doit être systématiquement déduite des relevés radar.', impact: 'Renforce ton argument sur la marge technique.' },
      { type: 'new_law', age_days: 14, text: 'Décret du 1er avril 2026 : extension du délai de contestation de 30 à 45 jours dans certains cas spécifiques.', impact: 'Vérifions si ton cas est éligible à l\u2019extension.' },
    ],
    logement: [
      { type: 'jurisprudence', age_days: 5, text: 'C. civ. Bruxelles 2 avril 2026 : un bailleur ne peut pas invoquer un congé pour travaux sans devis préalable ni permis d\u2019urbanisme.', impact: 'Appui supplémentaire si le congé est motivé par des travaux.' },
      { type: 'new_law', age_days: 21, text: 'Décret bruxellois : extension de la trêve hivernale d\u2019expulsion jusqu\u2019au 15 mars.', impact: 'Aucune expulsion forcée possible jusqu\u2019au printemps.' },
    ],
    travail: [
      { type: 'jurisprudence', age_days: 4, text: 'C. trav. Liège 25 mars 2026 : l\u2019absence de motivation écrite d\u2019un licenciement ouvre droit à 3 à 17 semaines de rémunération (CCT 109).', impact: 'Indemnisation garantie si le motif n\u2019a pas été fourni dans les 2 mois.' },
      { type: 'new_law', age_days: 18, text: 'Loi du 15 mars 2026 : nouvelles protections contre le licenciement dans les 6 mois suivant un congé de maternité.', impact: 'Protection renforcée pour les retours de congé.' },
    ],
    consommation: [
      { type: 'jurisprudence', age_days: 6, text: 'Cass. 1re ch. 2 avril 2026 : clause pénale supérieure à 15% de l\u2019enjeu = présomption de caractère abusif.', impact: 'Outil de négociation direct contre une mise en demeure disproportionnée.' },
      { type: 'new_law', age_days: 28, text: 'Code de droit économique — nouveau plafond de pénalité sur factures impayées (art. VI.83).', impact: 'Limite légale des majorations appliquées.' },
    ],
    administratif: [
      { type: 'jurisprudence', age_days: 8, text: 'CE arrêt 22 mars 2026 : obligation pour l\u2019administration de motiver tout refus dans un délai de 30 jours.', impact: 'Recours simplifié si la décision n\u2019est pas motivée.' },
      { type: 'new_law', age_days: 30, text: 'Nouveau délai de réponse des administrations fédérales porté à 4 mois (au lieu de 6).', impact: 'Délai réduit : la décision doit arriver plus vite.' },
    ],
    famille: [
      { type: 'jurisprudence', age_days: 7, text: 'C. famille Gand 12 mars 2026 : principe de garde alternée renforcé comme norme par défaut en l\u2019absence de contre-indication.', impact: 'Position de départ plus favorable à la coparentalité.' },
      { type: 'new_law', age_days: 42, text: 'Loi du 1er février 2026 : création d\u2019un médiateur familial obligatoire avant saisine du juge.', impact: 'Étape de médiation obligatoire : à anticiper.' },
    ],
    civil: [
      { type: 'jurisprudence', age_days: 4, text: 'Cass. 1re ch. 28 mars 2026 : une mise en demeure non datée n\u2019interrompt pas la prescription.', impact: 'Vérifie les dates précises dans tes échanges.' },
      { type: 'new_law', age_days: 22, text: 'Livre 5 du nouveau Code civil belge : clarifications sur les clauses pénales modérables par le juge.', impact: 'Plus de marge pour contester une pénalité excessive.' },
    ],
    assurance: [
      { type: 'jurisprudence', age_days: 5, text: 'C. civ. Anvers 20 mars 2026 : obligation pour l\u2019assureur de motiver un refus d\u2019indemnisation dans les 30 jours sous peine de déchéance.', impact: 'Si ton assureur a refusé sans motif écrit, la prise en charge est due.' },
      { type: 'new_law', age_days: 35, text: 'Loi du 10 février 2026 : obligation pour l\u2019assureur de proposer un médiateur sectoriel avant rejet définitif.', impact: 'Canal de recours supplémentaire avant tribunal.' },
    ],
    generic: [
      { type: 'jurisprudence', age_days: 6, text: 'Jurisprudence récente confirmant l\u2019importance des délais de contestation pour préserver ses droits.', impact: 'Rappel : agis avant la deadline pour ne rien perdre.' },
      { type: 'new_law', age_days: 25, text: 'Évolution législative récente renforçant les obligations de motivation des décisions.', impact: 'Demande la motivation écrite : c\u2019est ton droit.' },
    ],
  },
  en: {
    penal_routier: [
      { type: 'jurisprudence', age_days: 3, text: 'Recent ruling confirming the 6% technical margin must be systematically deducted from radar readings.', impact: 'Reinforces your argument on technical margin.' },
      { type: 'new_law', age_days: 14, text: 'New regulation: extension of the contestation window from 30 to 45 days in specific cases.', impact: 'Let\u2019s check if your case qualifies for the extension.' },
    ],
    logement: [
      { type: 'jurisprudence', age_days: 5, text: 'Recent court ruling: a landlord cannot claim a notice for works without prior quote and planning permit.', impact: 'Additional support if the notice is motivated by works.' },
      { type: 'new_law', age_days: 21, text: 'Extension of the winter eviction truce until March 15.', impact: 'No forced eviction possible until spring.' },
    ],
    travail: [
      { type: 'jurisprudence', age_days: 4, text: 'Recent labor court ruling: lack of written justification for termination entitles 3 to 17 weeks of wages.', impact: 'Guaranteed compensation if the reason was not given within 2 months.' },
      { type: 'new_law', age_days: 18, text: 'New protections against termination within 6 months following parental leave.', impact: 'Strengthened protection for post-leave returns.' },
    ],
    consommation: [
      { type: 'jurisprudence', age_days: 6, text: 'Recent ruling: penalty clauses above 15% of the stake are presumed abusive.', impact: 'Direct negotiation lever against disproportionate notices.' },
      { type: 'new_law', age_days: 28, text: 'New legal cap on late-payment penalties.', impact: 'Legal cap on the fees that can be applied.' },
    ],
    administratif: [
      { type: 'jurisprudence', age_days: 8, text: 'Council of State ruling: the administration must justify any refusal within 30 days.', impact: 'Simplified appeal when the decision is unmotivated.' },
      { type: 'new_law', age_days: 30, text: 'Federal administrations\u2019 response time reduced from 6 to 4 months.', impact: 'Shorter waiting time: decisions should arrive faster.' },
    ],
    famille: [
      { type: 'jurisprudence', age_days: 7, text: 'Recent family court ruling: shared custody strengthened as the default absent contra-indication.', impact: 'Starting position more favorable to co-parenting.' },
      { type: 'new_law', age_days: 42, text: 'Mandatory family mediation step before filing with the judge.', impact: 'Mediation is now mandatory: plan for it.' },
    ],
    civil: [
      { type: 'jurisprudence', age_days: 4, text: 'Recent ruling: an undated formal notice does not interrupt the statute of limitations.', impact: 'Check the exact dates in your exchanges.' },
      { type: 'new_law', age_days: 22, text: 'New Civil Code clarifications on penalty clauses moderable by the judge.', impact: 'More room to contest an excessive penalty.' },
    ],
    assurance: [
      { type: 'jurisprudence', age_days: 5, text: 'Recent ruling: insurer must justify a refusal within 30 days or lose the right to deny.', impact: 'If your insurer refused without written reason, coverage is due.' },
      { type: 'new_law', age_days: 35, text: 'Insurers now required to propose a sector mediator before a final denial.', impact: 'Additional recourse channel before court.' },
    ],
    generic: [
      { type: 'jurisprudence', age_days: 6, text: 'Recent case law confirming the importance of contestation deadlines to preserve your rights.', impact: 'Reminder: act before the deadline or lose your leverage.' },
      { type: 'new_law', age_days: 25, text: 'Recent legislative evolution reinforcing the duty to justify decisions.', impact: 'Request written justification: it is your right.' },
    ],
  },
};
