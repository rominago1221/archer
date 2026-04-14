import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   news     → { id, type, date_label, text, impact, source_url? }
//   language
export default function LegalNewsItem({ news, language = 'fr' }) {
  const t = useDashboardT(language);
  if (!news) return null;

  const isNewLaw = news.type === 'new_law';
  const iconBg = isNewLaw ? '#dcfce7' : '#fef3c7';
  const iconFg = isNewLaw ? '#15803d' : '#b45309';
  const tagBg = iconBg;
  const tagFg = iconFg;
  const tagKey = isNewLaw ? 'legal_news.tag_new_law' : 'legal_news.tag_jurisprudence';

  const body = (
    <div
      data-testid={`legal-news-item-${news.id}`}
      style={{
        display: 'flex', gap: 12, padding: '12px 14px',
        background: '#fafaf8', borderRadius: 10,
        cursor: news.source_url ? 'pointer' : 'default',
        textDecoration: 'none',
        color: 'inherit',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f4f4f1'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#fafaf8'; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: iconBg, color: iconFg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isNewLaw ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
            padding: '2px 8px', borderRadius: 4,
            background: tagBg, color: tagFg,
          }}>{t(tagKey)}</span>
          {news.date_label && <span style={{ fontSize: 10, color: '#9ca3af' }}>{news.date_label}</span>}
        </div>
        <div style={{ fontSize: 12, color: '#0a0a0f', lineHeight: 1.4, fontWeight: 600 }}>
          {news.text}
        </div>
        {news.impact && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
            {t('legal_news.impact_prefix')} {news.impact}
          </div>
        )}
      </div>
    </div>
  );

  if (news.source_url) {
    return (
      <a
        href={news.source_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {body}
      </a>
    );
  }
  return body;
}
