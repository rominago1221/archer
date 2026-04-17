// Maps the backend case_type enum (traffic|housing|employment|...) to the
// V7 canonical taxonomy (penal_routier|logement|travail|...). This keeps the
// backend prompts unchanged while the UI speaks its own vocabulary.
// Covers the 18-value canonical taxonomy (backend/constants/case_types.py) plus
// legacy values still present in old DB rows. Unknown values → 'generic'.
const BACKEND_TO_V7 = {
  // housing
  eviction: 'logement',
  real_estate: 'logement',
  // employment
  wrongful_termination: 'travail',
  severance: 'travail',
  workplace_discrimination: 'travail',
  harassment: 'travail',
  // financial
  consumer_disputes: 'consommation',
  debt: 'consommation',
  insurance_disputes: 'assurance',
  tax_disputes: 'administratif',
  identity_theft: 'consommation',
  // health
  medical_malpractice: 'civil',
  disability_claims: 'administratif',
  // personal
  family: 'famille',
  criminal: 'penal_routier',
  immigration: 'administratif',
  traffic: 'penal_routier',
  // catch-all
  other: 'generic',
  // legacy aliases
  housing: 'logement',
  employment: 'travail',
  consumer: 'consommation',
  demand: 'consommation',
  administrative: 'administratif',
  civil: 'civil',
  insurance: 'assurance',
  contract: 'civil',
  nda: 'civil',
  court: 'penal_routier',
  penal: 'penal_routier',
  commercial: 'civil',
};

export function mapBackendCaseType(backendValue) {
  if (!backendValue) return 'generic';
  return BACKEND_TO_V7[String(backendValue).toLowerCase()] || 'generic';
}

// Tag shown at the top of the dashboard: emoji + localized label.
// Called with the V7 canonical case_type (not the raw backend value).
const TAG_EMOJI = {
  penal_routier: '\u2696\uFE0F',
  logement: '\uD83C\uDFE0',
  travail: '\uD83D\uDCBC',
  consommation: '\uD83D\uDED2',
  administratif: '\uD83C\uDFDB\uFE0F',
  famille: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
  civil: '\uD83D\uDCDC',
  assurance: '\uD83D\uDEE1\uFE0F',
  generic: '\uD83D\uDCC4',
};

const TAG_LABELS = {
  fr: {
    penal_routier: 'DOSSIER PÉNAL',
    logement: 'DOSSIER LOGEMENT',
    travail: 'DOSSIER TRAVAIL',
    consommation: 'DOSSIER CONSO',
    administratif: 'DOSSIER ADMINISTRATIF',
    famille: 'DOSSIER FAMILLE',
    civil: 'DOSSIER CIVIL',
    assurance: 'DOSSIER ASSURANCE',
    generic: 'DOSSIER JURIDIQUE',
  },
  en: {
    penal_routier: 'CRIMINAL CASE',
    logement: 'HOUSING CASE',
    travail: 'EMPLOYMENT CASE',
    consommation: 'CONSUMER CASE',
    administratif: 'ADMINISTRATIVE CASE',
    famille: 'FAMILY CASE',
    civil: 'CIVIL CASE',
    assurance: 'INSURANCE CASE',
    generic: 'LEGAL CASE',
  },
};

const COUNTRY_LABELS = {
  fr: { BE: 'BELGIQUE', US: 'USA' },
  en: { BE: 'BELGIUM', US: 'USA' },
};

// Returns { emoji, label } — label already includes the country suffix:
// "DOSSIER PÉNAL · BELGIQUE"  /  "CRIMINAL CASE · USA".
export function getCaseTypeTag(caseTypeV7, country = 'BE', language = 'fr') {
  const lang = language === 'en' ? 'en' : 'fr';
  const labelMap = TAG_LABELS[lang] || TAG_LABELS.fr;
  const type = caseTypeV7 || 'generic';
  const base = labelMap[type] || labelMap.generic;
  const countryLabel = (COUNTRY_LABELS[lang] || COUNTRY_LABELS.fr)[country] || '';
  return {
    emoji: TAG_EMOJI[type] || TAG_EMOJI.generic,
    label: countryLabel ? `${base} \u00B7 ${countryLabel}` : base,
  };
}
