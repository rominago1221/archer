import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';

export default function GenerateLetterCTA({ onClick, language = 'fr' }) {
  const t = useDashboardT(language);

  return (
    <div
      data-testid="generate-letter-cta-section"
      style={{ margin: '28px 0', textAlign: 'center' }}
    >
      <div style={{
        fontSize: 10, fontWeight: 800, color: '#1a56db',
        letterSpacing: 1.5, marginBottom: 14,
      }}>
        {t('generate_letter.cta_label')}
      </div>
      <button
        type="button"
        onClick={onClick}
        data-testid="generate-letter-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          padding: '22px 40px',
          background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 16,
          fontSize: 18,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 16px 40px rgba(26,86,219,0.3)',
          transition: 'all 0.2s',
          letterSpacing: -0.3,
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 20px 50px rgba(26,86,219,0.4)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '0 16px 40px rgba(26,86,219,0.3)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)';
        }}
      >
        <div style={{
          width: 36, height: 36,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          ✉️
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ lineHeight: 1.1 }}>{t('generate_letter.cta_title')}</div>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 4, letterSpacing: 0 }}>
            {t('generate_letter.cta_subtitle')}
          </div>
        </div>
        <div style={{ fontSize: 20, opacity: 0.7 }}>→</div>
      </button>
    </div>
  );
}
