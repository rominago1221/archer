import React from 'react';
import { useHomeT } from '../../hooks/useHomeT';

export default function SectionHeader({ language = 'en' }) {
  const t = useHomeT(language);
  return (
    <div data-testid="home-journey-header" style={{ textAlign: 'center', marginBottom: 80 }}>
      <div style={{
        display: 'inline-block',
        fontSize: 11, fontWeight: 800, color: '#1a56db',
        letterSpacing: '2.5px', marginBottom: 24,
        padding: '6px 14px',
        background: '#eff6ff', borderRadius: 30,
        border: '0.5px solid #bfdbfe',
      }}>
        {t('section_label')}
      </div>
      <h2 style={{
        fontSize: 64, fontWeight: 900, letterSpacing: -2.5, lineHeight: 1.05,
        color: '#0a0a0f', marginBottom: 20, margin: '0 0 20px',
      }}>
        {t('section_title_part1')}<br />
        <span style={{
          background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {t('section_title_part2')}
        </span>
      </h2>
      <p style={{
        fontSize: 19, color: '#6b7280',
        maxWidth: 680, margin: '0 auto',
        lineHeight: 1.5, fontWeight: 500,
      }}>
        {t('section_subtitle')}
      </p>
    </div>
  );
}
