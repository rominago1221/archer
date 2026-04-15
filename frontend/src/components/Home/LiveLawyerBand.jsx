import React from 'react';
import { useHomeT } from '../../hooks/useHomeT';

export default function LiveLawyerBand({ language = 'en', onBookCall }) {
  const t = useHomeT(language);
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      data-testid="live-lawyer-band"
      onClick={onBookCall}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onBookCall?.(); }}
      style={{
        marginTop: 48,
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: `1px solid ${hovered ? '#16a34a' : '#86efac'}`,
        borderRadius: 16,
        padding: '18px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20,
        boxShadow: hovered
          ? '0 8px 20px rgba(22, 163, 74, 0.12)'
          : '0 2px 12px rgba(22, 163, 74, 0.06)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <div style={{
          width: 40, height: 40,
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', flexShrink: 0,
          boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)',
          position: 'relative',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, background: '#4ade80',
            borderRadius: '50%', border: '2px solid #ffffff',
            animation: 'pulseGreen 2s ease-in-out infinite',
          }} />
        </div>
        <div style={{ flex: 1, fontSize: 14, color: '#0a0a0f', fontWeight: 600, lineHeight: 1.4 }}>
          {t('live_lawyer.text_main')}{' '}
          <strong style={{ fontWeight: 800, color: '#15803d' }}>{t('live_lawyer.text_highlight')}</strong>{' '}
          {t('live_lawyer.text_sub')}
        </div>
      </div>
      <span style={{
        color: '#15803d', fontSize: 13, fontWeight: 800,
        display: 'flex', alignItems: 'center',
        gap: hovered ? 10 : 6,
        flexShrink: 0, whiteSpace: 'nowrap',
        transition: 'gap 0.2s',
      }}>
        {t('live_lawyer.cta')}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </span>
    </div>
  );
}
