import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDashboardT } from '../../../hooks/useDashboardT';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Props:
//   caseId    → current case ID (for API call)
//   stats     → static fallback stats from deriveSimilarCases() (used while loading / as fallback)
//   country   → 'BE' | 'US'
//   language  → 'fr' | 'en'
export default function SimilarCasesSection({ caseId, stats, country = 'BE', language = 'fr' }) {
  const t = useDashboardT(language);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/cases/${caseId}/similar`, { withCredentials: true })
      .then(res => { if (!cancelled) setLiveData(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId]);

  const isLive = liveData?.source === 'live';
  const data = liveData || {};
  const winRate = data.win_rate_percent || stats?.reduction_pct || 0;
  const totalSimilar = data.total_similar || stats?.total_count || 0;
  const topCases = data.top_3_similar_cases || [];

  if (!stats && !liveData && !loading) return null;

  const countryLabelKey = `jurisdiction.${country}`;
  const countryLabel = t(countryLabelKey);
  const countryDisplay = countryLabel && countryLabel !== countryLabelKey ? countryLabel : country;

  const outcomeColor = (o) => o === 'won' ? '#16a34a' : o === 'lost' ? '#b91c1c' : '#b45309';
  const outcomeBg = (o) => o === 'won' ? '#dcfce7' : o === 'lost' ? '#fee2e2' : '#fef3c7';
  const outcomeLabel = (o) => language === 'fr'
    ? (o === 'won' ? 'Gagn\u00e9' : o === 'lost' ? 'Perdu' : 'Accord')
    : (o === 'won' ? 'Won' : o === 'lost' ? 'Lost' : 'Settled');

  return (
    <div
      data-testid="similar-cases-section"
      style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '0.5px solid #15803d',
        borderRadius: 14, padding: '22px 26px', marginBottom: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#15803d',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
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
            {t('similar_cases.subtitle_template', { count: totalSimilar, country: countryDisplay })}
          </div>
        </div>
      </div>

      {/* Big win rate */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
        background: '#ffffff', borderRadius: 12, padding: '16px 20px',
      }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#16a34a', letterSpacing: -2, lineHeight: 1 }}>
          {Math.round(winRate)}%
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0f' }}>
            {language === 'fr'
              ? `des ${totalSimilar} cas similaires analys\u00e9s par Archer ont gagn\u00e9`
              : `of ${totalSimilar} similar cases analyzed by Archer won`}
          </div>
          {!isLive && (
            <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>
              {language === 'fr'
                ? 'Estimations Archer bas\u00e9es sur donn\u00e9es publiques'
                : 'Archer estimates based on public data'}
            </div>
          )}
        </div>
      </div>

      {/* Stats grid (from fallback or live) */}
      {(data.reduction_pct || stats?.reduction_pct) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <StatCard
            value={`${data.reduction_pct || stats?.reduction_pct || 0}%`}
            label={t('similar_cases.stat_reduction')}
            color="#15803d"
          />
          <StatCard
            value={`${data.total_cancel_pct || stats?.total_cancel_pct || 0}%`}
            label={t('similar_cases.stat_cancel')}
            color="#1a56db"
          />
          <StatCard
            value={`${data.avg_delay_days || stats?.avg_delay_days || 0}${t('similar_cases.delay_unit')}`}
            label={t('similar_cases.stat_delay')}
            color="#b45309"
          />
        </div>
      )}

      {/* Top 3 similar cases (only if live data) */}
      {topCases.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0f', marginBottom: 10 }}>
            {language === 'fr' ? '3 cas les plus proches du v\u00f4tre' : '3 closest cases to yours'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topCases.map(c => (
              <div
                key={c.id}
                data-testid={`similar-case-${c.id}`}
                style={{
                  background: '#ffffff', borderRadius: 10, padding: '12px 16px',
                  border: `0.5px solid ${outcomeBg(c.outcome) === '#dcfce7' ? '#86efac' : outcomeBg(c.outcome) === '#fee2e2' ? '#fca5a5' : '#fde68a'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f' }}>
                    {c.anonymized_title}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                    background: outcomeBg(c.outcome), color: outcomeColor(c.outcome),
                  }}>
                    {outcomeLabel(c.outcome)}
                  </span>
                </div>
                {c.outcome_summary && (
                  <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, marginBottom: 6 }}>
                    {c.outcome_summary}
                  </div>
                )}
                {c.key_violations?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.key_violations.map(v => (
                      <span key={v} style={{
                        fontSize: 9, padding: '2px 8px', borderRadius: 4,
                        background: '#f3f4f6', color: '#6b7280',
                      }}>
                        {v.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
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
