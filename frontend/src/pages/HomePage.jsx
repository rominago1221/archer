/**
 * HomePage — Archer's new public home (v3). Mounts under route `/`.
 *
 * Orchestrates:
 *   - <PublicHeader/>       shared sticky nav (extracted from legacy Landing.js)
 *   - 5 content sections    Hero → HowItWorks → WhatWeHandle → VsOldWay → FinalCta
 *   - <Footer/>
 *
 * The `language` + `country` state lives here so every child can read a
 * single source of truth for:
 *   - FR/EN legal copy   (language)
 *   - BE/US currency     (country)
 *   - BE/US legal corpus references
 *
 * PublicHeader owns the UI toggles and notifies this page via callbacks.
 */
import React, { useEffect, useState } from 'react';
import PageHead from '../components/seo/PageHead';
import JsonLd, { ORGANIZATION_SCHEMA, SOFTWARE_APP_SCHEMA } from '../components/seo/JsonLd';
import GoogleAnalytics from '../components/seo/GoogleAnalytics';
import { PAGE_METADATA } from '../lib/seo/metadata';
import PublicHeader from '../components/PublicHeader';
import HeroSection from '../components/Home/HeroSection';
import HowItWorksSection from '../components/Home/HowItWorksSection';
import WhatWeHandleSection from '../components/Home/WhatWeHandleSection';
import VsOldWaySection from '../components/Home/VsOldWaySection';
import FinalCtaSection from '../components/Home/FinalCtaSection';
import Footer from '../components/Home/Footer';
import { useAuth } from '../contexts/AuthContext';
import { getStoredLocale } from '../data/landingTranslations';
import '../styles/home.css';

/**
 * Compute the user's "effective country" for currency + legal-corpus logic:
 *   1. Authenticated user.country / user.jurisdiction wins (respects profile).
 *   2. Otherwise fall back to the locale suffix in localStorage.
 *   3. Otherwise default to US (matches the app's global default).
 */
function resolveCountry(user, languageFallback) {
  if (user?.country) return user.country;
  if (user?.jurisdiction) return user.jurisdiction;
  // If no user, infer from UI language.
  return languageFallback === 'fr' ? 'BE' : 'US';
}

export default function HomePage() {
  const { user } = useAuth();
  const [language, setLanguage] = useState(() => {
    const loc = getStoredLocale() || 'us-en';
    return loc.split('-')[1] || 'en';
  });
  const [country, setCountry] = useState(() => {
    const loc = getStoredLocale() || 'us-en';
    return (loc.split('-')[0] || 'us').toUpperCase();
  });

  // When user identity lands, let its profile take priority over storage.
  useEffect(() => {
    const c = resolveCountry(user, language);
    if (c !== country) setCountry(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  const effectiveCountry = country || resolveCountry(user, language);
  const currency = effectiveCountry === 'BE'
    ? { code: 'EUR', symbol: '€' }
    : { code: 'USD', symbol: '$' };
  const legalCorpus = effectiveCountry === 'BE' ? 'belgian' : 'us';

  const meta = PAGE_METADATA?.home || {};

  return (
    <div className="archer-home" data-testid="home-page">
      {meta.title && <PageHead title={meta.title} description={meta.description} canonical={meta.canonical} />}
      <JsonLd data={ORGANIZATION_SCHEMA} />
      <JsonLd data={SOFTWARE_APP_SCHEMA} />
      <GoogleAnalytics />

      <PublicHeader
        onLanguageChange={setLanguage}
        onJurisdictionChange={setCountry}
      />

      <main>
        <HeroSection language={language} country={effectiveCountry} currency={currency} />
        <HowItWorksSection language={language} country={effectiveCountry} currency={currency} />
        <WhatWeHandleSection language={language} country={effectiveCountry} currency={currency} corpus={legalCorpus} />
        <VsOldWaySection language={language} country={effectiveCountry} currency={currency} />
        <FinalCtaSection language={language} country={effectiveCountry} />
      </main>

      <Footer language={language} country={effectiveCountry} />
    </div>
  );
}
