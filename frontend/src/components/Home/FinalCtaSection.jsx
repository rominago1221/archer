/**
 * Section 5 — Final CTA (dark boxed card, radial blue gradient).
 * Ported from design-source HTML lines 2281-2303.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useHomeT } from '../../hooks/useHomeT';

export default function FinalCtaSection({ language = 'en' }) {
  const t = useHomeT(language);

  return (
    <section className="cta-section" data-testid="home-final-cta">
      <div className="cta-box">
        <div className="cta-eyebrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {t('v3.finalCta.eyebrow')}
        </div>
        <h2 className="cta-title">
          {t('v3.finalCta.title_line1')}{' '}
          <span className="cta-title-accent">{t('v3.finalCta.title_highlight')}</span>
        </h2>
        <p className="cta-sub">{t('v3.finalCta.sub')}</p>
        <Link to="/signup" className="cta-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {t('v3.finalCta.cta')}
        </Link>
        <div className="cta-meta">{t('v3.finalCta.meta')}</div>
      </div>
    </section>
  );
}
