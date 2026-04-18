/**
 * Attorneys page — Section 3 (filterable attorney grid).
 *
 * Filter bar has 10 pills: `all` + 9 specialties. Clicking updates local
 * state; `useMemo` derives the visible subset. Selected pill announces
 * its pressed state via `aria-pressed`.
 *
 * Card HTML mirrors the design-source classes verbatim so the scoped
 * attorneys.css stays valid without any rewrites on our side.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttorneysT } from '../../hooks/useAttorneysT';
import { attorneys, filterCategories } from '../../data/attorneys';

// Per-area minimal glyphs — intentionally tiny. The CSS colour tokens
// (`.area-traffic`, `.area-debt`, …) come from attorneys.css.
function AreaIcon({ area }) {
  switch (area) {
    case 'traffic':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14 17h-4M5 17l1.5-7h11L19 17M5 17H4a1 1 0 0 1-1-1v-1m2 2v3M19 17h1a1 1 0 0 0 1-1v-1m-2 2v3M5 13h14" />
          <circle cx="7" cy="14" r="0.5" />
          <circle cx="17" cy="14" r="0.5" />
        </svg>
      );
    case 'debt':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'consumer':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'family':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'eviction':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'employment':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case 'insurance':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'discrimination':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case 'real_estate':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14h2M14 14h2M8 17h2M14 17h2" />
        </svg>
      );
    default:
      return null;
  }
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function MeetAttorneys({ language = 'en' }) {
  const t = useAttorneysT(language);
  const isFr = String(language).slice(0, 2).toLowerCase() === 'fr';
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredAttorneys = useMemo(() => {
    if (activeFilter === 'all') return attorneys;
    return attorneys.filter((a) => a.areas.includes(activeFilter));
  }, [activeFilter]);

  const nameOf = (a) => (isFr ? a.nameFr : a.nameEn);

  return (
    <section className="section-attorneys" id="attorneys" data-testid="attorneys-meet">
      <div className="attorneys-header">
        <div className="section-eyebrow-pill">{t('meet.eyebrow')}</div>
        <h2 className="section-title">
          {t('meet.title_1')} <span className="accent">{t('meet.title_2')}</span>
        </h2>
        <p className="section-sub">{t('meet.sub')}</p>
      </div>

      <div className="filter-bar" role="group" aria-label={t('meet.eyebrow')}>
        {filterCategories.map(({ id, count }) => {
          const isActive = activeFilter === id;
          return (
            <button
              key={id}
              type="button"
              className={`filter-pill${isActive ? ' active' : ''}`}
              onClick={() => setActiveFilter(id)}
              aria-pressed={isActive}
              data-testid={`filter-${id}`}
            >
              {t(`meet.filters.${id}`)}
              <span className="count"> {count.toLocaleString(isFr ? 'fr-FR' : 'en-US')}</span>
            </button>
          );
        })}
      </div>

      <div className="attorneys-grid">
        {filteredAttorneys.map((a) => (
          <div
            key={a.id}
            className="attorney-card"
            data-areas={a.areas.join(' ')}
            data-testid={`attorney-${a.id}`}
          >
            <div className="attorney-top">
              <div
                className={`attorney-avatar${a.online ? ' online' : ''}`}
                style={{ backgroundImage: `url(${a.photo})` }}
                role="img"
                aria-label={nameOf(a)}
              />
              <div className="attorney-info">
                <div className="attorney-name">{nameOf(a)}</div>
                <div className="attorney-bar">
                  <ShieldIcon />
                  {a.bar}
                </div>
              </div>
            </div>
            <div className="attorney-stats">
              <div className="attorney-stat">
                <div className="attorney-stat-num">
                  {t('meet.years_template', { n: a.experienceYears })}
                </div>
                <div className="attorney-stat-label">{t('meet.stat_labels.experience')}</div>
              </div>
              <div className="attorney-stat">
                <div className="attorney-stat-num">{a.winRate}</div>
                <div className="attorney-stat-label">{t('meet.stat_labels.winRate')}</div>
              </div>
              <div className="attorney-stat">
                <div className="attorney-stat-num">{a.cases}</div>
                <div className="attorney-stat-label">{t('meet.stat_labels.cases')}</div>
              </div>
            </div>
            <div className="attorney-areas">
              {a.areas.map((area) => (
                <span key={area} className={`area-tag area-${area.replace('_', '-')}`}>
                  <AreaIcon area={area} />
                  {t(`meet.filters.${area}`)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="attorneys-view-all">
        <Link to="/signup" className="view-all-link">
          {t('meet.view_all')} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
