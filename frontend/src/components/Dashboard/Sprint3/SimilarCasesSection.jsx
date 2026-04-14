import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   stats     → { reduction_pct, total_cancel_pct, avg_delay_days, total_count }
//   country   → 'BE' | 'US'
//   language  → 'fr' | 'en'
export default function SimilarCasesSection({ stats, country = 'BE', language = 'fr' }) {
  const t = useDashboardT(language);
  if (!stats) return null;

  const countryLabelKey = `jurisdiction.${country}`;
  const countryLabel = t(countryLabelKey);
  const subtitle = t('similar_cases.subtitle_template', {
    count: stats.total_count ?? 0,
    country: countryLabel && countryLabel !== countryLabelKey ? countryLabel : country,
  });

  return (
    <div
      data-testid="similar-cases-section"
      style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '0.5px solid #15803d',
        borderRadius: 14, padding: '22px 26px', marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#15803d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0f' }}>
            {t('similar_cases.title')}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>
            {subtitle}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <StatCard
          value={`${stats.reduction_pct}%`}
          label={t('similar_cases.stat_reduction')}
          color="#15803d"
        />
        <StatCard
          value={`${stats.total_cancel_pct}%`}
          label={t('similar_cases.stat_cancel')}
          color="#1a56db"
        />
        <StatCard
          value={`${stats.avg_delay_days}${t('similar_cases.delay_unit')}`}
          label={t('similar_cases.stat_delay')}
          color="#b45309"
        />
      </div>
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      textAlign: 'center', padding: '14px 12px',
      background: '#ffffff', borderRadius: 10,
    }}>
      <div style={{
        fontSize: 28, fontWeight: 900,
        color, letterSpacing: -1, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums', marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 800, color: '#6b7280', letterSpacing: 0.4,
      }}>
        {label}
      </div>
    </div>
  );
}
