import { LEGAL_NEWS_FALLBACK } from './legalNewsFallback';

// Return a localized relative-date label ("Il y a 3 jours" / "3 days ago").
function relativeDate(dateIso, ageDays, language) {
  const lang = language === 'fr' ? 'fr' : 'en';
  let days = Number.isFinite(ageDays) ? ageDays : null;
  if (days === null && dateIso) {
    try {
      const t = Date.parse(dateIso);
      if (!Number.isNaN(t)) days = Math.max(0, Math.round((Date.now() - t) / (1000 * 60 * 60 * 24)));
    } catch {
      /* ignore */
    }
  }
  if (days === null || days < 0) return '';

  if (lang === 'fr') {
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) {
      const w = Math.max(1, Math.round(days / 7));
      return w === 1 ? 'Il y a 1 semaine' : `Il y a ${w} semaines`;
    }
    const m = Math.max(1, Math.round(days / 30));
    return m === 1 ? 'Il y a 1 mois' : `Il y a ${m} mois`;
  }
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.max(1, Math.round(days / 7));
    return w === 1 ? '1 week ago' : `${w} weeks ago`;
  }
  const m = Math.max(1, Math.round(days / 30));
  return m === 1 ? '1 month ago' : `${m} months ago`;
}

// Returns an array of 2-3 news items for the LegalNewsSection.
// Prefers caseDoc.recent_case_law; falls back to per-case_type placeholders.
export function deriveLegalNews(caseDoc, caseTypeV7 = 'generic', language = 'fr') {
  const backendNews = Array.isArray(caseDoc?.recent_case_law) ? caseDoc.recent_case_law : [];
  const lang = language === 'fr' ? 'fr' : 'en';

  if (backendNews.length > 0) {
    return backendNews.slice(0, 3).map((n, i) => ({
      id: `news-${i}`,
      type: 'jurisprudence',
      date_label: relativeDate(n.date, null, lang),
      text: n.ruling_summary
        ? `${n.case_name || ''} \u2014 ${n.ruling_summary}`.replace(/^\s*\u2014\s*/, '')
        : (n.case_name || ''),
      impact: n.court ? `${lang === 'fr' ? 'Juridiction' : 'Jurisdiction'} : ${n.court}` : '',
      source_url: n.source_url || null,
    }));
  }

  const table = LEGAL_NEWS_FALLBACK[lang] || LEGAL_NEWS_FALLBACK.fr;
  const list = table[caseTypeV7] || table.generic;
  return list.map((n, i) => ({
    id: `news-fallback-${i}`,
    type: n.type,
    date_label: relativeDate(null, n.age_days, lang),
    text: n.text,
    impact: n.impact,
    source_url: null,
  }));
}
