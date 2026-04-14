import { useMemo } from 'react';
import cinematic from '../../../i18n/cinematic.json';

const SUPPORTED = ['en', 'fr', 'es', 'nl'];

function resolveLang(language) {
  if (!language) return 'en';
  const short = String(language).slice(0, 2).toLowerCase();
  return SUPPORTED.includes(short) ? short : 'en';
}

function interpolate(template, params) {
  if (!params) return template;
  let out = template;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

// Returns a translator function bound to the resolved language.
// Falls back to EN, then to FR, then to the key itself.
export function useCinematicT(language) {
  return useMemo(() => {
    const lang = resolveLang(language);
    return (key, params) => {
      const value =
        cinematic[lang]?.[key] ??
        cinematic.en?.[key] ??
        cinematic.fr?.[key] ??
        key;
      return interpolate(value, params);
    };
  }, [language]);
}
