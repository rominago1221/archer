/**
 * Attorneys page — Section 1 (Hero split).
 *
 * Left : eyebrow, H1 with blue accent, sub, 3 role items, 2 CTAs.
 * Right : single AttorneyServicesBox showing both services (signed letter
 * + live call) inside an animated conic-gradient beam border.
 */
import React from 'react';
import { CheckCircle2, PenLine, TrendingUp } from 'lucide-react';
import { useAttorneysT } from '../../hooks/useAttorneysT';
import AttorneyServicesBox from './AttorneyServicesBox';

const ROLE_ICONS = {
  validate: CheckCircle2,
  sign: PenLine,
  follow: TrendingUp,
};

export default function AttorneysHero({ language = 'en', country = 'BE' }) {
  const t = useAttorneysT(language);

  return (
    <section className="hero" data-testid="attorneys-hero">
      <div className="hero-inner">
        <div className="hero-left">
          <div className="hero-eyebrow">{t('hero.eyebrow')}</div>
          <h1 className="hero-title">
            {t('hero.title_1')}<br />
            <span className="accent">{t('hero.title_2')}</span>
          </h1>
          <p className="hero-sub">
            <strong>{t('hero.sub_strong')}</strong> {t('hero.sub_rest')}
          </p>

          <div className="hero-roles">
            {['validate', 'sign', 'follow'].map((k) => {
              const Icon = ROLE_ICONS[k];
              return (
                <div className="role-item" key={k}>
                  <div className="role-icon">
                    <Icon aria-hidden="true" strokeWidth={2.25} />
                  </div>
                  <div className="role-text">
                    <div className="role-h">{t(`hero.roles.${k}.h`)}</div>
                    <div className="role-d">{t(`hero.roles.${k}.d`)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hero-cta-row">
            <a href="#attorneys" className="btn-primary">
              {t('hero.cta_primary')} <span aria-hidden="true">→</span>
            </a>
            <a href="#how-we-select" className="btn-secondary">
              {t('hero.cta_secondary')}
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <AttorneyServicesBox language={language} country={country} />
        </div>
      </div>
    </section>
  );
}
