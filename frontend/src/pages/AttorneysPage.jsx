/**
 * AttorneysPage — public `/attorneys` page. Same shell pattern as
 * HomePage: PublicHeader (unchanged) on top, then a `.attorneys-page`
 * wrapper div so every scoped rule in attorneys.css applies only here.
 *
 * Language comes from localStorage via `landingTranslations.getStoredLocale`
 * — mirrors how HomePage syncs with the PublicHeader locale toggles.
 */
import React, { useEffect, useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import AttorneysHero from '../components/attorneys-public/AttorneysHero';
import PricingComparison from '../components/attorneys-public/PricingComparison';
import MeetAttorneys from '../components/attorneys-public/MeetAttorneys';
import HowWeSelect from '../components/attorneys-public/HowWeSelect';
import JoinArcher from '../components/attorneys-public/JoinArcher';
import Footer from '../components/Home/Footer';
import { getStoredLocale } from '../data/landingTranslations';
import '../styles/home.css';
import '../styles/attorneys.css';

function resolveLang() {
  const loc = getStoredLocale() || 'us-en';
  return (loc.split('-')[1] || 'en').toLowerCase();
}

function resolveCountry() {
  const loc = getStoredLocale() || 'us-en';
  return (loc.split('-')[0] || 'us').toUpperCase();
}

export default function AttorneysPage() {
  const [language, setLanguage] = useState(resolveLang);
  const [country, setCountry] = useState(resolveCountry);

  // When the page mounts, mirror localStorage once — and whenever
  // PublicHeader calls onLanguageChange / onJurisdictionChange we update.
  useEffect(() => {
    setLanguage(resolveLang());
    setCountry(resolveCountry());
  }, []);

  return (
    <div data-testid="attorneys-page">
      <PublicHeader
        onLanguageChange={setLanguage}
        onJurisdictionChange={setCountry}
      />
      <main className="attorneys-page">
        <AttorneysHero language={language} country={country} />
        <PricingComparison language={language} country={country} />
        <MeetAttorneys language={language} country={country} />
        <HowWeSelect language={language} country={country} />
        <JoinArcher language={language} country={country} />
      </main>
      <Footer language={language} country={country} />
    </div>
  );
}
