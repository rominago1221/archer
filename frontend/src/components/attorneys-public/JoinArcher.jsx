/**
 * Attorneys page — Section 5 (Join Archer recruiting box).
 * Dark card with glass stat-cards on the right, two CTAs on the left.
 * `/attorneys/apply` + `/attorneys/learn-more` are placeholders — routes
 * don't exist yet, so the anchors are inert (no <Link> wrapping).
 */
import React from 'react';
import { useAttorneysT } from '../../hooks/useAttorneysT';

const STAT_KEYS = ['s1', 's2', 's3', 's4'];
const ACCENT_KEYS = new Set(['s1', 's4']);

export default function JoinArcher({ language = 'en' }) {
  const t = useAttorneysT(language);
  return (
    <section className="section-join" data-testid="attorneys-join">
      <div className="join-box">
        <div className="join-left">
          <div className="join-eyebrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            {t('join.eyebrow')}
          </div>
          <h2 className="join-title">
            {t('join.title_1')}
            <span className="join-title-accent">{t('join.title_2')}</span>
          </h2>
          <p className="join-sub">{t('join.sub')}</p>

          <div className="join-cta-row">
            <a href="/attorneys/apply" className="join-btn">
              {t('join.cta_primary')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a href="/attorneys/learn-more" className="join-btn-ghost">
              {t('join.cta_secondary')} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="join-right">
          {STAT_KEYS.map((k) => (
            <div className="join-stat-card" key={k}>
              <div className={`join-stat-num${ACCENT_KEYS.has(k) ? ' accent' : ''}`}>
                {t(`join.stats.${k}.num`)}
              </div>
              <div className="join-stat-label">{t(`join.stats.${k}.label`)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
