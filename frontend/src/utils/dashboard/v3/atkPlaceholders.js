// TODO(back): wire to PASS 5/6 structured attacks when available.
// Until the AI pipeline produces a structured `caseDoc.attacks` array, this
// file returns a fixed 5-attack demo set so Act 3's Anticipation Adverse
// accordion renders realistic content instead of a blank placeholder.
//
// These exemplars are drawn from a Belgian rental dispute — the most
// common Archer use-case at MVP. They will be **replaced** by the backend
// output as soon as the pipeline delivers per-case attack simulations.
export const PLACEHOLDER_ATTACKS_FR = [
  {
    id: 'atk-1',
    num: '01',
    category: 'CONSENTEMENT · PACTA SUNT SERVANDA',
    title: 'Le locataire a signé le bail en connaissance de cause',
    threatLevel: 'high',
    attackerQuote:
      "Mon client a librement accepté le loyer au moment de la signature. Le principe pacta sunt servanda (art. 1134 anc. C. civ.) impose le respect des conventions. Le locataire ne peut plus contester a posteriori.",
    attackerRefs: [{ label: 'Art. 1134 anc. C. civ.', variant: 'red' }],
    archerResponse:
      "<strong>Le consentement ne valide pas un loyer manifestement excessif.</strong> L'art. 224 §1 de l'Ord. bxl 27/07/2017 permet expressément au juge de réviser le loyer à tout moment, <em>indépendamment de l'accord initial</em>. Règle d'ordre public — ne peut être écartée contractuellement.",
    defenseRefs: [
      { label: 'Art. 224 §1 Ord. bxl', variant: 'green' },
      { label: 'Cass. 15/06/2020', variant: 'juris' },
    ],
    defenseForce: 92,
  },
  {
    id: 'atk-2',
    num: '02',
    category: 'PRIX DE MARCHÉ · VALEUR INDICATIVE',
    title: 'Le loyer correspond au marché bruxellois actuel',
    threatLevel: 'mid',
    attackerQuote:
      "Les prix ont fortement augmenté depuis 2017. Un loyer élevé pour un bien en zone tendue reflète la réalité du marché. La grille n'a qu'une valeur indicative, pas contraignante.",
    attackerRefs: [{ label: 'Grille de référence', variant: 'red' }],
    archerResponse:
      "La grille est <strong>indicative mais juridiquement opposable</strong> comme benchmark (Cass. 12/03/2019). Un écart important dépasse largement le seuil des 20% toléré. L'argument « marché » ne tient pas face à un écart objectivé.",
    defenseRefs: [{ label: 'Cass. 12/03/2019', variant: 'juris' }],
    defenseForce: 85,
  },
  {
    id: 'atk-3',
    num: '03',
    category: 'ÉTAT DES LIEUX · ACCEPTATION TACITE',
    title: "Absence d'état des lieux = acceptation du bien",
    threatLevel: 'mid',
    attackerQuote:
      "Le locataire n'a jamais demandé d'état des lieux contradictoire. Il a accepté le bien en l'état et ne peut invoquer aujourd'hui ce défaut pour en tirer avantage.",
    attackerRefs: [],
    archerResponse:
      "L'art. 1730 C. civ. impose <strong>au bailleur</strong> d'établir l'état des lieux détaillé et contradictoire. La Cour de cassation (22/11/2018) fait peser la <strong>charge de la preuve sur le bailleur</strong>. À défaut, présomption favorable au locataire.",
    defenseRefs: [
      { label: 'Art. 1730 C. civ.', variant: 'green' },
      { label: 'Cass. 22/11/2018', variant: 'juris' },
    ],
    defenseForce: 88,
  },
  {
    id: 'atk-4',
    num: '04',
    category: 'ENREGISTREMENT · FORMALITÉ FISCALE',
    title: "Le défaut d'enregistrement est une simple formalité",
    threatLevel: 'low',
    attackerQuote:
      "L'enregistrement du bail n'est qu'une obligation fiscale. Il n'affecte ni la validité du contrat ni les obligations du locataire. Le bailleur peut régulariser à tout moment.",
    attackerRefs: [],
    archerResponse:
      "Argument <strong>juridiquement infondé</strong>. L'art. 227 §1 Ord. bxl est clair : à défaut d'enregistrement dans les 2 mois, le preneur peut <strong>quitter sans préavis ni indemnité</strong>. Sanction civile, pas fiscale.",
    defenseRefs: [
      { label: 'Art. 227 §1 Ord. bxl', variant: 'green' },
      { label: 'Cass. 05/09/2022', variant: 'juris' },
    ],
    defenseForce: 95,
  },
  {
    id: 'atk-5',
    num: '05',
    category: 'CLAUSE PÉNALE · LIBERTÉ CONTRACTUELLE',
    title: 'La clause pénale élevée est librement négociée',
    threatLevel: 'mid',
    attackerQuote:
      "La clause d'intérêts figure dans le contrat. Le locataire l'a acceptée. Elle couvre le préjudice forfaitaire en cas de retard et ne peut être remise en cause.",
    attackerRefs: [{ label: 'Art. 8 du contrat', variant: 'red' }],
    archerResponse:
      "L'art. 5.74 nv C. civ. donne au juge un <strong>pouvoir de modération d'ordre public</strong>. La Cour de cassation a modéré des clauses similaires dans <strong>60+ affaires</strong>.",
    defenseRefs: [
      { label: 'Art. 5.74 nv C. civ.', variant: 'green' },
      { label: '60+ cas Cass.', variant: 'juris' },
    ],
    defenseForce: 80,
  },
];

