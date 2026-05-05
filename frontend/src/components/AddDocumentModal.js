import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MIN_CONTEXT = 20;

const T = {
  en: {
    title: 'Add a document to your case',
    dropZone: 'Drag & drop your file here',
    browse: 'or click to browse',
    formats: 'PDF, Word, JPEG/PNG, scan — max 20 MB',
    contextLabel: `Add context for Archer (required, min ${MIN_CONTEXT} characters)`,
    contextPlaceholder: 'Example: This is the landlord response to my dispute letter. They added new claims about an unauthorized pet.',
    analyze: 'Analyze with Archer',
    cancel: 'Cancel',
    uploading: 'Uploading...',
    selected: 'Selected',
    chars: 'characters',
    minHint: `min ${MIN_CONTEXT}`,
    err_context_short: `Please add at least ${MIN_CONTEXT} characters of context so Archer can analyze your document properly.`,
    err_free_limit: 'Free plan is limited to 1 document. Upgrade to Pro for unlimited analyses.',
    err_too_large: 'File is too large. Maximum size is 20 MB.',
    err_generic: 'Upload failed. Please check your connection and try again.',
  },
  fr: {
    title: 'Ajouter un document à votre dossier',
    dropZone: 'Glissez-déposez votre fichier ici',
    browse: 'ou cliquez pour parcourir',
    formats: 'PDF, Word, JPEG/PNG, scan — max 20 Mo',
    contextLabel: `Ajoutez du contexte pour Archer (obligatoire, min. ${MIN_CONTEXT} caractères)`,
    contextPlaceholder: 'Exemple : Voici la réponse du propriétaire à ma lettre de contestation. Il a ajouté de nouvelles accusations concernant un animal non autorisé.',
    analyze: 'Analyser avec Archer',
    cancel: 'Annuler',
    uploading: 'Envoi en cours...',
    selected: 'Sélectionné',
    chars: 'caractères',
    minHint: `min. ${MIN_CONTEXT}`,
    err_context_short: `Veuillez ajouter au moins ${MIN_CONTEXT} caractères de contexte pour qu'Archer puisse analyser correctement votre document.`,
    err_free_limit: 'Le plan gratuit est limité à 1 document. Passez à Pro pour des analyses illimitées.',
    err_too_large: 'Le fichier est trop volumineux. Taille maximale : 20 Mo.',
    err_generic: 'Échec de l\'envoi. Vérifiez votre connexion et réessayez.',
  },
  nl: {
    title: 'Voeg een document toe aan uw dossier',
    dropZone: 'Sleep uw bestand hierheen',
    browse: 'of klik om te bladeren',
    formats: 'PDF, Word, JPEG/PNG, scan — max 20 MB',
    contextLabel: `Voeg context toe voor Archer (verplicht, min. ${MIN_CONTEXT} tekens)`,
    contextPlaceholder: 'Voorbeeld: Dit is het antwoord van de verhuurder op mijn betwistingsbrief. Hij voegde nieuwe claims toe over een ongeautoriseerd huisdier.',
    analyze: 'Analyseren met Archer',
    cancel: 'Annuleren',
    uploading: 'Uploaden...',
    selected: 'Geselecteerd',
    chars: 'tekens',
    minHint: `min. ${MIN_CONTEXT}`,
    err_context_short: `Voeg minstens ${MIN_CONTEXT} tekens context toe zodat Archer uw document goed kan analyseren.`,
    err_free_limit: 'Gratis abonnement is beperkt tot 1 document. Upgrade naar Pro voor onbeperkte analyses.',
    err_too_large: 'Het bestand is te groot. Maximale grootte: 20 MB.',
    err_generic: 'Uploaden mislukt. Controleer uw verbinding en probeer opnieuw.',
  },
};

const MAX_SIZE = 20 * 1024 * 1024;
const ACCEPTED = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic,.heif,.webp';

