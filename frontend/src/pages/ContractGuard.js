import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Shield, FileText, Paperclip, AlertTriangle, Search, CheckCircle2,
  Scale, MessageSquare, DoorOpen, File as FileIcon, Image as ImageIcon, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/contract-guard.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXT = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

const COUNTER_START = 847293;

const CG_COPY = {
  fr: {
    heroEyebrow: 'Contract Guard',
    heroTitleLead: 'Ne signe', heroTitleAccent: 'jamais', heroTitleTail: 'à l\'aveugle.',
    heroSubPre: 'Upload ton contrat — Archer l\'analyse en ',
    heroSubStrong1: '60 secondes',
    heroSubMid: ', détecte les clauses abusives, les risques cachés et te dit ',
    heroSubStrong2: 'exactement quoi négocier',
    heroSubTail: ' avant de signer.',
    counterLabel: 'contrats analysés',
    counterLive: 'EN TEMPS RÉEL',
    uploadTitle: 'Dépose ton contrat ici',
    uploadSub: 'Notre IA le scanne en profondeur et t\'alerte sur tout ce qui cloche.',
    btnChoose: 'Choisir un fichier',
    btnScanMobile: 'Scanner via mobile',
    btnLaunch: 'Lancer l\'analyse',
    btnAnalyzing: 'Analyse en cours…',
    formats: ['PDF', 'Word (.docx)', 'Image / Scan', 'Max 20MB'],
    checksTitle: 'Ce qu\'on vérifie pour toi',
    recentTitle: 'Contrats analysés récemment',
    emptyTitle: 'Aucun contrat analysé pour l\'instant.',
    emptySub: 'Upload ton premier contrat ci-dessus — Archer s\'en occupe.',
    noTitle: 'Contrat sans titre',
    analyzedPrefix: 'Analysé',
    alertsLabel: (n) => `${n} alerte${n > 1 ? 's' : ''}`,
    risksLabel: (n) => `${n} risque${n > 1 ? 's' : ''}`,
    safeLabel: 'OK',
    viewCta: 'Voir l\'analyse',
    errUnsupported: (ext) => `Format .${ext} non supporté.`,
    errSize: 'Taille max : 20 MB.',
    errUpload: 'Upload échoué. Réessayez.',
    removeAria: 'Retirer le fichier',
    userContext: 'Vérifie ce contrat avant signature : clauses abusives, obligations cachées, points à négocier.',
    qrModalTitle: 'Scanner via mobile',
    qrModalSub: 'Flashe ce QR code avec ton téléphone pour envoyer une photo.',
    qrModalWaiting: 'En attente d\'une photo depuis votre téléphone…',
    qrModalReceived: 'Photo reçue.',
    qrModalClose: 'Fermer',
    qrModalError: 'Impossible de générer le lien mobile.',
    today: "aujourd'hui", yesterday: 'hier',
    daysAgo: (n) => `il y a ${n} jours`,
    weekAgo: 'il y a 1 semaine', weeksAgo: (n) => `il y a ${n} semaines`,
    monthAgo: 'il y a 1 mois', monthsAgo: (n) => `il y a ${n} mois`,
    checks: [
      { tone: 'red', Icon: AlertTriangle, title: 'Clauses abusives', desc: 'Pénalités excessives, clauses de non-concurrence disproportionnées, limitations de responsabilité.' },
      { tone: 'amber', Icon: Search, title: 'Obligations cachées', desc: 'Engagements automatiques, renouvellements tacites, frais dissimulés en petits caractères.' },
      { tone: 'green', Icon: CheckCircle2, title: 'Conformité légale', desc: 'Vérification de la conformité avec le droit belge et les protections consommateur.' },
      { tone: 'blue', Icon: Scale, title: 'Équilibre des parties', desc: 'Le contrat est-il juste pour toi ? Rapport de force entre les parties.' },
      { tone: 'purple', Icon: MessageSquare, title: 'Points à négocier', desc: 'Arguments concrets et formulations alternatives pour renégocier les clauses défavorables.' },
      { tone: 'red', Icon: DoorOpen, title: 'Conditions de sortie', desc: 'Résiliation, préavis, indemnités de rupture, clauses de sortie anticipée.' },
    ],
  },
  nl: {
    heroEyebrow: 'Contract Guard',
    heroTitleLead: 'Teken', heroTitleAccent: 'nooit', heroTitleTail: 'blindelings.',
    heroSubPre: 'Upload je contract — Archer analyseert het in ',
    heroSubStrong1: '60 seconden',
    heroSubMid: ', detecteert oneerlijke clausules, verborgen risico\'s en vertelt je ',
    heroSubStrong2: 'precies wat te onderhandelen',
    heroSubTail: ' voordat je tekent.',
    counterLabel: 'geanalyseerde contracten',
    counterLive: 'IN REAL-TIME',
    uploadTitle: 'Zet je contract hier neer',
    uploadSub: 'Onze AI scant het grondig en waarschuwt je voor alles dat niet klopt.',
    btnChoose: 'Bestand kiezen',
    btnScanMobile: 'Scannen via mobiel',
    btnLaunch: 'Analyse starten',
    btnAnalyzing: 'Analyse loopt…',
    formats: ['PDF', 'Word (.docx)', 'Afbeelding / Scan', 'Max 20MB'],
    checksTitle: 'Wat we voor jou controleren',
    recentTitle: 'Recent geanalyseerde contracten',
    emptyTitle: 'Nog geen contract geanalyseerd.',
    emptySub: 'Upload je eerste contract hierboven — Archer regelt de rest.',
    noTitle: 'Contract zonder titel',
    analyzedPrefix: 'Geanalyseerd',
    alertsLabel: (n) => `${n} waarschuwing${n > 1 ? 'en' : ''}`,
    risksLabel: (n) => `${n} risico${n > 1 ? '\'s' : ''}`,
    safeLabel: 'OK',
    viewCta: 'Analyse bekijken',
    errUnsupported: (ext) => `Formaat .${ext} niet ondersteund.`,
    errSize: 'Max. grootte: 20 MB.',
    errUpload: 'Upload mislukt. Probeer opnieuw.',
    removeAria: 'Bestand verwijderen',
    userContext: 'Controleer dit contract vóór ondertekening: oneerlijke clausules, verborgen verplichtingen, onderhandelpunten.',
    qrModalTitle: 'Scannen via mobiel',
    qrModalSub: 'Scan deze QR code met je telefoon om een foto te sturen.',
    qrModalWaiting: 'Wacht op een foto vanaf je telefoon…',
    qrModalReceived: 'Foto ontvangen.',
    qrModalClose: 'Sluiten',
    qrModalError: 'Kan de mobiele link niet genereren.',
    today: 'vandaag', yesterday: 'gisteren',
    daysAgo: (n) => `${n} dagen geleden`,
    weekAgo: '1 week geleden', weeksAgo: (n) => `${n} weken geleden`,
    monthAgo: '1 maand geleden', monthsAgo: (n) => `${n} maanden geleden`,
    checks: [
      { tone: 'red', Icon: AlertTriangle, title: 'Oneerlijke clausules', desc: 'Buitensporige boetes, onevenredige niet-concurrentie, beperking van aansprakelijkheid.' },
      { tone: 'amber', Icon: Search, title: 'Verborgen verplichtingen', desc: 'Automatische verbintenissen, stilzwijgende verlengingen, verborgen kosten in de kleine lettertjes.' },
      { tone: 'green', Icon: CheckCircle2, title: 'Juridische conformiteit', desc: 'Verificatie van overeenstemming met Belgisch recht en consumentenbescherming.' },
      { tone: 'blue', Icon: Scale, title: 'Evenwicht tussen partijen', desc: 'Is het contract eerlijk voor jou? Machtsverhouding tussen de partijen.' },
      { tone: 'purple', Icon: MessageSquare, title: 'Onderhandelpunten', desc: 'Concrete argumenten en alternatieve formuleringen om ongunstige clausules te heronderhandelen.' },
      { tone: 'red', Icon: DoorOpen, title: 'Uitstapvoorwaarden', desc: 'Opzegging, opzegtermijn, verbrekingsvergoedingen, vervroegde uitstapclausules.' },
    ],
  },
  en: {
    heroEyebrow: 'Contract Guard',
    heroTitleLead: 'Never sign', heroTitleAccent: 'blind.', heroTitleTail: '',
    heroSubPre: 'Upload your contract — Archer analyzes it in ',
    heroSubStrong1: '60 seconds',
    heroSubMid: ', catches unfair clauses, hidden risks, and tells you ',
    heroSubStrong2: 'exactly what to negotiate',
    heroSubTail: ' before you sign.',
    counterLabel: 'contracts analyzed',
    counterLive: 'LIVE',
    uploadTitle: 'Drop your contract here',
    uploadSub: 'Our AI scans it in depth and flags everything that\'s off.',
    btnChoose: 'Choose a file',
    btnScanMobile: 'Scan via phone',
    btnLaunch: 'Launch analysis',
    btnAnalyzing: 'Analyzing…',
    formats: ['PDF', 'Word (.docx)', 'Image / Scan', 'Max 20MB'],
    checksTitle: 'What we check for you',
    recentTitle: 'Recently analyzed contracts',
    emptyTitle: 'No contract analyzed yet.',
    emptySub: 'Upload your first contract above — Archer takes it from there.',
    noTitle: 'Untitled contract',
    analyzedPrefix: 'Analyzed',
    alertsLabel: (n) => `${n} alert${n > 1 ? 's' : ''}`,
    risksLabel: (n) => `${n} risk${n > 1 ? 's' : ''}`,
    safeLabel: 'OK',
    viewCta: 'View analysis',
    errUnsupported: (ext) => `Unsupported format .${ext}.`,
    errSize: 'Max size: 20 MB.',
    errUpload: 'Upload failed. Retry.',
    removeAria: 'Remove file',
    userContext: 'Review this contract before I sign: unfair clauses, hidden obligations, points to negotiate.',
    qrModalTitle: 'Scan via phone',
    qrModalSub: 'Scan this QR code with your phone to send a photo.',
    qrModalWaiting: 'Waiting for a photo from your phone…',
    qrModalReceived: 'Photo received.',
    qrModalClose: 'Close',
    qrModalError: 'Could not generate the mobile link.',
    today: 'today', yesterday: 'yesterday',
    daysAgo: (n) => `${n} days ago`,
    weekAgo: '1 week ago', weeksAgo: (n) => `${n} weeks ago`,
    monthAgo: '1 month ago', monthsAgo: (n) => `${n} months ago`,
    checks: [
      { tone: 'red', Icon: AlertTriangle, title: 'Unfair clauses', desc: 'Excessive penalties, disproportionate non-compete, liability limitations.' },
      { tone: 'amber', Icon: Search, title: 'Hidden obligations', desc: 'Automatic commitments, silent renewals, fees buried in the fine print.' },
      { tone: 'green', Icon: CheckCircle2, title: 'Legal compliance', desc: 'Compliance check against Belgian law and consumer protections.' },
      { tone: 'blue', Icon: Scale, title: 'Balance of parties', desc: 'Is the contract fair to you? Balance of power between the parties.' },
      { tone: 'purple', Icon: MessageSquare, title: 'Negotiation points', desc: 'Concrete arguments and alternative wording to renegotiate unfavorable clauses.' },
      { tone: 'red', Icon: DoorOpen, title: 'Exit conditions', desc: 'Termination, notice, break fees, early exit clauses.' },
    ],
  },
};

