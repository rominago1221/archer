import React, { useState } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DocumentViewerModal({ doc, onClose }) {
  const [loadError, setLoadError] = useState(false);
  if (!doc) return null;

  const docUrl = `${API}/documents/${doc.document_id}/download`;
  const isImage = /\.(jpe?g|png|webp|gif|heic)$/i.test(doc.file_name || '');
  const isPdf = /\.pdf$/i.test(doc.file_name || '') || doc.file_type === 'pdf';

  return (
    <div
      data-testid="document-viewer-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,10,15,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: 16,
          maxWidth: 900, width: '100%', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #e2e0db',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 12 }}>
            {doc.file_name}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a
              href={docUrl}
              download
              style={{
                padding: '6px 14px', background: '#1a56db', color: '#fff',
                borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              Download
            </a>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, background: '#f4f4f1', border: 'none',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#6b7280', cursor: 'pointer', fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', background: '#f8f8f8', minHeight: 400 }}>
          {loadError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
                Preview unavailable
              </div>
              <a href={docUrl} download style={{ padding: '10px 20px', background: '#1a56db', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Download file
              </a>
            </div>
          ) : isImage ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: 400 }}>
              <img
                src={docUrl}
                alt={doc.file_name}
                onError={() => setLoadError(true)}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 4 }}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={docUrl}
              title={doc.file_name}
              onError={() => setLoadError(true)}
              style={{ width: '100%', height: '70vh', border: 'none' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
                {doc.file_type?.toUpperCase() || 'Document'}
              </div>
              <a href={docUrl} download style={{ padding: '10px 20px', background: '#1a56db', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
