import React, { useEffect, useState } from 'react';
import { useCinematicT } from '../hooks/useCinematicT';

function FindingCard({ finding, isCritical, delay, t }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!show) return null;

  const borderColor = isCritical ? '#b91c1c' : '#15803d';
  const badgeBg = isCritical ? '#fee2e2' : '#dcfce7';
  const badgeColor = isCritical ? '#b91c1c' : '#15803d';
  const blockBg = isCritical ? '#fafaf8' : '#f0fdf4';
  const badgeText = isCritical
    ? (finding.type === 'deadline' ? t('scene04.deadline_label') : t('scene04.violation_label'))
    : t('scene04.opportunity_label');

  const blockTitle = isCritical
    ? t('scene04.consequence_label')
    : t('scene04.how_to_use_label');
  const blockText = isCritical ? finding.risk_if_ignored : (finding.do_now || finding.impact_description);

  return (
    <div data-testid={`finding-card-${isCritical ? 'critical' : 'strong'}`} style={{
      background: '#fff', border: '0.5px solid #e2e0db', borderLeft: `3px solid ${borderColor}`,
      borderRadius: 12, padding: '18px 22px', marginBottom: 10,
      animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          fontSize: 9, fontWeight: 800, color: badgeColor, background: badgeBg,
          padding: '4px 10px', borderRadius: 6, letterSpacing: '0.4px', flexShrink: 0, marginTop: 2,
        }}>{badgeText}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0f', marginBottom: 6 }}>{finding.text}</div>
          {finding.legal_ref && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, fontFamily: '"SF Mono", Monaco, monospace' }}>
              {finding.legal_ref}
            </div>
          )}
          {blockText && (
            <div style={{ background: blockBg, borderRadius: 8, padding: '10px 14px', marginBottom: finding.do_now && isCritical ? 10 : 0 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: badgeColor, letterSpacing: '0.5px', marginBottom: 4 }}>
                {isCritical ? '\u26A0\uFE0F' : '\u2713'} {blockTitle}
              </div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{blockText}</div>
            </div>
          )}
          {isCritical && finding.do_now && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: '#b91c1c', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 800, marginTop: 8,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              {finding.do_now.length > 40 ? finding.do_now.substring(0, 40) + '...' : finding.do_now}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Scene04_Findings({ data, language }) {
  const t = useCinematicT(language);
  const findingsData = data?.findings_ready?.findings || [];

  const critical = findingsData.filter(f => f.type === 'risk' || f.type === 'deadline');
  const strong = findingsData.filter(f => f.type === 'opportunity' || f.type === 'neutral');

  const [showCritHeader, setShowCritHeader] = useState(false);
  const [showStrongHeader, setShowStrongHeader] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowCritHeader(true), 500);
    const strongDelay = 500 + (critical.length * 2000) + 1500;
    setTimeout(() => setShowStrongHeader(true), strongDelay);
  }, [critical.length]);

  return (
    <div data-testid="scene-04" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 760, width: '100%' }}>
        {/* Critical header */}
        {showCritHeader && (
          <div style={{ marginBottom: 20, animation: 'fadeUp 0.3s ease forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="3"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="m10.29 3.86-8.47 14a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', letterSpacing: '1.2px' }}>
                {t('scene04.critical_points', { count: critical.length })}
              </span>
            </div>
          </div>
        )}

        {/* Critical findings — 2s between each */}
        {critical.map((f, i) => (
          <FindingCard key={`c-${i}`} finding={f} isCritical delay={1000 + i * 2000} t={t} />
        ))}

        {/* Strong header */}
        {showStrongHeader && (
          <div style={{ marginTop: 22, marginBottom: 16, animation: 'fadeUp 0.3s ease forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', letterSpacing: '1.2px' }}>
                {t('scene04.strong_points', { count: strong.length })}
              </span>
            </div>
          </div>
        )}

        {/* Strong findings — 2s between each */}
        {strong.map((f, i) => (
          <FindingCard key={`s-${i}`} finding={f} isCritical={false} delay={500 + (critical.length * 2000) + 2000 + i * 2000} t={t} />
        ))}
      </div>
    </div>
  );
}
