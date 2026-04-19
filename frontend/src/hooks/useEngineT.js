import { useMemo } from 'react';
import engine from '../i18n/engine.json';

const SUPPORTED = ['en', 'fr'];

function resolveLang(language) {
  if (!language) return 'en';
  const short = String(language).slice(0, 2).toLowerCase();
  return SUPPORTED.includes(short) ? short : 'en';
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

/**
 * /engine page translator. Mirrors useBlogT + useAttorneysT so the engine
 * page feels like a sibling. Supports `en` + `fr` today — infra is ready to
 * append nl/de/es later (same structure as blog.json).
 */
export function useEngineT(language) {
  return useMemo(() => {
    const lang = resolveLang(language);
    return (path, params) => {
      const fromLang = lookup(engine[lang], path);
      const fromEn = fromLang === undefined ? lookup(engine.en, path) : fromLang;
      const value = fromEn === undefined ? path : fromEn;
      return typeof value === 'string' ? interpolate(value, params) : value;
    };
  }, [language]);
}
