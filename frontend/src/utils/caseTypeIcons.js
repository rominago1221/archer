// Mapping case_type → emoji icon + French label.
// Keys normalised (lowercase, dashes/spaces → underscores, accents stripped)
// in getCaseTypeIcon / getCaseTypeLabel so backend variants all resolve.
const CASE_TYPE_MAP = {
  // Logement & immobilier
  housing:        { icon: '🏠', label: 'Logement' },
  rental:         { icon: '🏠', label: 'Logement' },
  real_estate:    { icon: '🏠', label: 'Logement' },
  lease:          { icon: '🏠', label: 'Logement' },
  eviction:       { icon: '🏠', label: 'Logement' },
  logement:       { icon: '🏠', label: 'Logement' },

  // Emploi & travail
  employment:     { icon: '💼', label: 'Emploi' },
  labor:          { icon: '💼', label: 'Emploi' },
  workplace:      { icon: '💼', label: 'Emploi' },
  dismissal:      { icon: '💼', label: 'Emploi' },
  work:           { icon: '💼', label: 'Emploi' },
  travail:        { icon: '💼', label: 'Emploi' },

  // Consommation
  consumer:       { icon: '📡', label: 'Conso' },
  telecom:        { icon: '📡', label: 'Conso' },
  conso:          { icon: '📡', label: 'Conso' },
  purchase:       { icon: '🛒', label: 'Achat' },

  // Routier & transport
  traffic:        { icon: '🚗', label: 'Routier' },
  driving:        { icon: '🚗', label: 'Routier' },

  // Famille
  family:         { icon: '👨‍👩‍👧', label: 'Famille' },
  divorce:        { icon: '👨‍👩‍👧', label: 'Famille' },
  custody:        { icon: '👨‍👩‍👧', label: 'Famille' },
  famille:        { icon: '👨‍👩‍👧', label: 'Famille' },

  // Pénal
  criminal:       { icon: '⚖️', label: 'Pénal' },
  penal:          { icon: '⚖️', label: 'Pénal' },

  // Administratif
  administrative: { icon: '🏛️', label: 'Admin' },
  tax:            { icon: '🏛️', label: 'Fiscal' },
  immigration:    { icon: '🌍', label: 'Immigration' },

  // Contrats & commercial
  contract:       { icon: '📝', label: 'Contrat' },
  contrat:        { icon: '📝', label: 'Contrat' },
  nda:            { icon: '📝', label: 'Contrat' },
  commercial:     { icon: '📝', label: 'Commercial' },
  business:       { icon: '🏢', label: 'Business' },

  // Assurance
  insurance:      { icon: '🛡️', label: 'Assurance' },
  assurance:      { icon: '🛡️', label: 'Assurance' },

  // Voisinage
  neighbor:       { icon: '🏘️', label: 'Voisinage' },
  nuisance:       { icon: '🏘️', label: 'Voisinage' },

  // Santé
  medical:        { icon: '🏥', label: 'Santé' },
  health:         { icon: '🏥', label: 'Santé' },

  // Succession
  inheritance:    { icon: '📜', label: 'Succession' },
  estate:         { icon: '📜', label: 'Succession' },

  // Bancaire & finance
  banking:        { icon: '🏦', label: 'Bancaire' },
  debt:           { icon: '💳', label: 'Dette' },
  dette:          { icon: '💳', label: 'Dette' },
  credit:         { icon: '💳', label: 'Crédit' },

  // Propriété intellectuelle
  ip:             { icon: '💡', label: 'PI' },
  copyright:      { icon: '💡', label: 'PI' },

  // Court / justice
  court:          { icon: '⚖️', label: 'Justice' },
  justice:        { icon: '⚖️', label: 'Justice' },

  // Autre / défaut
  other:          { icon: '📋', label: 'Autre' },
  autre:          { icon: '📋', label: 'Autre' },
  general:        { icon: '📋', label: 'Général' },
};

function normalize(caseType) {
  return String(caseType || 'other')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[- ]/g, '_');
}

export function getCaseTypeIcon(caseType) {
  return CASE_TYPE_MAP[normalize(caseType)]?.icon || '📋';
}

export function getCaseTypeLabel(caseType) {
  return CASE_TYPE_MAP[normalize(caseType)]?.label || 'Autre';
}

export default CASE_TYPE_MAP;
