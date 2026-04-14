import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';
import { getDocumentIcon } from '../../../utils/dashboard/documents';

function formatDate(dateStr, language) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Props:
//   doc: document object ({ document_id, file_name, file_type, status, uploaded_at, is_key_document })
//   language: 'fr' | 'en'
export default function DocumentItem({ doc, language = 'fr' }) {
  const t = useDashboardT(language);
  if (!doc) return null;

  const icon = getDocumentIcon(doc.file_type, doc.file_name);
  const status = String(doc.status || 'analyzed').toLowerCase();
  const statusKey = status === 'analyzing' ? 'documents.status_analyzing'
    : status === 'error' ? 'documents.status_error'
    : 'documents.status_analyzed';
  const statusBg = status === 'analyzing' ? '#fef3c7'
    : status === 'error' ? '#fee2e2' : '#dcfce7';
  const statusFg = status === 'analyzing' ? '#b45309'
    : status === 'error' ? '#b91c1c' : '#15803d';

  const metaParts = [];
  const prettyDate = formatDate(doc.uploaded_at, language);
  if (prettyDate) metaParts.push(`${language === 'fr' ? 'Uploadé le' : 'Uploaded'} ${prettyDate}`);
  if (doc.file_type) metaParts.push(String(doc.file_type).toUpperCase());

  return (
    <div
      data-testid={`document-item-${doc.document_id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', background: '#fafaf8', borderRadius: 10,
      }}
    >
      <div style={{
        width: 32, height: 32, background: icon.bg, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: icon.fg, flexShrink: 0, fontSize: 16,
      }}>
        {icon.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: '#0a0a0f',
          marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {doc.file_name}
        </div>
        {metaParts.length > 0 && (
          <div style={{ fontSize: 10, color: '#9ca3af' }}>
            {metaParts.join(' \u00B7 ')}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4,
        background: statusBg, color: statusFg, letterSpacing: 0.4,
        flexShrink: 0,
      }}>
        {t(statusKey)}
      </div>
    </div>
  );
}
