import React from 'react';

const CARDS = [
  { key: 'precision', pct: '94.7', sign: '%',    highlight: true },
  { key: 'success',   pct: '89.3', sign: '%' },
  { key: 'accepted',  pct: '96',   sign: '%' },
  { key: 'rating',    pct: '8.4',  sign: '/10' },
  { key: 'nps',       pct: '72',   sign: '' },
  { key: 'error',     pct: '<3',   sign: '%' },
];

export default function MeasuredPrecision({ t }) {
  return (
    <section className="section" data-testid="engine-precision">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('precision.eyebrow')}</div>
          <h2 className="section-h">{t('precision.title')}</h2>
          <p className="section-sub">{t('precision.subtitle')}</p>
        </div>

        <div className="metrics-grid">
          {CARDS.map((c) => (
            <div className={`metric-card${c.highlight ? ' highlight' : ''}`} key={c.key}>
              <div className="metric-pct">
                {c.pct}{c.sign && <span className="pct-sign">{c.sign}</span>}
              </div>
              <div className="metric-label">{t(`precision.cards.${c.key}.label`)}</div>
              <div className="metric-sub">{t(`precision.cards.${c.key}.sub`)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
