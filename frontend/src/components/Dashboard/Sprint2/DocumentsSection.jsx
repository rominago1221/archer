import React from 'react';
import DocumentItem from './DocumentItem';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   documents            → array of Document
//   isFreemiumExhausted  → boolean
//   onAddDocument        → handler for the "+ add" button (only when NOT exhausted)
//   onUpgrade            → handler for the "See Protect" paywall CTA
//   language             → 'fr' | 'en'
export default function DocumentsSection({
  documents = [],
  isFreemiumExhausted = false,
  onAddDocument,
  onUpgrade,
  language = 'fr',
}) {
  const t = useDashboardT(language);
  const counterKey = documents.length === 1 ? 'documents.counter_one' : 'documents.counter_many';

  return (
    <div
      data-testid="documents-section"
      style={{
        background: '#ffffff', border: '0.5px solid #e2e0db',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0f' }}>
          {t('documents.section_title')}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          {t(counterKey, { count: documents.length })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {documents.map((doc) => (
          <DocumentItem key={doc.document_id || doc.file_name} doc={doc} language={language} />
        ))}
      </div>

      {isFreemiumExhausted ? (
        <div
          data-testid="documents-paywall"
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #fef3c7 100%)',
            border: '0.5px solid #1a56db', borderRadius: 10,
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{
            width: 36, height: 36, background: '#1a56db',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0a0a0f', marginBottom: 2 }}>
              {t('documents.paywall_title')}
            </div>
            <div style={{ fontSize: 11, color: '#555' }}>
              {t('documents.paywall_subtitle')}
            </div>
          </div>
          <button
            type="button"
            data-testid="documents-paywall-cta"
            onClick={onUpgrade}
            style={{
              padding: '8px 16px', background: '#1a56db', color: '#ffffff',
              border: 'none', borderRadius: 8,
              fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {t('documents.paywall_cta')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="documents-add-btn"
          onClick={onAddDocument}
          style={{
            width: '100%', padding: '12px 16px',
            background: 'transparent', color: '#1a56db',
            border: '0.5px dashed #1a56db', borderRadius: 10,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('documents.add_document_btn')}
        </button>
      )}
    </div>
  );
}
