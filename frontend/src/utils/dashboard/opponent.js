// Returns the contextual opponent label based on the V7 canonical case_type.
// Call mapBackendCaseType() first if you only have the backend value.
const OPPONENT = {
  fr: {
    penal_routier: 'PARQUET',
    logement: 'BAILLEUR',
    travail: 'EMPLOYEUR',
    consommation: 'COMMERÇANT',
    administratif: 'ADMINISTRATION',
    famille: 'PARTIE ADVERSE',
    civil: 'PARTIE ADVERSE',
    assurance: 'ASSUREUR',
    generic: 'PARTIE ADVERSE',
  },
  en: {
    penal_routier: 'PROSECUTOR',
    logement: 'LANDLORD',
    travail: 'EMPLOYER',
    consommation: 'MERCHANT',
    administratif: 'AGENCY',
    famille: 'OPPOSING PARTY',
    civil: 'OPPOSING PARTY',
    assurance: 'INSURER',
    generic: 'OPPOSING PARTY',
  },
};

export function getOpponentLabel(caseTypeV7, country = 'BE', language = 'fr') {
  const lang = language === 'en' ? 'en' : 'fr';
  const table = OPPONENT[lang] || OPPONENT.fr;
  const type = caseTypeV7 || 'generic';
  return table[type] || table.generic;
}
