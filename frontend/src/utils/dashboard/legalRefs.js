// Builds a canonical search/fallback URL for a legal reference label.
// We don't have a perfect citation parser — the goal is to open the right
// official source (Moniteur belge / Cassation / Cornell / Justia) with the
// reference pre-filled so the user lands as close as possible.
function searchUrl(base, q) {
  return `${base}?q=${encodeURIComponent(q)}`;
}

const EJUSTICE_SEARCH = 'https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl';
const JUPORTAL_SEARCH = 'https://juportal.be/content/search';
const LOYERS_BXL      = 'https://loyers.brussels';

function ejusticeUrl(label) {
  // Build ejustice search URL with language + query. language=fr, la=F works
  // for every Moniteur search page including the fallback legislation.pl
  // endpoint.
  const qs = new URLSearchParams({
    language: 'fr',
    la: 'F',
    table_name: 'loi',
    query: label,
  }).toString();
  return `${EJUSTICE_SEARCH}?${qs}`;
}

export function getLegalRefUrl(reference, country = 'BE') {
  if (!reference) return null;
  const label = typeof reference === 'string' ? reference : (reference.label || reference.reference || reference.citation || '');
  if (!label) return null;

  // If the caller already passed a direct link, honour it.
  if (reference && typeof reference === 'object' && reference.jurisdiction_link) {
    return reference.jurisdiction_link;
  }

  const lower = label.toLowerCase();
  const isUS = String(country || '').toUpperCase() === 'US';

  if (isUS) {
    if (/\bf\.\s?\d?d\b|\bcir\.\b|\bu\.s\.\b|\bsupreme court\b/i.test(label)) {
      return searchUrl('https://www.law.cornell.edu/search/site', label);
    }
    if (/\bv\.\b|\bcourt\b|\bcase\b/i.test(label)) {
      return searchUrl('https://law.justia.com/search', label);
    }
    return searchUrl('https://www.courtlistener.com/?type=o', label);
  }

  // Belgium (default). Route to the right official source based on token
  // inspection — jurisprudences to juportal, legislation to ejustice, the
  // Brussels rent grid to loyers.brussels. Every route is an ejustice-family
  // URL so we stop bouncing to courtlistener on BE content.
  if (lower.includes('cass.') || lower.includes('cassation')
      || lower.includes('juportal') || /\beclisp\b/.test(lower)) {
    return searchUrl(JUPORTAL_SEARCH, label);
  }
  if (lower.includes('loyers.brussels') || /grille\s+(de\s+)?r[ée]f[ée]rence/.test(lower)) {
    return LOYERS_BXL;
  }
  // Loi / AR / Code / article / ordonnance / arrêté → ejustice
  return ejusticeUrl(label);
}
