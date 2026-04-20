import { useMemo } from 'react';
import dashboard from '../i18n/dashboard.json';

const SUPPORTED = ['en', 'fr', 'es', 'nl'];

function resolveLang(language) {
  if (!language) return 'en';
  const short = String(language).slice(0, 2).toLowerCase();
  if (short === 'fr') return 'fr';
  if (short === 'nl') return 'nl';
  if (short === 'en') return 'en';
  if (SUPPORTED.includes(short)) return short;
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

// Returns a translator t(path, params) that traverses the nested dashboard.json
// via dot-paths. Falls back from the resolved language → en → raw path.
export function useDashboardT(language) {
  return useMemo(() => {
    const lang = resolveLang(language);
    return (path, params) => {
      const fromLang = lookup(dashboard[lang], path);
      const fromEn = fromLang === undefined ? lookup(dashboard.en, path) : fromLang;
      const value = fromEn === undefined ? path : fromEn;
      return typeof value === 'string' ? interpolate(value, params) : value;
    };
  }, [language]);
}
