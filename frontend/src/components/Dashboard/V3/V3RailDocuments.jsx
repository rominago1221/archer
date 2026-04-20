import React, { useState } from 'react';
import { FileText, Plus, Files } from 'lucide-react';
import DocumentViewerModal from '../../DocumentViewerModal';

function formatDate(iso, language) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const lang = String(language || 'fr').slice(0, 2);
  const fmt = new Intl.DateTimeFormat(
    lang === 'fr' ? 'fr-BE' : lang === 'nl' ? 'nl-BE' : 'en-GB',
    { day: '2-digit', month: 'short' },
  );
  return fmt.format(d);
}

// Compact rail panel that mirrors the mockup's Documents card:
// card-h header with count, one .doc-item per document (PDF icon + name +
// meta + green "ANALYSED" badge), and a dashed "Add a document" CTA.
export default function V3RailDocuments({ documents = [], onAddDocument, language, t }) {
  const [viewing, setViewing] = useState(null);
  const count = documents.length;
  const countLabel = language === 'fr' ? 'docs' : language === 'nl' ? 'docs' : 'docs';
  const addLabel = language === 'fr'
    ? 'Ajouter un document'
    : language === 'nl' ? 'Document toevoegen'
    : 'Add a document';
  const analysedLabel = language === 'fr'
    ? 'ANALYSÉ'
    : language === 'nl' ? 'GEANALYSEERD'
    : 'ANALYSED';

  return (
    <div className="rail-card" data-testid="rail-documents">
      {viewing && <DocumentViewerModal doc={viewing} onClose={() => setViewing(null)} />}

      <div className="rail-head">
        <div className="rail-head-icon"><Files size={13} aria-hidden /></div>
        <div className="rail-head-title">{t('v3.right_rail.documents_title')}</div>
        <span className="rail-head-aux">{count} {countLabel}</span>
      </div>

      <div className="doc-list">
        {documents.map((doc) => (
          <button
            key={doc.document_id || doc.file_name}
            type="button"
            className="doc-item"
            onClick={() => setViewing(doc)}
            data-testid={`rail-doc-${doc.document_id || doc.file_name}`}
          >
            <div className="doc-icon"><FileText size={13} aria-hidden /></div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div className="doc-name">{doc.file_name || doc.title || '—'}</div>
              <div className="doc-meta">
                {(doc.file_type || 'PDF').toUpperCase()}
                {doc.uploaded_at && ` · ${formatDate(doc.uploaded_at, language)}`}
              </div>
            </div>
            {doc.analysis_complete !== false && (
              <span className="doc-badge">{analysedLabel}</span>
            )}
          </button>
        ))}
      </div>

      <button type="button" className="doc-add" onClick={onAddDocument} data-testid="rail-doc-add">
        <Plus size={12} aria-hidden /> {addLabel}
      </button>
    </div>
  );
}
