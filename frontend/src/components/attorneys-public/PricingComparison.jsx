/**
 * Attorneys page — Section 2 (pricing comparison table).
 * 4 columns (SERVICE / TRADITIONAL FIRM / ARCHER / YOU SAVE) × 2 rows
 * (letter, call). Both rows swap prices by the US/BE jurisdiction via
 * i18n keys (values already inline since copy is currency-literal).
 * Ported from design-source/archer-attorneys-v2.html lines 1540-1620.
 */
import React from 'react';
import { useAttorneysT } from '../../hooks/useAttorneysT';

const ROWS = ['letter', 'call'];

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="9 15 11 17 15 13" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

const ROW_ICON = {
  letter: <IconDoc />,
  call: <IconVideo />,
};

export default function PricingComparison({ language = 'en' }) {
  const t = useAttorneysT(language);

  return (
    <section className="section-pricing" data-testid="attorneys-pricing">
      <div className="pricing-header">
        <div className="section-eyebrow-pill">{t('pricing.eyebrow')}</div>
        <h2 className="section-title">
          {t('pricing.title_1')} <span className="accent">{t('pricing.title_2')}</span>
        </h2>
        <p className="section-sub">{t('pricing.sub')}</p>
      </div>

      <div className="pricing-table-wrap">
        <div className="pricing-table">
          <div className="pricing-table-head">
            <div className="pricing-th service">{t('pricing.columns.service')}</div>
            <div className="pricing-th market">{t('pricing.columns.traditional')}</div>
            <div className="pricing-th archer">
              <span className="pricing-th-dot" aria-hidden="true" />
              {t('pricing.columns.archer')}
            </div>
            <div className="pricing-th savings">{t('pricing.columns.save')}</div>
          </div>

          {ROWS.map((row) => (
            <div className="pricing-table-row" key={row} data-testid={`pricing-row-${row}`}>
              <div className="pricing-td service">
                <div className="pricing-td-icon">{ROW_ICON[row]}</div>
                <div className="pricing-td-info">
                  <div className="pricing-td-h">{t(`pricing.rows.${row}.service`)}</div>
                  <div className="pricing-td-d">{t(`pricing.rows.${row}.desc`)}</div>
                </div>
              </div>
              <div className="pricing-td market">
                <div className="pricing-td-amount strike">
                  {t(`pricing.rows.${row}.traditional_price`)}
                </div>
                <div className="pricing-td-meta">
                  {t(`pricing.rows.${row}.traditional_desc`)}
                </div>
              </div>
              <div className="pricing-td archer">
                <div className="pricing-td-amount accent">
                  {t(`pricing.rows.${row}.archer_price`)}
                </div>
                <div className="pricing-td-meta">
                  {t(`pricing.rows.${row}.archer_desc`)}
                </div>
              </div>
              <div className="pricing-td savings">
                <div className="pricing-savings-badge">{t(`pricing.rows.${row}.save`)}</div>
              </div>
            </div>
          ))}

          <div className="pricing-table-foot">
            <div className="pricing-foot-icon"><IconShield /></div>
            <div className="pricing-foot-text">{t('pricing.footer')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
