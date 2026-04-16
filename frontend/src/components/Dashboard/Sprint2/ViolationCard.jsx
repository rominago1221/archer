import React, { useState } from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';

function ConfidenceBadge({ score }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? '#16a34a' : pct >= 65 ? '#b45309' : '#b91c1c';
  const bg = pct >= 85 ? '#dcfce7' : pct >= 65 ? '#fef3c7' : '#fee2e2';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: bg, color, fontSize: 11, fontWeight: 800,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {pct >= 85 ? '\u2713' : pct >= 65 ? '~' : '\u2717'} {pct}%
    </div>
  );
}

function EvidenceBar({ won, total }) {
  if (!total || total === 0) return null;
  const pct = Math.round((won / total) * 100);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        height: 6, background: '#f3f4f6', borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: 'linear-gradient(90deg, #16a34a, #15803d)',
          width: `${pct}%`, transition: 'width 0.6s ease-out',
        }} />
      </div>
      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
        {won} / {total} cas similaires gagn\u00e9s
      </div>
    </div>
  );
}

// Props:
//   finding: normalised finding object from deriveFindings()
//   country: 'BE' | 'US'
//   language: 'fr' | 'en'
export default function ViolationCard({ finding, country, language = 'fr' }) {
  const t = useDashboardT(language);
  const [expanded, setExpanded] = useState(false);
  if (!finding) return null;

  const hasConfidence = finding.confidence_score != null;
  const borderColor = !hasConfidence ? (finding.is_critical ? '#b91c1c' : '#1a56db')
    : finding.confidence_score >= 0.85 ? '#16a34a'
    : finding.confidence_score >= 0.65 ? '#b45309'
    : '#b91c1c';

  return (
    <div
      data-testid={`violation-card-${finding.id}`}
      style={{
        borderLeft: `4px solid ${borderColor}`,
        padding: '16px 18px',
        background: '#ffffff',
        borderRadius: 10,
        marginBottom: 12,
        border: `0.5px solid #e2e0db`,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
      }}
    >
      {/* Header: title + confidence badge */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 12, marginBottom: 8,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0f', lineHeight: 1.4 }}>
            {finding.title}
          </div>
          {finding.legal_refs.length > 0 && (
            <div style={{ fontSize: 10, color: '#1a56db', marginTop: 4, fontWeight: 600 }}>
              {finding.legal_refs.map(r => r.label).join(' \u00b7 ')}
            </div>
          )}
        </div>
        {hasConfidence && <ConfidenceBadge score={finding.confidence_score} />}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 6 }}>
        {finding.pedagogy_text}
      </div>

      {/* Evidence bar */}
      {finding.similar_cases_total > 0 && (
        <EvidenceBar won={finding.similar_cases_won} total={finding.similar_cases_total} />
      )}

      {/* Jurisprudence count */}
      {finding.jurisprudence_count > 0 && (
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
          {language === 'fr'
            ? `Bas\u00e9 sur ${finding.jurisprudence_count} jurisprudences similaires`
            : `Based on ${finding.jurisprudence_count} similar rulings`}
        </div>
      )}

      {/* Expandable reasoning */}
      {finding.reasoning && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: '#1a56db', padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {expanded
              ? (language === 'fr' ? 'Masquer le d\u00e9tail' : 'Hide detail')
              : (language === 'fr' ? 'Pourquoi ce score ?' : 'Why this score?')}
            <span style={{
              display: 'inline-block', transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              fontSize: 10,
            }}>\u25bc</span>
          </button>
          {expanded && (
            <div style={{
              marginTop: 8, padding: '10px 14px',
              background: '#fafaf8', borderRadius: 8,
              fontSize: 12, color: '#374151', lineHeight: 1.6,
              borderLeft: '2px solid #e2e0db',
            }}>
              {finding.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Action chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {finding.do_now && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            background: '#dcfce7', color: '#15803d',
          }}>
            {finding.do_now}
          </span>
        )}
      </div>
    </div>
  );
}
