import React from 'react';
import { useHomeT } from '../../hooks/useHomeT';

export default function CTAStrip({ language = 'en', onStart }) {
  const t = useHomeT(language);
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      data-testid="home-cta-strip"
      style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: '28px 36px',
        marginTop: 64,
        border: '0.5px solid #e2e0db',
        boxShadow: '0 4px 20px rgba(10,10,15,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48,
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#16a34a', flexShrink: 0,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, color: '#0a0a0f', fontWeight: 600 }}>
            <strong style={{ fontWeight: 800 }}>{t('cta_strip.title_bold')}</strong> {t('cta_strip.subtitle')}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {t('cta_strip.subnote')}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onStart}
        data-testid="home-cta-btn"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '14px 28px',
          background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 12,
          fontSize: 14, fontWeight: 800,
          cursor: 'pointer',
          boxShadow: hovered
            ? '0 12px 28px rgba(26,86,219,0.35)'
            : '0 8px 20px rgba(26,86,219,0.25)',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        }}
      >
        {t('cta_strip.btn')}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}
