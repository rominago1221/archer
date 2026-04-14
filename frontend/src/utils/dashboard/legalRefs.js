// Builds a canonical search/fallback URL for a legal reference label.
// We don't have a perfect citation parser — the goal is to open the right
// official source (Moniteur belge / Cassation / Cornell / Justia) with the
// reference pre-filled so the user lands as close as possible.
function searchUrl(base, q) {
  return `${base}?q=${encodeURIComponent(q)}`;
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

  if (country === 'US') {
    // Federal circuit / Supreme Court-style citations → Cornell Law
    if (/\bf\.\s?\d?d\b|\bcir\.\b|\bu\.s\.\b|\bsupreme court\b/i.test(label)) {
      return searchUrl('https://www.law.cornell.edu/search/site', label);
    }
    // State or generic case law → Justia
    if (/\bv\.\b|\bcourt\b|\bcase\b/i.test(label)) {
      return searchUrl('https://law.justia.com/search', label);
    }
    // Fallback: CourtListener
    return searchUrl('https://www.courtlistener.com/?type=o', label);
  }

  // Belgium defaults
  if (lower.includes('cass.') || lower.includes('cassation')) {
    return searchUrl('https://juportal.be/content/search', label);
  }
  // Loi / AR / Code → Moniteur belge (ejustice.just.fgov.be) search
  if (/\bloi\b|\bar\b|\bcode\b|\barticle\b|\bart\./i.test(lower)) {
    return searchUrl('https://www.ejustice.just.fgov.be/cgi_loi/legislation.pl', label);
  }
  // Last-resort legal search
  return searchUrl('https://www.strada-lex.be/search', label);
}
