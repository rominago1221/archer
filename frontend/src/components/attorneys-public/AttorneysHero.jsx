/**
 * Attorneys page — Section 1 (Hero split).
 *
 * Left : eyebrow, H1 with blue accent, sub, 3 role items, 2 CTAs.
 * Right : 3 stacked cards matching the HTML source classes exactly
 *   (`.live-card` + `.optional-callout`), styled by scoped attorneys.css.
 *
 * Trust rows are split on ` · ` to render each item with its own
 * checkmark icon — matches the design. Both FR and EN translations use
 * ` · ` as the separator (see attorneys.json hero.card*.trust).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useAttorneysT } from '../../hooks/useAttorneysT';
import { attorneys } from '../../data/attorneys';

const nameOf = (a, isFr) => (isFr ? a.nameFr : a.nameEn);

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TrustRow({ trustString }) {
  const items = trustString.split(' · ').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="live-meta-row">
      {items.map((item) => (
        <span key={item}><CheckIcon /> {item}</span>
      ))}
    </div>
  );
}

function AttorneyLiveCard({ status, online, attorney, isFr, t, prefix }) {
  const barYears = t(`hero.bar_years_template`, {
    bar: attorney.bar,
    years: attorney.experienceYears,
  });
  return (
    <div className="live-card">
      <div className="live-card-h-row">
        <div className="live-card-h">{status}</div>
        <div className="live-card-status">{online}</div>
      </div>

      <div className="live-attorney">
        <div
          className="live-attorney-avatar"
          style={{ backgroundImage: `url(${attorney.photo})` }}
          aria-hidden="true"
        />
        <div className="live-attorney-info">
          <div className="live-attorney-name">{nameOf(attorney, isFr)}</div>
          <div className="live-attorney-meta">
            {barYears}
            <span className="live-attorney-badge">{t(`hero.${prefix}.verified`)}</span>
          </div>
        </div>
      </div>

      <div className="live-pricing">
        <div className="live-pricing-info">
          <div className="live-pricing-label">{t(`hero.${prefix}.service`)}</div>
          <div className="live-pricing-value">{t(`hero.${prefix}.price`)}</div>
        </div>
        <div className="live-pricing-meta">{t(`hero.${prefix}.delivery`)}</div>
      </div>

      <Link to="/signup" className="live-cta">
        {t(`hero.${prefix}.cta`)} <span aria-hidden="true">→</span>
      </Link>

      <TrustRow trustString={t(`hero.${prefix}.trust`)} />
    </div>
  );
}

export default function AttorneysHero({ language = 'en' }) {
  const t = useAttorneysT(language);
  const isFr = String(language).slice(0, 2).toLowerCase() === 'fr';

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
            {['validate', 'sign', 'follow'].map((k) => (
              <div className="role-item" key={k}>
                <div className="role-icon"><CheckIcon /></div>
                <div className="role-text">
                  <div className="role-h">{t(`hero.roles.${k}.h`)}</div>
                  <div className="role-d">{t(`hero.roles.${k}.d`)}</div>
                </div>
              </div>
            ))}
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
          <AttorneyLiveCard
            status={t('hero.card1.status')}
            online={t('hero.card1.reviewing')}
            attorney={attorneys[0]}
            isFr={isFr}
            t={t}
            prefix="card1"
          />

          <div className="optional-callout">
            <div className="optional-callout-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="optional-callout-text">
              <div className="optional-callout-h">{t('hero.card2.title')}</div>
              <div className="optional-callout-p">
                <strong>{t('hero.card2.text_strong')}</strong> {t('hero.card2.text_rest')}
              </div>
            </div>
          </div>

          <AttorneyLiveCard
            status={t('hero.card3.status')}
            online={t('hero.card3.online')}
            attorney={attorneys[2]}
            isFr={isFr}
            t={t}
            prefix="card3"
          />
        </div>
      </div>
    </section>
  );
}
