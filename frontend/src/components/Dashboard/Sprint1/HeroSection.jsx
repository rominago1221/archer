import React from 'react';
import ScoreCard from './ScoreCard';
import InfoCard from './InfoCard';
import { deriveAnalysisDepth } from '../../../utils/dashboard/analysisDepth';
import { deriveAmounts } from '../../../utils/dashboard/financial';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  const diff = t - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Hero row: Score (1.4fr) + Info (1fr). Props: caseDoc (full /api/cases/:id payload),
// country, language.
export default function HeroSection({ caseDoc = {}, country = 'BE', language = 'fr' }) {
  const score = caseDoc.risk_score || 0;
  const subscores = {
    urgency: caseDoc.risk_urgency || 0,
    financial: caseDoc.risk_financial || 0,
    complexity: caseDoc.risk_complexity || 0,
    legal: caseDoc.risk_legal_strength || 0,
  };
  const tagline = caseDoc.key_insight || '';

  const deadline = {
    date: caseDoc.deadline || null,
    days_remaining: daysUntil(caseDoc.deadline),
    description: caseDoc.deadline_description || '',
  };

  const amounts = deriveAmounts(caseDoc);
  const analysisDepth = deriveAnalysisDepth(caseDoc);

  return (
    <div
      data-testid="hero-section"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: 16,
        marginBottom: 20,
      }}
    >
      <ScoreCard
        score={score}
        subscores={subscores}
        tagline={tagline}
        language={language}
      />
      <InfoCard
        deadline={deadline}
        amounts={amounts}
        analysisDepth={analysisDepth}
        country={country}
        language={language}
      />
    </div>
  );
}
