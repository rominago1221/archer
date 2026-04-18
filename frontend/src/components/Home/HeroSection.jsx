/**
 * Section 1 — Hero.
 *
 * Left column  : eyebrow (flag adapts BE/US), "Meet Archer" title, subcopy,
 *                two CTAs, 4 trust-pills (7 layers / 3M+ sources / 18K+ daily / 2,000+ attorneys).
 * Right column : <ThreeSphere/> with 4 glass HUD badges whose numeric values
 *                tick live via useState + setInterval (cleanup on unmount).
 *
 * i18n keys live under `v3.hero.*` in src/i18n/home.json.
 * Currency isn't used in this section — hero copy is currency-agnostic.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHomeT } from '../../hooks/useHomeT';
import ThreeSphere from './ThreeSphere';

// ── Live counter constants (user-specified ranges) ──────────────────────
const INITIAL_CASES = 2_547_891;       // ticks up every 2s
const INITIAL_SOURCES = 3_047_891;     // 3.04M, ticks slowly
const CONFIDENCE_MIN = 94.0;
const CONFIDENCE_MAX = 94.5;
const TICK_INTERVAL_MS = 2_000;

// Locale-aware formatting so 2,547,891 vs 2 547 891 matches the UI language.
function formatInt(n, language) {
  const locale = (language || 'en').startsWith('fr') ? 'fr-FR' : 'en-US';
  try {
    return n.toLocaleString(locale);
  } catch {
    return String(n);
  }
}

export default function HeroSection({ language = 'en', country = 'US' }) {
  const t = useHomeT(language);
  const navigate = useNavigate();

  // Live counter state — a single tick updates all three.
  const [cases, setCases] = useState(INITIAL_CASES);
  const [casesDelta, setCasesDelta] = useState(12);
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [sourcesDelta, setSourcesDelta] = useState(47);
  const [confidence, setConfidence] = useState(94.2);

  // IntersectionObserver pauses the tick when the hero is off-screen — keeps
  // battery / CPU budget friendly on long scroll sessions.
  const heroRef = useRef(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!visibleRef.current) return;
      const inc = Math.floor(Math.random() * 3) + 1;
      setCases((n) => n + inc);
      setCasesDelta((d) => (d + inc > 60 ? Math.floor(Math.random() * 18) + 8 : d + inc));
      const sInc = Math.random() > 0.5 ? 1 : 0;
      setSources((n) => n + sInc);
      setSourcesDelta((d) => {
        const next = d + Math.floor(Math.random() * 2);
        return next > 100 ? Math.floor(Math.random() * 50) + 20 : next;
      });
      setConfidence(
        +((CONFIDENCE_MIN + Math.random() * (CONFIDENCE_MAX - CONFIDENCE_MIN))).toFixed(1)
      );
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const eyebrowKey = country === 'BE' ? 'v3.hero.eyebrow_be' : 'v3.hero.eyebrow_us';
  const sourcesDisplay = (sources / 1_000_000).toFixed(2);

  return (
    <section className="hero" ref={heroRef} data-testid="home-hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-inner">

        {/* LEFT — copy, CTAs, 4 trust-pills */}
        <div>
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-line" aria-hidden="true" />
            <span className="hero-eyebrow-flag">{t(eyebrowKey)}</span>
          </div>

          <h1 className="hero-title">
            <span className="meet">{t('v3.hero.title_meet')}</span>
            <span className="archer">{t('v3.hero.title_archer')}</span>
          </h1>

          <p className="hero-sub">
            <strong>{t('v3.hero.sub_strong')}</strong> {t('v3.hero.sub_rest')}
          </p>

          <div className="hero-cta-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/signup')}
              data-testid="hero-cta-primary"
            >
              {t('v3.hero.cta_primary')} <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/how-it-works')}
              data-testid="hero-cta-secondary"
            >
              {t('v3.hero.cta_secondary')}
            </button>
          </div>

          <div className="trust-pills">
            {/* Pill 1 — 7 layers */}
            <div className="trust-pill">
              <div className="trust-pill-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2 L20 6 L20 12 C20 17 16 21 12 22 C8 21 4 17 4 12 L4 6 Z" strokeLinejoin="round" />
                  <path d="M9 12 L11 14 L15 10" />
                </svg>
              </div>
              <div className="trust-pill-content">
                <div className="trust-pill-num">
                  <span className="accent">{t('v3.hero.pill1_num_accent')}</span> {t('v3.hero.pill1_num_suffix')}
                </div>
                <div className="trust-pill-label">{t('v3.hero.pill1_label')}</div>
              </div>
            </div>

            {/* Pill 2 — 3M+ sources (DAILY fresh badge) */}
            <div className="trust-pill">
              <div className="trust-pill-fresh-badge">{t('v3.hero.pill2_badge')}</div>
              <div className="trust-pill-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div className="trust-pill-content">
                <div className="trust-pill-num">
                  <span className="accent">{t('v3.hero.pill2_num_accent')}</span> {t('v3.hero.pill2_num_suffix')}
                </div>
                <div className="trust-pill-label">{t('v3.hero.pill2_label')}</div>
              </div>
            </div>

            {/* Pill 3 — 18K+ daily (pulsing LIVE badge) */}
            <div className="trust-pill">
              <div className="trust-pill-live-badge">
                <span className="live-dot" />
                {t('v3.hero.pill3_badge')}
              </div>
              <div className="trust-pill-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </div>
              <div className="trust-pill-content">
                <div className="trust-pill-num">
                  <span className="accent">{t('v3.hero.pill3_num_accent')}</span> {t('v3.hero.pill3_num_suffix')}
                </div>
                <div className="trust-pill-label">{t('v3.hero.pill3_label')}</div>
              </div>
            </div>

            {/* Pill 4 — 2,000+ attorneys */}
            <div className="trust-pill">
              <div className="trust-pill-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="trust-pill-content">
                <div className="trust-pill-num">
                  <span className="accent">{t('v3.hero.pill4_num_accent')}</span> {t('v3.hero.pill4_num_suffix')}
                </div>
                <div className="trust-pill-label">{t('v3.hero.pill4_label')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Three.js sphere + 4 floating HUD badges */}
        <div className="hero-sphere" data-testid="hero-sphere">
          <ThreeSphere />

          <div className="sphere-tag-top">{t('v3.hero.sphere_tag_top')}</div>

          <div className="sphere-badge sphere-badge-1">
            <div className="sphere-badge-label">
              <span className="sphere-badge-dot" />
              {t('v3.hero.badge_sources_label')}
            </div>
            <div className="sphere-badge-value" data-testid="badge-sources">
              {sourcesDisplay}
              <span className="sphere-badge-unit">M</span>
            </div>
            <div className="sphere-badge-meta">
              {t('v3.hero.badge_sources_meta_prefix')}
              {sourcesDelta}
              {t('v3.hero.badge_sources_meta_suffix')}
            </div>
          </div>

          <div className="sphere-badge sphere-badge-2">
            <div className="sphere-badge-label">{t('v3.hero.badge_confidence_label')}</div>
            <div className="sphere-badge-value" data-testid="badge-confidence">
              {confidence.toFixed(1)}
              <span className="sphere-badge-unit">%</span>
            </div>
            <div className="sphere-badge-meta sphere-badge-meta-grey">
              {t('v3.hero.badge_confidence_meta')}
            </div>
          </div>

          <div className="sphere-badge sphere-badge-3">
            <div className="sphere-badge-label">{t('v3.hero.badge_reasoning_label')}</div>
            <div className="sphere-badge-value">
              {t('v3.hero.badge_reasoning_value')}
              <span className="sphere-badge-unit">{t('v3.hero.badge_reasoning_unit')}</span>
            </div>
            <div className="sphere-badge-meta sphere-badge-meta-grey">
              {t('v3.hero.badge_reasoning_meta')}
            </div>
          </div>

          <div className="sphere-badge sphere-badge-4">
            <div className="sphere-badge-label">
              <span className="sphere-badge-dot" />
              {t('v3.hero.badge_cases_label')}
            </div>
            <div className="sphere-badge-value" data-testid="badge-cases">
              {formatInt(cases, language)}
            </div>
            <div className="sphere-badge-meta">
              {t('v3.hero.badge_cases_meta_prefix')}
              {casesDelta}
              {t('v3.hero.badge_cases_meta_suffix')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
