/**
 * Section 3 — "What we handle" — 7-card bento grid with asymmetric sizes.
 *
 * Sizes (mirror the CSS classes):
 *   01 Traffic        — bento-huge   (2x2, MOST REPORTED badge)
 *   02 Debt           — bento-tall   (1x2)
 *   03 Consumer       — bento-small  (1x1)
 *   04 Family         — bento-small  (1x1)
 *   05 Eviction       — bento-wide   (2x1)
 *   06 Wrongful term. — bento-small  (1x1)
 *   07 Insurance      — bento-small  (1x1)
 *
 * Stats swap by `currency.code`: EUR→€3,200, USD→$3,500 etc.
 * Ported from design-source HTML lines 2009-2167.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useHomeT } from '../../hooks/useHomeT';

// Per-card palette + size class + icon. Keyed against i18n so content and
// presentation stay aligned.
const CARDS = [
  { key: 'traffic',   size: 'bento-huge',  accent: '#dc2626', accentBg: '#fef2f2', num: '01', iconId: 'traffic'  },
  { key: 'debt',      size: 'bento-tall',  accent: '#b45309', accentBg: '#fffbeb', num: '02', iconId: 'debt'     },
  { key: 'consumer',  size: 'bento-small', accent: '#1a56db', accentBg: '#eff6ff', num: '03', iconId: 'consumer' },
  { key: 'family',    size: 'bento-small', accent: '#a855f7', accentBg: '#fdf4ff', num: '04', iconId: 'family'   },
  { key: 'eviction',  size: 'bento-wide',  accent: '#dc2626', accentBg: '#fef2f2', num: '05', iconId: 'eviction' },
  { key: 'wrongful',  size: 'bento-small', accent: '#16a34a', accentBg: '#f0fdf4', num: '06', iconId: 'briefcase'},
  { key: 'insurance', size: 'bento-small', accent: '#b45309', accentBg: '#fffbeb', num: '07', iconId: 'shield'   },
];

function BentoIcon({ id }) {
  switch (id) {
    case 'traffic':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 17h-4M5 17l1.5-7h11L19 17M5 17H4a1 1 0 0 1-1-1v-1m2 2v3M19 17h1a1 1 0 0 0 1-1v-1m-2 2v3M5 13h14M7 9V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3" />
          <circle cx="7" cy="14" r="1" />
          <circle cx="17" cy="14" r="1" />
        </svg>
      );
    case 'debt':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'consumer':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'family':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'eviction':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function WhatWeHandleSection({ language = 'en', currency }) {
  const t = useHomeT(language);
  const isEUR = (currency?.code || 'USD') === 'EUR';
  const statSuffix = isEUR ? '_eur' : '_usd';

  const subHtml = t('v3.whatWeHandle.sub_html');

  return (
    <section className="section-handle" data-testid="home-what-we-handle">
      <div className="handle-header">
        <div className="handle-header-left">
          <div className="section-eyebrow">{t('v3.whatWeHandle.eyebrow')}</div>
          <h2 className="handle-title">
            {t('v3.whatWeHandle.title_line1')}<br />
            <span className="handle-title-accent">{t('v3.whatWeHandle.title_highlight')}</span>
          </h2>
        </div>
        <div className="handle-header-right">
          {/* `sub_html` contains a <strong> tag; using dangerouslySetInnerHTML
              here is intentional and the content comes from our own i18n. */}
          <p
            className="handle-sub"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: subHtml }}
          />
        </div>
      </div>

      <div className="bento-wrap">
        <div className="bento-grid">
          {CARDS.map(({ key, size, accent, accentBg, num, iconId }) => {
            const isHuge = size === 'bento-huge';
            const isWide = size === 'bento-wide';
            const isSmall = size === 'bento-small';
            const isTall = size === 'bento-tall';

            const title = t(`v3.whatWeHandle.cards.${key}.title`);
            const desc = t(`v3.whatWeHandle.cards.${key}.desc`);
            const statLabel = t(`v3.whatWeHandle.cards.${key}.stat_label`);
            // Traffic uses a non-currency stat (94% success); others use the
            // EUR/USD pair.
            const statValue = key === 'traffic'
              ? t('v3.whatWeHandle.cards.traffic.stat_value')
              : t(`v3.whatWeHandle.cards.${key}.stat${statSuffix}`);
            const badge = key === 'traffic' ? t('v3.whatWeHandle.cards.traffic.badge') : null;

            return (
              <div
                key={key}
                className={`bento-card ${size}`}
                style={{ '--accent': accent, '--accent-bg': accentBg }}
                data-testid={`bento-${key}`}
              >
                {badge && <div className="bento-badge">{badge}</div>}

                <div className="bento-icon-wrap">
                  <div className="bento-icon"><BentoIcon id={iconId} /></div>
                  <span className={isHuge ? 'bento-num-big' : 'bento-num'}>{num}</span>
                </div>

                {isHuge ? (
                  <>
                    <div className="bento-content">
                      <h3 className="bento-h-big">{title}</h3>
                      <p className="bento-p-big">{desc}</p>
                    </div>
                    <div className="bento-stat-big">
                      <span className="bento-stat-num">{statValue}</span>
                      <span className="bento-stat-label">{statLabel}</span>
                    </div>
                  </>
                ) : isTall ? (
                  <>
                    <div className="bento-content">
                      <h3 className="bento-h">{title}</h3>
                      <p className="bento-p">{desc}</p>
                    </div>
                    <div className="bento-stat">
                      <span className="bento-stat-num">{statValue}</span>
                      <span className="bento-stat-label">{statLabel}</span>
                    </div>
                  </>
                ) : isWide ? (
                  <div className="bento-wide-content">
                    <h3 className="bento-h">{title}</h3>
                    <p className="bento-p">{desc}</p>
                    <div className="bento-stat-mini">
                      <span className="bento-stat-mini-num">{statValue}</span>
                      <span className="bento-stat-mini-label">{statLabel}</span>
                    </div>
                  </div>
                ) : (
                  // isSmall
                  <>
                    <h3 className="bento-h-sm">{title}</h3>
                    <p className="bento-p-sm">{desc}</p>
                    <div className="bento-stat-mini">
                      <span className="bento-stat-mini-num">{statValue}</span>
                      <span className="bento-stat-mini-label">{statLabel}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="see-all-wrap">
          <Link to="/signup" className="see-all-link">
            <span className="see-all-text">{t('v3.whatWeHandle.see_all')}</span>
            <span className="see-all-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
