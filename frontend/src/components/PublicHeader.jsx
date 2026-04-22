/**
 * PublicHeader v2 — public-site top nav with language switch + jurisdiction pill.
 *
 * Layout (per frontend/src/reference/header-jurisdiction-reference.html):
 *   Left   : Archer logo + 4 nav links (Comment ça marche / Tarifs / Notre IA / Blog)
 *   Right  : Lang toggle (FR|NL|EN) | separator | Jurisdiction pill → dropdown | CTA
 *
 * Jurisdiction dropdown:
 *   - Belgium = LIVE, active (only clickable option).
 *   - France / US / UAE = "COMING SOON · 2027", disabled.
 *   - This is the visible side of the post-M6 "freeze US" decision: US isn't
 *     offered as an active jurisdiction until M6+.
 *
 * Language switch writes to the shared landingTranslations locale store.
 * Since BE is the only active jurisdiction, all 3 languages map to `be-<lang>`.
 * Authenticated users also get the new `language` pushed to their profile.
 *
 * Self-contained — parents can still observe changes via onLanguageChange /
 * onJurisdictionChange callbacks for backward compatibility.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import translations, {
  getStoredLocale,
  setStoredLocale,
} from '../data/landingTranslations';
import '../styles/header-v2.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Active language codes exposed in the header. The locale store also supports
// 'de' and 'es', but those are dropped from the v2 header per brief.
const LANG_OPTIONS = ['FR', 'NL', 'EN'];

// Nav link labels per language — kept inline because landingTranslations doesn't
// have a `nav.blog` key and the 4-link label set differs from the previous 6.
const NAV_COPY = {
  fr: {
    howItWorks: 'Comment ça marche',
    pricing: 'Tarifs',
    engine: 'Notre IA',
    blog: 'Blog',
    signIn: 'Se connecter',
    cta: 'Commencer gratuitement',
    myDashboard: 'Mon Dashboard',
  },
  nl: {
    howItWorks: 'Hoe het werkt',
    pricing: 'Prijzen',
    engine: 'Onze AI',
    blog: 'Blog',
    signIn: 'Inloggen',
    cta: 'Gratis beginnen',
    myDashboard: 'Mijn Dashboard',
  },
  en: {
    howItWorks: 'How it works',
    pricing: 'Pricing',
    engine: 'Our AI',
    blog: 'Blog',
    signIn: 'Sign in',
    cta: 'Get started free',
    myDashboard: 'My Dashboard',
  },
};

// Jurisdiction dropdown copy per UI language.
const JURISDICTION_COPY = {
  fr: {
    currentName: 'Droit belge',
    headerTitle: 'Législation applicable',
    headerSub: 'Choisissez votre juridiction',
    sectionAvailable: 'Disponible',
    comingSoon: 'Prochaines juridictions',
    comingSoonTag: 'COMING SOON',
    footer: 'Chaque juridiction utilise son propre corpus légal vérifié',
    options: {
      BE: { name: 'Belgique',            sub: 'Droit belge · Code civil · Code judiciaire' },
      FR: { name: 'France',              sub: 'Code civil · Code du travail' },
      US: { name: 'États-Unis',          sub: 'Federal Law · 50 State Laws' },
      AE: { name: 'Émirats Arabes Unis', sub: 'UAE Federal Law · DIFC · ADGM' },
    },
  },
  nl: {
    currentName: 'Belgisch recht',
    headerTitle: 'Toepasselijke wetgeving',
    headerSub: 'Kies uw rechtsgebied',
    sectionAvailable: 'Beschikbaar',
    comingSoon: 'Volgende rechtsgebieden',
    comingSoonTag: 'COMING SOON',
    footer: 'Elk rechtsgebied gebruikt zijn eigen geverifieerd juridisch corpus',
    options: {
      BE: { name: 'België',                  sub: 'Belgisch recht · Burgerlijk Wetboek · Gerechtelijk Wetboek' },
      FR: { name: 'Frankrijk',               sub: 'Burgerlijk Wetboek · Arbeidsrecht' },
      US: { name: 'Verenigde Staten',        sub: 'Federal Law · 50 State Laws' },
      AE: { name: 'Verenigde Arabische Emiraten', sub: 'UAE Federal Law · DIFC · ADGM' },
    },
  },
  en: {
    currentName: 'Belgian law',
    headerTitle: 'Applicable legislation',
    headerSub: 'Choose your jurisdiction',
    sectionAvailable: 'Available',
    comingSoon: 'Upcoming jurisdictions',
    comingSoonTag: 'COMING SOON',
    footer: 'Each jurisdiction uses its own verified legal corpus',
    options: {
      BE: { name: 'Belgium',              sub: 'Belgian law · Civil Code · Judicial Code' },
      FR: { name: 'France',               sub: 'Civil Code · Labor Code' },
      US: { name: 'United States',        sub: 'Federal Law · 50 State Laws' },
      AE: { name: 'United Arab Emirates', sub: 'UAE Federal Law · DIFC · ADGM' },
    },
  },
};

// Inline balance-scale icon (brief spec).
function BalanceIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M4 7h16" />
      <path d="M2 13h4" />
      <path d="M18 13h4" />
      <path d="M4 7L2 13" />
      <path d="M4 7l2 6" />
      <path d="M20 7l-2 6" />
      <path d="M20 7l2 6" />
      <path d="M9 21h6" />
    </svg>
  );
}

function ChevronDown({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

// Map a displayed language code (FR/NL/EN) to the locale store key.
// BE is the only active jurisdiction post-M6 freeze, so every language binds
// to `be-<lang>`. The store supports `us-en` etc. but we no longer surface US.
function localeKeyFor(lang) {
  const l = String(lang || 'fr').toLowerCase();
  return `be-${l}`;
}

export default function PublicHeader({ onLanguageChange, onJurisdictionChange }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initial language: user profile → localStorage locale → 'fr' (BE default).
  const [language, setLanguage] = useState(() => {
    const profileLang = (user?.language || '').toLowerCase();
    if (['fr', 'nl', 'en'].includes(profileLang)) return profileLang;
    const stored = getStoredLocale() || 'be-fr';
    const lang = stored.split('-')[1] || 'fr';
    return ['fr', 'nl', 'en'].includes(lang) ? lang : 'fr';
  });

  const [jurisdictionOpen, setJurisdictionOpen] = useState(false);
  const pillRef = useRef(null);

  // Sync with user profile once auth resolves.
  useEffect(() => {
    if (!user) return;
    const profileLang = (user.language || '').toLowerCase();
    if (['fr', 'nl', 'en'].includes(profileLang) && profileLang !== language) {
      setLanguage(profileLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  // Notify parent callbacks for backward compatibility with HomePage etc.
  useEffect(() => {
    onLanguageChange && onLanguageChange(language);
    onJurisdictionChange && onJurisdictionChange('BE');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!jurisdictionOpen) return;
    const handler = (e) => {
      if (pillRef.current && !pillRef.current.contains(e.target)) {
        setJurisdictionOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [jurisdictionOpen]);

  const handleLanguageChange = useCallback((langUpper) => {
    const lang = langUpper.toLowerCase();
    setLanguage(lang);
    const nextLocale = localeKeyFor(lang);
    // Only persist if the locale is known to the translations store, otherwise
    // leave the stored locale untouched (translations[...] guards against it).
    if (translations[nextLocale]) {
      setStoredLocale(nextLocale);
    }
    if (user) {
      axios.put(`${API}/profile`, { language: lang },
        { withCredentials: true }).catch(() => {});
    }
  }, [user]);

  const navCopy = NAV_COPY[language] || NAV_COPY.fr;
  const jdCopy = JURISDICTION_COPY[language] || JURISDICTION_COPY.fr;

  const handleNav = (path) => {
    setJurisdictionOpen(false);
    navigate(path);
  };

  return (
    <nav className="public-header-v2" data-testid="public-header">
      <div className="header-left">
        <div
          className="header-logo"
          onClick={() => handleNav('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleNav('/'); }}
          data-testid="public-header-logo"
        >
          <img src="/logos/archer-logo-wordmark.svg" alt="Archer" />
        </div>

        <div className="header-nav">
          <a onClick={() => handleNav('/how-it-works')} role="button" tabIndex={0}
             onKeyDown={(e) => { if (e.key === 'Enter') handleNav('/how-it-works'); }}
             data-testid="public-header-how-it-works">
            {navCopy.howItWorks}
          </a>
          <a onClick={() => handleNav('/pricing')} role="button" tabIndex={0}
             onKeyDown={(e) => { if (e.key === 'Enter') handleNav('/pricing'); }}
             data-testid="public-header-pricing">
            {navCopy.pricing}
          </a>
          <a onClick={() => handleNav('/engine')} role="button" tabIndex={0}
             onKeyDown={(e) => { if (e.key === 'Enter') handleNav('/engine'); }}
             data-testid="public-header-engine">
            {navCopy.engine}
          </a>
          <a onClick={() => handleNav('/blog')} role="button" tabIndex={0}
             onKeyDown={(e) => { if (e.key === 'Enter') handleNav('/blog'); }}
             data-testid="public-header-blog">
            {navCopy.blog}
          </a>
        </div>
      </div>

      <div className="header-right">
        {/* Language toggle */}
        <div className="lang-switch" role="tablist" aria-label="Language">
          {LANG_OPTIONS.map(l => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={language.toUpperCase() === l}
              className={`lang-opt${language.toUpperCase() === l ? ' active' : ''}`}
              onClick={() => handleLanguageChange(l)}
              data-testid={`public-header-lang-${l.toLowerCase()}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="header-sep" aria-hidden="true" />

        {/* Jurisdiction pill */}
        <div
          className={`jurisdiction-pill${jurisdictionOpen ? ' open' : ''}`}
          onClick={() => setJurisdictionOpen(v => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setJurisdictionOpen(v => !v); }}
          aria-haspopup="listbox"
          aria-expanded={jurisdictionOpen}
          ref={pillRef}
          data-testid="public-header-jurisdiction-pill"
        >
          <div className="jurisdiction-icon">
            <BalanceIcon />
          </div>
          <span className="jurisdiction-flag" aria-hidden="true">🇧🇪</span>
          <span className="jurisdiction-name">{jdCopy.currentName}</span>
          <span className="jurisdiction-live" aria-hidden="true" />
          <ChevronDown className="jurisdiction-arrow" />

          {jurisdictionOpen && (
            <div
              className="jurisdiction-dropdown"
              role="listbox"
              onClick={(e) => e.stopPropagation()}
              data-testid="public-header-jurisdiction-dropdown"
            >
              <div className="jd-header">
                <div className="jd-header-icon">
                  <BalanceIcon />
                </div>
                <div className="jd-header-body">
                  <div className="jd-header-title">{jdCopy.headerTitle}</div>
                  <div className="jd-header-sub">{jdCopy.headerSub}</div>
                </div>
              </div>

              <div className="jd-section">{jdCopy.sectionAvailable}</div>

              <button
                type="button"
                role="option"
                aria-selected="true"
                className="jd-option active"
                data-testid="public-header-jurisdiction-be"
              >
                <span className="jd-option-flag" aria-hidden="true">🇧🇪</span>
                <div className="jd-option-body">
                  <div className="jd-option-name">{jdCopy.options.BE.name}</div>
                  <div className="jd-option-sub">{jdCopy.options.BE.sub}</div>
                </div>
                <span className="jd-badge live">LIVE</span>
              </button>

              <div className="jd-sep" />

              <div className="jd-coming-banner">
                <span className="jd-coming-banner-icon" aria-hidden="true">🚀</span>
                <span className="jd-coming-banner-text">{jdCopy.comingSoon}</span>
                <span className="jd-coming-banner-tag">{jdCopy.comingSoonTag}</span>
              </div>

              {['FR', 'US', 'AE'].map((code) => (
                <div
                  key={code}
                  className="jd-option disabled"
                  role="option"
                  aria-selected="false"
                  aria-disabled="true"
                  data-testid={`public-header-jurisdiction-${code.toLowerCase()}`}
                >
                  <span className="jd-option-flag" aria-hidden="true">
                    {code === 'FR' ? '🇫🇷' : code === 'US' ? '🇺🇸' : '🇦🇪'}
                  </span>
                  <div className="jd-option-body">
                    <div className="jd-option-name">{jdCopy.options[code].name}</div>
                    <div className="jd-option-sub">{jdCopy.options[code].sub}</div>
                  </div>
                  <span className="jd-badge soon">2027</span>
                </div>
              ))}

              <div className="jd-footer">
                <InfoIcon />
                {jdCopy.footer}
              </div>
            </div>
          )}
        </div>

        {/* Auth area */}
        {user ? (
          <button
            type="button"
            className="header-cta"
            onClick={() => handleNav('/dashboard')}
            data-testid="public-header-dashboard-btn"
          >
            {navCopy.myDashboard}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="header-signin"
              onClick={() => handleNav('/login')}
              data-testid="public-header-login-btn"
            >
              {navCopy.signIn}
            </button>
            <button
              type="button"
              className="header-cta"
              onClick={() => handleNav('/signup')}
              data-testid="public-header-signup-btn"
            >
              {navCopy.cta}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
