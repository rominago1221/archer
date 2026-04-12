import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ArrowLeft, Download, Trash2, FileText, Calendar, HardDrive, MessageSquare, Loader2, ExternalLink } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DocumentViewer = () => {
  const { documentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/documents/${documentId}`, { withCredentials: true });
        setDoc(res.data);
        if (res.data.storage_path) {
          setPreviewUrl(`${API}/documents/${documentId}/download`);
        }
      } catch (e) { console.error('Failed to load document:', e); }
      setLoading(false);
    })();
  }, [documentId]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/documents/${documentId}`, { withCredentials: true });
      navigate(-1);
    } catch (e) { alert('Failed to delete'); }
    setDeleting(false);
  };

  const handleDownload = () => {
    window.open(`${API}/documents/${documentId}/download`, '_blank');
  };

  const fmtSize = (b) => !b ? '—' : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const isPdf = doc?.file_name?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|webp|heic)$/i.test(doc?.file_name || '');

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><Loader2 size={24} className="animate-spin" style={{ color: '#1a56db' }} /></div>;
  if (!doc) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>Document not found</div>;

  return (
    <div data-testid="document-viewer-page" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <button onClick={() => navigate(-1)} data-testid="back-to-case" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, fontWeight: 500 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left: Preview */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #e2e0db', borderRadius: 12, overflow: 'hidden', minHeight: 400 }}>
            {isPdf && previewUrl ? (
              <iframe src={previewUrl} title="Document preview" style={{ width: '100%', height: 600, border: 'none' }} data-testid="pdf-preview" />
            ) : isImage && previewUrl ? (
              <img src={previewUrl} alt={doc.file_name} style={{ width: '100%', maxHeight: 600, objectFit: 'contain', display: 'block' }} data-testid="image-preview" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#9ca3af' }}>
                <FileText size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 14, fontWeight: 500 }}>Preview not available</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Download to view this file</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div>
          {/* File info card */}
          <div style={{ background: '#fff', border: '1px solid #e2e0db', borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} color="#1a56db" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', wordBreak: 'break-word' }} data-testid="doc-filename">{doc.file_name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{doc.content_type || 'application/octet-stream'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#374151' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={13} color="#9ca3af" />
                <span>Uploaded: {fmtDate(doc.uploaded_at)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HardDrive size={13} color="#9ca3af" />
                <span>Size: {fmtSize(doc.file_size)}</span>
              </div>
              {doc.case_id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ExternalLink size={13} color="#9ca3af" />
                  <button onClick={() => navigate(`/cases/${doc.case_id}`)} style={{ fontSize: 13, color: '#1a56db', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View case →</button>
                </div>
              )}
            </div>
          </div>

          {/* User comments */}
          {doc.user_context && (
            <div style={{ background: '#fff', border: '1px solid #e2e0db', borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MessageSquare size={13} color="#1a56db" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>Your notes</span>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }} data-testid="doc-user-context">{doc.user_context}</div>
            </div>
          )}

          {/* James analysis summary */}
          {doc.extracted_text && (
            <div style={{ background: '#fff', border: '1px solid #e2e0db', borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>J</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>James analysis</span>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, maxHeight: 200, overflowY: 'auto' }} data-testid="doc-analysis">
                {doc.extracted_text.substring(0, 500)}{doc.extracted_text.length > 500 ? '...' : ''}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleDownload} data-testid="download-doc-btn" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 0', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}><Download size={15} /> Download</button>
            <button onClick={handleDelete} disabled={deleting} data-testid="delete-doc-btn" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 16px', background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 10,
              fontSize: 13, fontWeight: 500, cursor: deleting ? 'default' : 'pointer',
            }}><Trash2 size={15} /> {deleting ? '...' : 'Delete'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
