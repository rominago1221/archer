/**
 * Attorneys page — Section 4 (How we select). 6 criteria cards in a 3×2
 * grid, followed by a 4-stat banner (1 in 27 / 94% / 4.9/5 / 2.1h).
 * Icons are kept inline to match the exact glyph per-criterion.
 */
import React from 'react';
import { useAttorneysT } from '../../hooks/useAttorneysT';

const CRITERIA = [
  { key: 'c1', num: '01' },
  { key: 'c2', num: '02' },
  { key: 'c3', num: '03' },
  { key: 'c4', num: '04' },
  { key: 'c5', num: '05' },
  { key: 'c6', num: '06' },
];

const STAT_KEYS = ['s1', 's2', 's3', 's4'];

function CriterionIcon({ k }) {
  switch (k) {
    case 'c1':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );
    case 'c2':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'c3':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'c4':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case 'c5':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'c6':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function HowWeSelect({ language = 'en' }) {
  const t = useAttorneysT(language);
  return (
    <section className="section-select" id="how-we-select" data-testid="attorneys-select">
      <div className="select-header">
        <div className="section-eyebrow-pill">{t('select.eyebrow')}</div>
        <h2 className="section-title">
          {t('select.title_1')} <span className="accent">{t('select.title_2')}</span>
        </h2>
        <p className="section-sub">{t('select.sub')}</p>
      </div>

      <div className="select-grid">
        {CRITERIA.map(({ key, num }) => (
          <div className="select-card" key={key} data-testid={`select-${key}`}>
            <div className="select-card-head">
              <div className="select-card-icon"><CriterionIcon k={key} /></div>
              <span className="select-card-num">{num}</span>
            </div>
            <h3 className="select-card-h">{t(`select.criteria.${key}.h`)}</h3>
            <p className="select-card-p">{t(`select.criteria.${key}.d`)}</p>
          </div>
        ))}
      </div>

      <div className="select-stats">
        {STAT_KEYS.map((k) => (
          <div className="select-stat" key={k}>
            <div className="select-stat-num">{t(`select.stats.${k}.num`)}</div>
            <div className="select-stat-label">{t(`select.stats.${k}.label`)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
