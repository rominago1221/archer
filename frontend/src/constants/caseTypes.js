// Single frontend source of truth — mirror of backend/constants/case_types.py.
// If you change one side, change the other.

export const CASE_TYPES = [
  'eviction', 'real_estate',
  'wrongful_termination', 'severance', 'workplace_discrimination', 'harassment',
  'consumer_disputes', 'debt', 'insurance_disputes', 'tax_disputes', 'identity_theft',
  'medical_malpractice', 'disability_claims',
  'family', 'criminal', 'immigration', 'traffic',
  'other',
];

export const CASE_TYPE_FAMILIES = [
  { id: 'housing',    types: ['eviction', 'real_estate'] },
  { id: 'employment', types: ['wrongful_termination', 'severance', 'workplace_discrimination', 'harassment'] },
  { id: 'financial',  types: ['consumer_disputes', 'debt', 'insurance_disputes', 'tax_disputes', 'identity_theft'] },
  { id: 'health',     types: ['medical_malpractice', 'disability_claims'] },
  { id: 'personal',   types: ['family', 'criminal', 'immigration', 'traffic'] },
  { id: 'catchall',   types: ['other'] },
];

export const LEGACY_CASE_TYPE_ALIASES = {
  housing: 'eviction',
  nda: 'other',
  contract: 'other',
  demand: 'debt',
  court: 'other',
  penal: 'criminal',
  commercial: 'other',
  insurance: 'insurance_disputes',
  tenant_dispute: 'eviction',
  consumer: 'consumer_disputes',
  consumer_refund: 'consumer_disputes',
  insurance_claim: 'insurance_disputes',
  contract_dispute: 'other',
  family_law: 'family',
  speeding_ticket: 'traffic',
  administrative: 'other',
  civil: 'other',
  employment: 'wrongful_termination',
};

export function normalizeCaseType(value) {
  if (!value) return 'other';
  const v = String(value).trim().toLowerCase();
  if (CASE_TYPES.includes(v)) return v;
  if (v in LEGACY_CASE_TYPE_ALIASES) return LEGACY_CASE_TYPE_ALIASES[v];
  return 'other';
}
