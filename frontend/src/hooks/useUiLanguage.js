import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

const JURISDICTION_DEFAULTS = { US: 'en', BE: 'fr' };
const SUPPORTED = ['en', 'fr', 'es', 'nl'];

export function useUiLanguage(jurisdiction = 'US') {
  const { lang } = useParams();

  return useMemo(() => {
    // Priority 1: URL param
    if (lang && SUPPORTED.includes(lang)) return lang;
    // Priority 2: localStorage
    const stored = localStorage.getItem('archer_language');
    if (stored && SUPPORTED.includes(stored)) return stored;
    // Priority 3: navigator
    const nav = (navigator.language || '').slice(0, 2);
    if (SUPPORTED.includes(nav)) return nav;
    // Priority 4: jurisdiction default
    return JURISDICTION_DEFAULTS[jurisdiction] || 'en';
  }, [lang, jurisdiction]);
}