const AddDocumentModal = ({ caseId, lang, onClose, onUploadComplete }) => {
  const t = T[lang] || T.en;
  const [file, setFile] = useState(null);
  const [context, setContext] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const ctxLen = context.trim().length;
  const ctxValid = ctxLen >= MIN_CONTEXT;

  const handleFile = useCallback((f) => {
    if (f && f.size <= MAX_SIZE) setFile(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file || uploading || !ctxValid) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('case_id', caseId);
      formData.append('user_context', context.trim());
      await axios.post(`${API}/documents/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploadComplete?.();
    } catch (e) {
      console.error('Upload failed:', e);
      const detail = e?.response?.data?.detail;
      const status = e?.response?.status;
      let msg = t.err_generic;
      if (detail === 'user_context_required_min_20') msg = t.err_context_short;
      else if (status === 403 && typeof detail === 'string' && detail.toLowerCase().includes('free plan')) msg = t.err_free_limit;
      else if (status === 413) msg = t.err_too_large;
      else if (typeof detail === 'string' && detail.length < 200) msg = detail;
      setError(msg);
      setUploading(false);
      return;
    }
    setUploading(false);
  };

  const fmtSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div data-testid="add-document-modal" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{t.title}</div>
          <button onClick={onClose} data-testid="close-add-doc-modal" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
        </div>

        {/* Drop Zone */}
        <div
          data-testid="upload-drop-zone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#1a56db' : file ? '#22c55e' : '#d1d5db'}`,
            borderRadius: 12, padding: file ? '16px 20px' : '32px 20px',
            textAlign: 'center', cursor: 'pointer',
            background: dragOver ? '#eff6ff' : file ? '#f0fdf4' : '#fafafa',
            transition: 'all 0.2s', marginBottom: 14,
          }}
        >
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="#1a56db" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{file.name}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{fmtSize(file.size)}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} color="#9ca3af" /></button>
            </div>
          ) : (
            <>
              <Upload size={28} color={dragOver ? '#1a56db' : '#9ca3af'} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{t.dropZone}</div>
              <div style={{ fontSize: 10, color: '#1a56db', marginTop: 2, fontWeight: 500 }}>{t.browse}</div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 6 }}>{t.formats}</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />

        {/* Context */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{t.contextLabel}</label>
          <textarea
            data-testid="doc-context-input"
            value={context}
            onChange={(e) => setContext(e.target.value.slice(0, 500))}
            placeholder={t.contextPlaceholder}
            style={{
              width: '100%', minHeight: 72, padding: '8px 10px', fontSize: 11, color: '#374151',
              border: `0.5px solid ${ctxLen > 0 && !ctxValid ? '#ef4444' : '#e2e0db'}`, borderRadius: 8, resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.5, background: '#fafafa',
            }}
          />
          <div style={{ fontSize: 9, color: ctxLen > 0 && !ctxValid ? '#ef4444' : '#9ca3af', textAlign: 'right', marginTop: 2 }}>
            {context.length}/500 {t.chars} ({t.minHint})
          </div>
        </div>

        {error && (
          <div data-testid="upload-error" style={{
            background: '#fef2f2', border: '0.5px solid #fecaca', color: '#b91c1c',
            borderRadius: 8, padding: '8px 10px', fontSize: 11, marginBottom: 12, lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            data-testid="analyze-with-archer-btn"
            onClick={handleUpload}
            disabled={!file || uploading || !ctxValid}
            style={{
              flex: 1, padding: '11px 0', background: !file || uploading || !ctxValid ? '#93b4f0' : '#1a56db', color: '#fff',
              border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: !file || uploading || !ctxValid ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {uploading ? <><Loader2 size={14} className="animate-spin" />{t.uploading}</> : t.analyze}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '11px 20px', background: '#fff', color: '#6b7280',
              border: '0.5px solid #e2e0db', borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}
          >{t.cancel}</button>
        </div>
      </div>
    </div>
  );
};

export default AddDocumentModal;