// English mirror — same structure, translated. Used when language === 'en'.
export const PLACEHOLDER_ATTACKS_EN = PLACEHOLDER_ATTACKS_FR.map((a) => ({
  ...a,
  // Keep the refs as-is (Belgian legal citations don't translate), but
  // swap the quote + response to English so the UI stays coherent.
  attackerQuote:
    a.id === 'atk-1' ? "My client freely accepted the rent at signing. Pacta sunt servanda (art. 1134 old C.C.) binds the parties. The tenant cannot now challenge the agreement."
    : a.id === 'atk-2' ? "Prices have risen since 2017. A high rent for a unit in a tight market reflects reality. The reference grid is indicative, not binding."
    : a.id === 'atk-3' ? "The tenant never requested a contradictory inventory. They accepted the property as-is and cannot now invoke this gap to their advantage."
    : a.id === 'atk-4' ? "Lease registration is a fiscal formality. It does not affect the contract's validity or the tenant's obligations. The landlord can regularise at any time."
    : "The penalty clause appears in the contract. The tenant accepted it. It covers fixed damages for late payment and cannot be reopened.",
  archerResponse:
    a.id === 'atk-1' ? "<strong>Consent does not validate a manifestly excessive rent.</strong> Art. 224 §1 of the Brussels 27/07/2017 Ordinance expressly lets the judge revise the rent at any time, <em>regardless of the initial agreement</em>. Public-order rule — cannot be contracted out of."
    : a.id === 'atk-2' ? "The reference grid is <strong>indicative but legally opposable</strong> as a benchmark (Cass. 12/03/2019). A large gap exceeds the 20% tolerance threshold. The 'market' argument does not hold against an objectified gap."
    : a.id === 'atk-3' ? "Art. 1730 C.C. requires <strong>the landlord</strong> to establish a detailed contradictory inventory. Belgian Supreme Court (22/11/2018) places the <strong>burden of proof on the landlord</strong>. Absent one, a presumption runs in favour of the tenant."
    : a.id === 'atk-4' ? "<strong>Legally unfounded</strong>. Art. 227 §1 of the Brussels Ordinance is clear: without registration within 2 months, the tenant can <strong>leave with no notice or indemnity</strong>. Civil sanction, not fiscal."
    : "Art. 5.74 new C.C. gives the judge a <strong>public-order power to moderate</strong>. The Supreme Court has moderated similar clauses in <strong>60+ cases</strong>.",
}));

// NL mirror — partial; where a specific translation is missing we keep FR as
// fallback. TODO(i18n-nl): validate NL translations with a native speaker.
export const PLACEHOLDER_ATTACKS_NL = PLACEHOLDER_ATTACKS_FR;

export function getPlaceholderAttacks(language) {
  const lang = String(language || 'fr').toLowerCase().slice(0, 2);
  if (lang === 'en') return PLACEHOLDER_ATTACKS_EN;
  if (lang === 'nl') return PLACEHOLDER_ATTACKS_NL;
  return PLACEHOLDER_ATTACKS_FR;
}
