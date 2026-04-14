import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';
import { getRiskBand, getSubScoreColor } from '../../../utils/dashboard/riskLabel';

// Props:
//   score       number 0-100
//   subscores   { urgency, financial, complexity, legal }
//   tagline     string (from backend key_insight)
//   language    'fr' | 'en'
export default function ScoreCard({ score = 0, subscores = {}, tagline = '', language = 'fr' }) {
  const t = useDashboardT(language);
  const band = getRiskBand(score);
  const riskLabel = t(`hero.risk_${band.level}`);

  const items = [
    { key: 'urgency', value: subscores.urgency || 0 },
    { key: 'financial', value: subscores.financial || 0 },
    { key: 'complexity', value: subscores.complexity || 0 },
    { key: 'legal', value: subscores.legal || 0 },
  ];

  // Out-of color: lighter shade of the main score color
  const outOfColor = band.scoreColor + '80';

  return (
    <div
      data-testid="score-card"
      style={{
        background: '#ffffff',
        border: '0.5px solid #e2e0db',
        borderRadius: 16,
        padding: '22px 26px',
        boxShadow: '0 8px 32px rgba(10,10,15,0.04)',
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: '1.2px', marginBottom: 4 }}>
        {t('hero.score_label')}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
        <div style={{
          fontSize: 76, fontWeight: 900, letterSpacing: -3, lineHeight: 0.85,
          fontVariantNumeric: 'tabular-nums', color: band.scoreColor,
        }}>
          {score}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: outOfColor }}>
          {t('hero.score_out_of')}
        </div>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', background: band.pillBg, color: '#ffffff',
        borderRadius: 30, fontSize: 9, fontWeight: 800, letterSpacing: '0.8px',
        marginBottom: 10,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
          <path d="m10.29 3.86-8.47 14a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
        {riskLabel}
      </div>

      {tagline && (
        <div style={{
          fontSize: 16, fontWeight: 800, color: '#0a0a0f',
          fontStyle: 'italic', letterSpacing: -0.3, lineHeight: 1.2,
          paddingTop: 12, paddingBottom: 12,
          borderTop: '0.5px solid #e2e0db',
        }}>
          {tagline}
        </div>
      )}

      <div style={{ paddingTop: 12, borderTop: tagline ? 'none' : '0.5px solid #e2e0db' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: '1.2px', marginBottom: 10 }}>
          {t('hero.subscores_label')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px' }}>
          {items.map((it) => {
            const c = getSubScoreColor(it.value);
            return (
              <div key={it.key} data-testid={`subscore-${it.key}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0f' }}>
                    {t(`hero.subscores.${it.key}`)}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
                    letterSpacing: -0.3, color: c.text,
                  }}>
                    {it.value}
                  </span>
                </div>
                <div style={{ height: 4, background: '#f4f4f1', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, it.value))}%`,
                    background: c.bar,
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
