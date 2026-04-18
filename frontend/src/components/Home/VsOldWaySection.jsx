/**
 * Section 4 — Old way vs Archer way (7-row comparison table).
 * Ported from design-source HTML lines 2172-2276.
 *
 * Two rows swap their value by `currency.code`:
 *   - pricing  → old_eur/_usd + archer_eur/_usd
 *   - attorney → archer_eur/_usd (old column is language-only)
 */
import React from 'react';
import { useHomeT } from '../../hooks/useHomeT';

const ROWS = ['time', 'pricing', 'analysis', 'comm', 'predict', 'resolution', 'attorney'];
// Rows whose values swap with currency; every other field is pulled with the
// raw `old` / `archer` keys.
const CURRENCY_ROWS = new Set(['pricing', 'attorney']);

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function VsOldWaySection({ language = 'en', currency }) {
  const t = useHomeT(language);
  const isEUR = (currency?.code || 'USD') === 'EUR';
  const suffix = isEUR ? '_eur' : '_usd';

  return (
    <section className="section-vs" data-testid="home-vs-old-way">
      <div className="vs-header">
        <div className="section-eyebrow">{t('v3.vsOldWay.eyebrow')}</div>
        <h2 className="vs-title">
          {t('v3.vsOldWay.title_line1')} <span className="vs-title-vs">{t('v3.vsOldWay.title_vs')}</span><br />
          <span className="vs-title-accent">{t('v3.vsOldWay.title_highlight')}</span>
        </h2>
        <p className="vs-sub">{t('v3.vsOldWay.sub')}</p>
      </div>

      <div className="vs-wrap">
        <div className="vs-table">
          <div className="vs-head">
            <div className="vs-head-cell criteria">{t('v3.vsOldWay.col_criteria')}</div>
            <div className="vs-head-cell old">{t('v3.vsOldWay.col_old')}</div>
            <div className="vs-head-cell archer">{t('v3.vsOldWay.col_archer')}</div>
          </div>

          {ROWS.map((row) => {
            const label = t(`v3.vsOldWay.rows.${row}.label`);
            // `pricing` uses currency-variant keys for both old and archer;
            // `attorney` only swaps the archer column.
            const oldValue = CURRENCY_ROWS.has(row) && row === 'pricing'
              ? t(`v3.vsOldWay.rows.${row}.old${suffix}`)
              : t(`v3.vsOldWay.rows.${row}.old`);
            const archerValue = CURRENCY_ROWS.has(row)
              ? t(`v3.vsOldWay.rows.${row}.archer${suffix}`)
              : t(`v3.vsOldWay.rows.${row}.archer`);

            return (
              <div className="vs-row" key={row} data-testid={`vs-row-${row}`}>
                <div className="vs-cell label">{label}</div>
                <div className="vs-cell old">
                  <span className="vs-icon x"><IconX /></span>
                  {oldValue}
                </div>
                <div className="vs-cell archer">
                  <span className="vs-icon check"><IconCheck /></span>
                  {archerValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
