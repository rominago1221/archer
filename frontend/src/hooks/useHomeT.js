import { useMemo } from 'react';
import home from '../i18n/home.json';

function resolveLang(language) {
  if (!language) return 'en';
  const short = String(language).slice(0, 2).toLowerCase();
  if (short === 'fr') return 'fr';
  return 'en';
}

function interpolate(template, params) {
  if (!params || typeof template !== 'string') return template;
  let out = template;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function lookup(tree, path) {
  if (!tree || !path) return undefined;
  const parts = path.split('.');
  let node = tree;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in node) node = node[p];
    else return undefined;
  }
  return node;
}

// Path-based translator for home.json. Falls back: resolved language → en →
// raw path (so missing keys surface loudly during dev).
export function useHomeT(language) {
  return useMemo(() => {
    const lang = resolveLang(language);
    return (path, params) => {
      const fromLang = lookup(home[lang], path);
      const fromEn = fromLang === undefined ? lookup(home.en, path) : fromLang;
      const value = fromEn === undefined ? path : fromEn;
      return typeof value === 'string' ? interpolate(value, params) : value;
    };
  }, [language]);
}
