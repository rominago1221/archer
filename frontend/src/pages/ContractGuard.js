import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Shield, FileText, Paperclip, AlertTriangle, Search, CheckCircle2,
  Scale, MessageSquare, DoorOpen, File as FileIcon, Image as ImageIcon, X,
} from 'lucide-react';
import '../styles/contract-guard.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXT = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

const COUNTER_START = 847293;

const CHECKS = [
  { tone: 'red', Icon: AlertTriangle, title: 'Clauses abusives', desc: 'Pénalités excessives, clauses de non-concurrence disproportionnées, limitations de responsabilité.' },
  { tone: 'amber', Icon: Search, title: 'Obligations cachées', desc: 'Engagements automatiques, renouvellements tacites, frais dissimulés en petits caractères.' },
  { tone: 'green', Icon: CheckCircle2, title: 'Conformité légale', desc: 'Vérification de la conformité avec le droit belge et les protections consommateur.' },
  { tone: 'blue', Icon: Scale, title: 'Équilibre des parties', desc: 'Le contrat est-il juste pour toi ? Rapport de force entre les parties.' },
  { tone: 'purple', Icon: MessageSquare, title: 'Points à négocier', desc: 'Arguments concrets et formulations alternatives pour renégocier les clauses défavorables.' },
  { tone: 'red', Icon: DoorOpen, title: 'Conditions de sortie', desc: 'Résiliation, préavis, indemnités de rupture, clauses de sortie anticipée.' },
];

function extOf(name) {
  return (name.split('.').pop() || '').toLowerCase();
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForFilename(name) {
  const ext = extOf(name);
  if (['pdf'].includes(ext)) return { tone: 'pdf', Icon: FileIcon };
  if (['doc', 'docx'].includes(ext)) return { tone: 'docx', Icon: FileIcon };
  if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(ext)) return { tone: 'img', Icon: ImageIcon };
  return { tone: 'pdf', Icon: FileIcon };
}

function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'il y a 1 semaine';
  if (weeks < 5) return `il y a ${weeks} semaines`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'il y a 1 mois';
  return `il y a ${months} mois`;
}

// Map negotiation_score + red_lines count into a 3-tier badge.
// negotiation_score is 0–100; higher = better for the signer.
function scoreTierFor(review) {
  const redLines = Array.isArray(review?.analysis?.red_lines) ? review.analysis.red_lines.length : 0;
  const negotiation = typeof review?.negotiation_score === 'number' ? review.negotiation_score : null;
  if (redLines >= 4 || (negotiation !== null && negotiation < 40)) return { tier: 'danger', count: redLines };
  if (redLines >= 1 || (negotiation !== null && negotiation < 70)) return { tier: 'warning', count: redLines };
  return { tier: 'safe', count: redLines };
}

