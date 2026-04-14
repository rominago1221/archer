import React from 'react';
import LegalNewsItem from './LegalNewsItem';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   news     → array of { id, type, date_label, text, impact, source_url? }
//   language
export default function LegalNewsSection({ news = [], language = 'fr' }) {
  const t = useDashboardT(language);
  if (!Array.isArray(news) || news.length === 0) return null;

  return (
    <div
      data-testid="legal-news-section"
      style={{
        background: '#ffffff', border: '0.5px solid #e2e0db',
        borderRadius: 14, padding: '20px 24px', marginBottom: 28,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0f' }}>
            {t('legal_news.title')}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', background: '#dcfce7', borderRadius: 30,
            fontSize: 9, fontWeight: 800, color: '#15803d', letterSpacing: 0.4,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: '#16a34a',
              animation: 'livepulse 1.8s ease-in-out infinite', display: 'inline-block',
            }} />
            {t('legal_news.live_badge')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {news.map((item) => (
          <LegalNewsItem key={item.id} news={item} language={language} />
        ))}
      </div>
    </div>
  );
}
