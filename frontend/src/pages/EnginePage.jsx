/**
 * /engine — "Under the hood" technical deep-dive page.
 *
 * Shell mirrors /attorneys + /blog: PublicHeader + `.engine-page` main +
 * shared Footer. 10 sections alternating bg / soft / dark for visual
 * rhythm (sections 03 Multi-Agent and 06 Benchmarks are intentionally
 * dark — don't collapse the alternation).
 *
 * Jurisdiction flows down to SecurityPrivacy so the hero title + two
 * specific cards (Regional servers, Privacy-law compliant) swap between
 * Belgium/GDPR, the United States/CCPA, and a neutral fallback.
 */
import React, { useState, useEffect } from 'react';
import PageHead from '../components/seo/PageHead';
import { generateMetadata, SITE_URL } from '../lib/seo/metadata';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Home/Footer';
import { useEngineT } from '../hooks/useEngineT';
import { getStoredLocale } from '../data/landingTranslations';

import EngineHero from '../components/engine/EngineHero';
import PipelineCards from '../components/engine/PipelineCards';
import KnowledgeBase from '../components/engine/KnowledgeBase';
import MultiAgent from '../components/engine/MultiAgent';
import ModelOrchestration from '../components/engine/ModelOrchestration';
import LegalRAG from '../components/engine/LegalRAG';
import Benchmarks from '../components/engine/Benchmarks';
import MeasuredPrecision from '../components/engine/MeasuredPrecision';
import TechnicalInnovations from '../components/engine/TechnicalInnovations';
import RadicalTransparency from '../components/engine/RadicalTransparency';
import SecurityPrivacy from '../components/engine/SecurityPrivacy';

import '../styles/home.css';
import '../styles/engine.css';

function resolveLang() {
  const loc = getStoredLocale() || 'us-en';
  return (loc.split('-')[1] || 'en').toLowerCase();
}

function resolveCountry() {
  const loc = getStoredLocale() || 'us-en';
  return (loc.split('-')[0] || 'us').toUpperCase();
}

export default function EnginePage() {
  const [language, setLanguage] = useState(resolveLang);
  const [country, setCountry] = useState(resolveCountry);

  useEffect(() => {
    setLanguage(resolveLang());
    setCountry(resolveCountry());
  }, []);

  const t = useEngineT(language);

  const metadata = generateMetadata({
    title: t('meta.title'),
    description: t('meta.description'),
    canonical: `${SITE_URL}/engine`,
  });

  return (
    <div data-testid="engine-page">
      <PageHead metadata={metadata} />
      <PublicHeader
        onLanguageChange={setLanguage}
        onJurisdictionChange={setCountry}
      />

      <main className="engine-page">
        <EngineHero t={t} />
        <PipelineCards t={t} />
        <KnowledgeBase t={t} />
        <MultiAgent t={t} />
        <ModelOrchestration t={t} />
        <LegalRAG t={t} />
        <Benchmarks t={t} />
        <MeasuredPrecision t={t} />
        <TechnicalInnovations t={t} />
        <RadicalTransparency t={t} />
        <SecurityPrivacy t={t} country={country} />
      </main>

      <Footer language={language} country={country} />
    </div>
  );
}
