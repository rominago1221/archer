/**
 * Section 2 — "How it works" — 5-node horizontal timeline with hover tooltips.
 * Ported from design-source HTML lines 1893-2004.
 * Step 4 ("REVIEW") shows the attorney-validation price; swapped EUR/USD via
 * the `currency` prop.
 */
import React from 'react';
import { useHomeT } from '../../hooks/useHomeT';

const STEP_KEYS = ['s1', 's2', 's3', 's4', 's5'];

function StepIcon({ step }) {
  // One SVG glyph per step — matches the HTML source per-node icon.
  switch (step) {
    case 's1':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    case 's2':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case 's3':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4" />
          <polyline points="9 11 12 8 15 11" />
          <line x1="12" y1="2" x2="12" y2="14" />
        </svg>
      );
    case 's4':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 's5':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function HowItWorksSection({ language = 'en', currency }) {
  const t = useHomeT(language);
  // EUR/USD variant selector for step 4.
  const isEUR = (currency?.code || 'USD') === 'EUR';
  const priceSuffix = isEUR ? '_eur' : '_usd';

  return (
    <section className="section-flow" data-testid="home-how-it-works">
      <div className="section-header">
        <div className="section-eyebrow">{t('v3.howItWorks.eyebrow')}</div>
        <h2 className="section-title">
          {t('v3.howItWorks.title_line1')}<br />
          <span className="section-title-highlight">{t('v3.howItWorks.title_highlight')}</span>
        </h2>
        <p className="section-sub">{t('v3.howItWorks.sub')}</p>
      </div>

      <div className="t1-wrap">
        <div className="t1-grid">
          <div className="t1-line" aria-hidden="true" />

          {STEP_KEYS.map((key) => {
            // step 4 swaps desc + tooltip_meta by currency; others are invariant.
            const isReview = key === 's4';
            const desc = isReview
              ? t(`v3.howItWorks.steps.${key}.desc${priceSuffix}`)
              : t(`v3.howItWorks.steps.${key}.desc`);
            const tooltipMeta = isReview
              ? t(`v3.howItWorks.steps.${key}.tooltip_meta${priceSuffix}`)
              : t(`v3.howItWorks.steps.${key}.tooltip_meta`);
            const tooltipItems = t(`v3.howItWorks.steps.${key}.tooltip_items`) || [];

            return (
              <div className="t1-step" key={key} data-testid={`how-step-${key}`}>
                <div className="t1-node">
                  <StepIcon step={key} />
                </div>
                <div className="t1-num">{t(`v3.howItWorks.steps.${key}.num`)}</div>
                <div className="t1-name">{t(`v3.howItWorks.steps.${key}.name`)}</div>
                <div className="t1-desc">{desc}</div>
                <div className="t1-tooltip" role="tooltip">
                  <div className="t1-tooltip-arrow" aria-hidden="true" />
                  <div className="t1-tooltip-h">{t(`v3.howItWorks.steps.${key}.tooltip_h`)}</div>
                  <ul className="t1-tooltip-list">
                    {Array.isArray(tooltipItems) && tooltipItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <div className="t1-tooltip-meta">{tooltipMeta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
