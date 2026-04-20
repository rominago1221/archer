import React from 'react';

// Mirrors the mockup's Actualités juridiques card: blue header + green LIVE
// pulse badge, then a stack of news items each with a colored tag
// (JURISPRUDENCE amber / NOUVELLE LOI green), a date in monospace, a one-line
// body and an "→ Impact: …" row pinned to the card bottom.
function resolveLang(lang) {
  const l = String(lang || 'en').slice(0, 2).toLowerCase();
  return l === 'fr' || l === 'nl' ? l : 'en';
}

const COPY = {
  fr: {
    title: 'ACTUALITÉS JURIDIQUES',
    live: 'LIVE',
    impactPrefix: '→ Impact : ',
    none: 'Aucune actualité pertinente pour ce dossier.',
    tagJuris: 'JURISPRUDENCE',
    tagLaw: 'NOUVELLE LOI',
    tagUpdate: 'MISE À JOUR',
  },
  en: {
    title: 'LEGAL NEWS',
    live: 'LIVE',
    impactPrefix: '→ Impact: ',
    none: 'No relevant news for this case.',
    tagJuris: 'CASE LAW',
    tagLaw: 'NEW LAW',
    tagUpdate: 'UPDATE',
  },
  nl: {
    title: 'JURIDISCH NIEUWS',
    live: 'LIVE',
    impactPrefix: '→ Impact: ',
    none: 'Geen relevante updates voor dit dossier.',
    tagJuris: 'RECHTSPRAAK',
    tagLaw: 'NIEUWE WET',
    tagUpdate: 'UPDATE',
  },
};

function tagFor(item, copy) {
  const raw = String(item.type || item.category || '').toLowerCase();
  if (raw.includes('juris') || raw.includes('case')) return { label: copy.tagJuris, tone: 'amber' };
  if (raw.includes('law') || raw.includes('loi')) return { label: copy.tagLaw, tone: 'green' };
  return { label: copy.tagUpdate, tone: 'blue' };
}

export default function V3RailNews({ news = [], language }) {
  const copy = COPY[resolveLang(language)];
  const items = Array.isArray(news) ? news.slice(0, 3) : [];

  return (
    <div className="rail-card" data-testid="rail-news">
      <div className="rail-card-head-row">
        <span className="rail-card-h blue">{copy.title}</span>
        <span className="news-live">
          <span className="news-live-dot" /> {copy.live}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{copy.none}</div>
      ) : (
        items.map((item, i) => {
          const tag = tagFor(item, copy);
          return (
            <div key={item.id || i} className="news-item" data-testid={`rail-news-${i}`}>
              <div className="news-meta-row">
                <span className={`news-tag ${tag.tone}`}>{tag.label}</span>
                {item.date && <span className="news-date">{item.date}</span>}
              </div>
              <div className="news-text">{item.title || item.headline || item.text}</div>
              {(item.impact || item.archer_note) && (
                <div className="news-impact">
                  {copy.impactPrefix}{item.impact || item.archer_note}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
