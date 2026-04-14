import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';
import LegalRef from '../LegalRef';

// Props:
//   finding  → { title, legal_refs, pedagogy_text, is_critical, is_deadline }
//   country, language
export default function FindingCard({ finding, country = 'BE', language = 'fr' }) {
  const t = useDashboardT(language);
  if (!finding) return null;

  const isCritical = finding.is_critical;
  const borderColor = isCritical ? '#b91c1c' : '#15803d';
  const badgeKey = isCritical
    ? (finding.is_deadline ? 'findings.badge_deadline' : 'findings.badge_violation')
    : 'findings.badge_opportunity';
  const badgeBg = isCritical ? '#fee2e2' : '#dcfce7';
  const badgeColor = isCritical ? '#b91c1c' : '#15803d';
  const pedagogyBg = isCritical ? '#fafaf8' : '#f0fdf4';
  const pedagogyLabelKey = isCritical ? 'findings.pedagogy_consequence_label' : 'findings.pedagogy_how_to_use_label';

  return (
    <div
      data-testid={`finding-card-${isCritical ? 'critical' : 'strong'}`}
      style={{
        background: '#ffffff',
        border: '0.5px solid #e2e0db',
        borderRadius: 12,
        padding: '18px 22px',
        borderLeft: `3px solid ${borderColor}`,
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          fontSize: 9, fontWeight: 800,
          padding: '4px 10px', borderRadius: 6,
          background: badgeBg, color: badgeColor,
          letterSpacing: 0.4, flexShrink: 0, marginTop: 2,
        }}>
          {t(badgeKey)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0f', marginBottom: 6, lineHeight: 1.4 }}>
            {finding.title}
          </div>

          {finding.legal_refs && finding.legal_refs.length > 0 && (
            <div style={{
              fontSize: 11, color: '#9ca3af', marginBottom: 12,
              fontFamily: '"SF Mono", Monaco, monospace',
              display: 'flex', flexWrap: 'wrap', gap: 6, rowGap: 4,
            }}>
              {finding.legal_refs.map((ref, i) => (
                <React.Fragment key={i}>
                  <LegalRef reference={ref} country={country} language={language} />
                  {i < finding.legal_refs.length - 1 && <span style={{ color: '#d1d5db' }}>·</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          {finding.pedagogy_text && (
            <div style={{
              background: pedagogyBg, borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: badgeColor,
                letterSpacing: 0.5, marginBottom: 4,
              }}>
                {t(pedagogyLabelKey)}
              </div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                {finding.pedagogy_text}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