export default function ContractGuard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [count, setCount] = useState(COUNTER_START);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Animated counter — increments by 1–3 every 4–7s.
  useEffect(() => {
    let cancelled = false;
    let timeout;
    const tick = () => {
      if (cancelled) return;
      setCount(prev => prev + Math.floor(Math.random() * 3) + 1);
      timeout = setTimeout(tick, 4000 + Math.random() * 3000);
    };
    timeout = setTimeout(tick, 4000 + Math.random() * 3000);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await axios.get(`${API}/contract-guard/reviews`, { withCredentials: true });
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleFileSelect = (f) => {
    if (!f) return;
    const ext = extOf(f.name);
    if (!ACCEPTED_EXT.includes(ext)) {
      setError(`Format .${ext} non supporté.`);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('Taille max : 20 MB.');
      return;
    }
    setFile(f);
    setError(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  };
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onBrowse = () => fileInputRef.current?.click();

  const launchAnalysis = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_context', 'Vérifie ce contrat avant signature : clauses abusives, obligations cachées, points à négocier.');
      fd.append('case_type', 'other');
      fd.append('analysis_mode', 'contract_guard');
      fd.append('streaming', 'true');
      const resp = await axios.post(`${API}/documents/upload`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const caseId = resp.data?.case_id;
      if (caseId) {
        // Contract Guard analysis runs synchronously at upload time and lands
        // in contract_guard_reviews (cg_ prefix). The cinematic route
        // (/analyze/:id) relies on streaming events that never fire for cg_
        // cases, so we skip straight to /cases/:id where the synthesized
        // Case (built from the review) renders in CaseDetailV7.
        axios.post(`${API}/analyze/trigger?case_id=${caseId}`, null, { withCredentials: true }).catch(() => {});
        navigate(`/cases/${caseId}`);
        return;
      }
      setError('Upload échoué. Réessayez.');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Upload échoué. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  const StagedIcon = file ? iconForFilename(file.name).Icon : null;

  return (
    <div className="contract-guard" data-testid="contract-guard">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        data-testid="cg-file-input"
      />

      {/* HERO */}
      <div className="hero">
        <div className="hero-body">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-icon">
              <Shield strokeWidth={2.25} />
            </span>
            Contract Guard
          </div>
          <h1 className="hero-title">
            Ne signe <span className="accent">jamais</span> à l'aveugle.
          </h1>
          <p className="hero-sub">
            Upload ton contrat — Archer l'analyse en <strong>60 secondes</strong>, détecte les clauses abusives, les risques cachés et te dit <strong>exactement quoi négocier</strong> avant de signer.
          </p>
        </div>
        <div className="hero-right">
          <div className="hero-shield" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" strokeWidth="2" />
            </svg>
          </div>
          <div className="hero-counter">
            <div className="hero-counter-num" data-testid="cg-counter">
              {count.toLocaleString('fr-FR')}
            </div>
            <div className="hero-counter-label">contrats analysés</div>
            <div className="hero-counter-live">EN TEMPS RÉEL</div>
          </div>
        </div>
      </div>

      {/* UPLOAD */}
      <div className="upload-section">
        <div
          className={`upload-zone${isDragging ? ' dragging' : ''}`}
          onClick={!file ? onBrowse : undefined}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDragEnter={onDragOver}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' && !file) onBrowse(); }}
          data-testid="cg-upload-zone"
        >
          <div className="upload-zone-icon">
            <FileText />
          </div>
          <div className="upload-zone-title">Dépose ton contrat ici</div>
          <div className="upload-zone-sub">
            Notre IA le scanne en profondeur et t'alerte sur tout ce qui cloche.
          </div>
          {!file ? (
            <button
              type="button"
              className="upload-zone-btn"
              onClick={(e) => { e.stopPropagation(); onBrowse(); }}
              data-testid="cg-browse"
            >
              <Paperclip /> Choisir un fichier
            </button>
          ) : (
            <>
              <div className="file-staged" onClick={(e) => e.stopPropagation()}>
                <div className="file-staged-icon">
                  <StagedIcon />
                </div>
                <div className="file-staged-body">
                  <div className="file-staged-name">{file.name}</div>
                  <div className="file-staged-meta">{formatSize(file.size)}</div>
                </div>
                <button
                  type="button"
                  className="file-staged-remove"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  aria-label="Retirer le fichier"
                  data-testid="cg-remove-file"
                >
                  <X />
                </button>
              </div>
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="upload-zone-btn"
                  onClick={(e) => { e.stopPropagation(); launchAnalysis(); }}
                  disabled={uploading}
                  data-testid="cg-launch"
                >
                  {uploading ? 'Analyse en cours…' : "Lancer l'analyse"}
                </button>
              </div>
            </>
          )}
          <div className="upload-zone-formats">
            <span>PDF</span>
            <span>Word (.docx)</span>
            <span>Image / Scan</span>
            <span>Max 20MB</span>
          </div>
          {error && <div className="upload-error" data-testid="cg-upload-error">{error}</div>}
        </div>
      </div>

      {/* CHECKS */}
      <div className="checks-section">
        <div className="section-eyebrow">Ce qu'on vérifie pour toi</div>
        <div className="checks-grid">
          {CHECKS.map((c, i) => (
            <div key={i} className="check-card">
              <div className={`check-card-icon ${c.tone}`}>
                <c.Icon />
              </div>
              <div className="check-card-title">{c.title}</div>
              <div className="check-card-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT */}
      <div className="recent-section">
        <div className="section-eyebrow">Contrats analysés récemment</div>
        {reviewsLoading ? (
          <div className="recent-list">
            {[1, 2, 3].map(i => <div key={i} className="recent-skeleton" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-recent" data-testid="cg-empty">
            <strong>Aucun contrat analysé pour l'instant.</strong>
            Upload ton premier contrat ci-dessus — Archer s'en occupe.
          </div>
        ) : (
          <div className="recent-list" data-testid="cg-recent-list">
            {reviews.map(r => {
              const info = iconForFilename(r.file_name || '');
              const { tier, count: redCount } = scoreTierFor(r);
              const ext = extOf(r.file_name || '').toUpperCase() || 'DOC';
              const tierLabel = tier === 'safe'
                ? 'OK'
                : `${redCount} risque${redCount > 1 ? 's' : ''}`;
              return (
                <div
                  key={r.review_id}
                  className="recent-card"
                  onClick={() => navigate(`/cases/${r.review_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/cases/${r.review_id}`); }}
                  data-testid={`cg-review-${r.review_id}`}
                >
                  <div className={`recent-icon ${info.tone}`}>
                    <info.Icon />
                  </div>
                  <div className="recent-body">
                    <div className="recent-name">{r.file_name || 'Contrat sans titre'}</div>
                    <div className="recent-meta">
                      <span>{ext}</span>
                      <span className="recent-meta-dot" />
                      <span>Analysé {timeAgo(r.created_at)}</span>
                      {redCount > 0 && (
                        <>
                          <span className="recent-meta-dot" />
                          <span>{redCount} alerte{redCount > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="recent-right">
                    <span className={`recent-score ${tier}`}>{tierLabel}</span>
                    <button
                      type="button"
                      className="recent-cta"
                      onClick={(e) => { e.stopPropagation(); navigate(`/cases/${r.review_id}`); }}
                    >
                      Voir l'analyse
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