function pickCgLang(userLanguage) {
  const raw = String(userLanguage || 'fr').toLowerCase().split('-')[0];
  if (raw === 'fr' || raw === 'nl' || raw === 'en') return raw;
  return 'fr';
}

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

function timeAgo(iso, t) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return t.today;
  if (days === 1) return t.yesterday;
  if (days < 7) return t.daysAgo(days);
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return t.weekAgo;
  if (weeks < 5) return t.weeksAgo(weeks);
  const months = Math.floor(days / 30);
  if (months === 1) return t.monthAgo;
  return t.monthsAgo(months);
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
  const { user } = useAuth();
  const lang = pickCgLang(user?.language);
  const t = CG_COPY[lang] || CG_COPY.fr;
  const fileInputRef = useRef(null);

  const [count, setCount] = useState(COUNTER_START);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

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
      setError(t.errUnsupported(ext));
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(t.errSize);
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
  const onScanViaMobile = () => { setError(null); setQrModalOpen(true); };

  const launchAnalysis = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_context', t.userContext);
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
      setError(t.errUpload);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t.errUpload);
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
            {t.heroEyebrow}
          </div>
          <h1 className="hero-title">
            {t.heroTitleLead} <span className="accent">{t.heroTitleAccent}</span>
            {t.heroTitleTail ? ' ' + t.heroTitleTail : ''}
          </h1>
          <p className="hero-sub">
            {t.heroSubPre}<strong>{t.heroSubStrong1}</strong>{t.heroSubMid}<strong>{t.heroSubStrong2}</strong>{t.heroSubTail}
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
              {count.toLocaleString(lang === 'en' ? 'en-US' : lang === 'nl' ? 'nl-BE' : 'fr-FR')}
            </div>
            <div className="hero-counter-label">{t.counterLabel}</div>
            <div className="hero-counter-live">{t.counterLive}</div>
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
          <div className="upload-zone-title">{t.uploadTitle}</div>
          <div className="upload-zone-sub">
            {t.uploadSub}
          </div>
          {!file ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="upload-zone-btn"
                onClick={(e) => { e.stopPropagation(); onBrowse(); }}
                data-testid="cg-browse"
              >
                <Paperclip /> {t.btnChoose}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onScanViaMobile(); }}
                data-testid="cg-scan-mobile"
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--purple)', fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', textDecoration: 'underline',
                  fontFamily: 'inherit',
                }}
              >
                {t.btnScanMobile}
              </button>
            </div>
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
                  aria-label={t.removeAria}
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
                  {uploading ? t.btnAnalyzing : t.btnLaunch}
                </button>
              </div>
            </>
          )}
          <div className="upload-zone-formats">
            {t.formats.map((fmt, i) => <span key={i}>{fmt}</span>)}
          </div>
          {error && <div className="upload-error" data-testid="cg-upload-error">{error}</div>}
        </div>
      </div>

      {/* CHECKS */}
      <div className="checks-section">
        <div className="section-eyebrow">{t.checksTitle}</div>
        <div className="checks-grid">
          {t.checks.map((c, i) => (
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
        <div className="section-eyebrow">{t.recentTitle}</div>
        {reviewsLoading ? (
          <div className="recent-list">
            {[1, 2, 3].map(i => <div key={i} className="recent-skeleton" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-recent" data-testid="cg-empty">
            <strong>{t.emptyTitle}</strong>
            {t.emptySub}
          </div>
        ) : (
          <div className="recent-list" data-testid="cg-recent-list">
            {reviews.map(r => {
              const info = iconForFilename(r.file_name || '');
              const { tier, count: redCount } = scoreTierFor(r);
              const ext = extOf(r.file_name || '').toUpperCase() || 'DOC';
              const tierLabel = tier === 'safe' ? t.safeLabel : t.risksLabel(redCount);
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
                    <div className="recent-name">{r.file_name || t.noTitle}</div>
                    <div className="recent-meta">
                      <span>{ext}</span>
                      <span className="recent-meta-dot" />
                      <span>{t.analyzedPrefix} {timeAgo(r.created_at, t)}</span>
                      {redCount > 0 && (
                        <>
                          <span className="recent-meta-dot" />
                          <span>{t.alertsLabel(redCount)}</span>
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
                      {t.viewCta}
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
