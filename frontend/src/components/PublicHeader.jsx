/**
 * PublicHeader — extracted verbatim from Landing.js:455 (the old inline <nav>)
 * so the new HomePage and other upcoming public pages (about, pricing, …)
 * share the same sticky top nav.
 *
 * Self-contained: owns the jurisdiction + language state in localStorage
 * via the existing `landingTranslations` helpers, and persists to the user
 * profile when authenticated.
 *
 * Parents that need to observe the language/jurisdiction (e.g. HomePage's
 * currency + legal-corpus logic) can pass callbacks; otherwise it just works.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import JurisdictionPills from './JurisdictionPills';
import translations, {
  getStoredLocale,
  setStoredLocale,
  getLocaleFromPrefs,
} from '../data/landingTranslations';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicHeader({ onLanguageChange, onJurisdictionChange }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initial locale: user prefs if authed, else localStorage, else 'us-en'.
  const [locale, setLocale] = useState(() => {
    if (user) {
      const fromPrefs = getLocaleFromPrefs(user.jurisdiction || user.country, user.language);
      if (fromPrefs) return fromPrefs;
    }
    return getStoredLocale() || 'us-en';
  });

  // Re-sync when user identity becomes available.
  useEffect(() => {
    if (!user) return;
    const fromPrefs = getLocaleFromPrefs(user.jurisdiction || user.country, user.language);
    if (fromPrefs && fromPrefs !== locale) {
      setLocale(fromPrefs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  const t = translations[locale] || translations['us-en'];
  const jurisdiction = t.country;          // 'BE' | 'US'
  const language = locale.split('-')[1];   // 'en' | 'fr' | 'nl' | 'de' | 'es'

  // Notify parent on first mount + any change, so HomePage can pick up
  // currency + corpus on its first render without waiting for user interaction.
  useEffect(() => {
    onLanguageChange && onLanguageChange(language);
    onJurisdictionChange && onJurisdictionChange(jurisdiction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, jurisdiction]);

  const handleJurisdictionChange = useCallback((j) => {
    // Keep current language if it still maps to a locale for the new jurisdiction,
    // otherwise pick the jurisdiction's default language.
    const candidate = `${j.toLowerCase()}-${language}`;
    const next = translations[candidate]
      ? candidate
      : (j === 'BE' ? 'be-fr' : 'us-en');
    setLocale(next);
    setStoredLocale(next);
    if (user) {
      axios.put(`${API}/profile`, { jurisdiction: j, country: j },
        { withCredentials: true }).catch(() => {});
    }
  }, [language, user]);

  const handleLanguageChange = useCallback((l) => {
    const candidate = `${jurisdiction.toLowerCase()}-${l}`;
    const next = translations[candidate] ? candidate : locale;
    setLocale(next);
    setStoredLocale(next);
    if (user) {
      axios.put(`${API}/profile`, { language: l },
        { withCredentials: true }).catch(() => {});
    }
  }, [jurisdiction, locale, user]);

  return (
    <nav
      className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-[#ebebeb] z-50"
      data-testid="public-header"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
          data-testid="public-header-logo"
        >
          <img src="/logos/archer-logo-wordmark.svg" alt="Archer" style={{ height: 32 }} />
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-[#555]">
          <span
            onClick={() => navigate('/how-it-works')}
            className="hover:text-[#1a56db] cursor-pointer"
          >
            {t.nav.howItWorks}
          </span>
          <span
            onClick={() => navigate('/attorneys')}
            className="hover:text-[#1a56db] cursor-pointer"
            data-testid="public-header-attorneys"
          >
            {t.nav.attorneys}
          </span>
          <span
            onClick={() => navigate('/engine')}
            className="hover:text-[#1a56db] cursor-pointer"
            data-testid="public-header-engine"
          >
            {t.nav.engine}
          </span>
          <span
            onClick={() => navigate('/pricing')}
            className="hover:text-[#1a56db] cursor-pointer"
          >
            {t.nav.pricing}
          </span>
          <span
            onClick={() => navigate('/winning-cases')}
            className="hover:text-[#1a56db] cursor-pointer"
          >
            {t.nav.wins}
          </span>
          <a href="#faq" className="hover:text-[#1a56db]">{t.nav.faq}</a>
        </div>

        <div className="flex items-center gap-3">
          <JurisdictionPills
            jurisdiction={jurisdiction}
            language={language}
            onSwitch={handleJurisdictionChange}
            onLanguageChange={handleLanguageChange}
          />
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-[#1a56db] text-white text-sm font-medium rounded-full hover:bg-[#1546b3] transition-colors"
              data-testid="public-header-dashboard-btn"
            >
              {language === 'fr' ? 'Mon Dashboard' : 'My Dashboard'}
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-[#555] hover:text-[#1a56db]"
                data-testid="public-header-login-btn"
              >
                {t.nav.signIn}
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-4 py-2 bg-[#1a56db] text-white text-sm font-medium rounded-full hover:bg-[#1546b3] transition-colors"
                data-testid="public-header-signup-btn"
              >
                {t.nav.getStarted}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
