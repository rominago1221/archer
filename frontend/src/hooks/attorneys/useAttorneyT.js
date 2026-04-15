import { useMemo } from 'react';
import translations from '../../i18n/attorney.json';

function detectLang() {
  if (typeof window === 'undefined') return 'fr';
  const stored = localStorage.getItem('ui_language');
  if (stored && translations[stored]) return stored;
  const nav = (navigator.language || 'fr').slice(0, 2);
  return translations[nav] ? nav : 'fr';
}

export function useAttorneyT() {
  const lang = detectLang();
  const t = useMemo(() => translations[lang] || translations.fr, [lang]);
  return { t, lang };
}
