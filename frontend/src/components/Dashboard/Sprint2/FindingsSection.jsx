import React from 'react';
import FindingCard from './FindingCard';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   type: 'critical' | 'strong'
//   findings: array (already filtered by type)
//   country, language
export default function FindingsSection({ type = 'critical', findings = [], country = 'BE', language = 'fr' }) {
  const t = useDashboardT(language);
  if (!Array.isArray(findings) || findings.length === 0) return null;

  const isCritical = type === 'critical';
  const iconBg = isCritical ? '#fee2e2' : '#dcfce7';
  const iconColor = isCritical ? '#b91c1c' : '#15803d';
  const titleColor = isCritical ? '#b91c1c' : '#15803d';
  const titleKey = isCritical ? 'findings.critical_title' : 'findings.strong_title';

  return (
    <div data-testid={`findings-section-${type}`} style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isCritical ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="3">
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
              <path d="m10.29 3.86-8.47 14a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <h3 style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '1.2px',
          color: titleColor, margin: 0,
        }}>
          {t(titleKey, { count: findings.length })}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {findings.map((f) => (
          <FindingCard key={f.id} finding={f} country={country} language={language} />
        ))}
      </div>
    </div>
  );
}
