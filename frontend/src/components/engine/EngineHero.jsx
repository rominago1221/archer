import React from 'react';

export default function EngineHero({ t }) {
  return (
    <section className="engine-hero" data-testid="engine-hero">
      <div className="engine-hero-inner">
        <div className="engine-eyebrow">{t('hero.eyebrow')}</div>
        <h1 className="engine-h1">
          {t('hero.title_before')} <span className="engine-h1-blue">{t('hero.title_highlight')}</span>
        </h1>
        <p className="engine-hero-p">{t('hero.description')}</p>

        <div className="engine-hero-stats">
          <div className="engine-hero-stat">
            <div className="engine-hero-stat-num">7<span className="unit">×</span></div>
            <div className="engine-hero-stat-label">{t('hero.stats.passes_label')}</div>
          </div>
          <div className="engine-hero-stat">
            <div className="engine-hero-stat-num">900<span className="unit">K</span></div>
            <div className="engine-hero-stat-label">{t('hero.stats.statutes_label')}</div>
          </div>
          <div className="engine-hero-stat">
            <div className="engine-hero-stat-num">94.7<span className="unit">%</span></div>
            <div className="engine-hero-stat-label">{t('hero.stats.accuracy_label')}</div>
          </div>
          <div className="engine-hero-stat">
            <div className="engine-hero-stat-num">2.5<span className="unit">M</span></div>
            <div className="engine-hero-stat-label">{t('hero.stats.docs_label')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
