import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Zap, Shield, Upload as UploadIcon, Camera, Smartphone, ChevronRight,
  Home, Building2, UserX, Coins, ShieldCheck, AlertOctagon,
  ShoppingCart, CreditCard, Umbrella, FileText, KeyRound,
  Stethoscope, Accessibility, Users, Gavel, Globe, Car, HelpCircle,
  Search, ChevronDown, Plus, Folder, File, Image as ImageIcon, Mail, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CASE_TYPE_FAMILIES } from '../constants/caseTypes';
import '../styles/analyze-document.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CASE_TYPE_ICONS = {
  eviction: Home,
  real_estate: Building2,
  wrongful_termination: UserX,
  severance: Coins,
  workplace_discrimination: ShieldCheck,
  harassment: AlertOctagon,
  consumer_disputes: ShoppingCart,
  debt: CreditCard,
  insurance_disputes: Umbrella,
  tax_disputes: FileText,
  identity_theft: KeyRound,
  medical_malpractice: Stethoscope,
  disability_claims: Accessibility,
  family: Users,
  criminal: Gavel,
  immigration: Globe,
  traffic: Car,
  other: HelpCircle,
};

const COPY = {
  fr: {
    eyebrow: 'Nouveau document',
    title: 'Analysez votre document',
    sub1: 'Uploadez votre contrat, lettre ou notification —',
    subStrong: 'Archer analyse en moins de 60 secondes',
    sub2: 'et vous dit exactement quoi faire.',
    ctxBrand: 'Archer Belgique',
    ctxLaw: 'Droit belge applicable',
    modeRisk: 'Analyze risk',
    modeRiskHint: "J'ai reçu un document, quels sont mes risques ?",
    modeSign: 'Before I sign',
    modeSignHint: 'Je vais signer, aide-moi à négocier',
    docLabel: 'Document',
    required: '*',
    dropTitle: 'Glissez vos fichiers ici',
    dropSubPre: 'ou ',
    dropSubLink: 'parcourez depuis votre appareil',
    dropSub2: 'Un document accepté à la fois',
    dropMeta: 'PDF · DOCX · JPG · PNG · EML · HEIC — jusqu\'à 20 MB',
    altPhotoTitle: 'Prendre une photo',
    altPhotoSub: 'Via caméra de l\'appareil',
    altQrTitle: 'Scanner via mobile',
    altQrSub: 'Scan QR → photo depuis le phone',
    caseLabel: 'Quel est votre cas ?',
    casePlaceholder: 'Rechercher ou sélectionner une catégorie…',
    caseSearch: 'Rechercher un domaine juridique…',
    caseHint: '17 catégories · Archer analyse selon le droit belge spécialisé',
    caseEmpty: 'Aucun domaine ne correspond',
    objectiveLabel: 'Que voulez-vous obtenir ?',
    objectivePlaceholder: 'Ex. : Faire annuler la mise en demeure et obtenir un plan de paiement sur 6 mois…',
    counterMin: (len, min) => `${len}/${min} caractères min.`,
    counterOk: (len, min) => `${len}/${min} caractères ✓`,
    examplesTitle: '💡 Soyez précis — exemples',
    examplesText: 'Faire résilier mon bail sans payer de frais · Obtenir une indemnité de licenciement · Contester ma contravention · Récupérer mon dépôt de garantie',
    attachLabel: 'Ajouter à un dossier',
    attachNew: 'Créer un nouveau dossier',
    attachHint: 'Ou rattacher à un dossier existant',
    attachHintInContractGuard: "L'analyse « Before I sign » crée toujours un nouveau dossier",
    btnDraft: 'Enregistrer brouillon',
    btnSubmit: "Lancer l'analyse Archer",
    draftSaved: 'Brouillon enregistré',
    errMissingFile: 'Ajoutez un document avant de lancer l\'analyse.',
    errMissingCategory: 'Choisissez une catégorie.',
    errMissingObjective: 'Précisez votre objectif (min. 20 caractères).',
    errUpload: 'Upload échoué. Réessayez.',
    errFileSize: 'Taille max : 20 MB',
    qrNote: 'Le scan via mobile sera bientôt disponible — pour l\'instant, prenez une photo ou uploadez directement.',
    families: {
      housing: 'Logement',
      employment: 'Travail',
      financial: 'Argent',
      health: 'Santé',
      personal: 'Personnel',
      catchall: 'Autre',
    },
    labels: {
      eviction: 'Expulsion / Bail',
      real_estate: 'Immobilier / Copropriété',
      wrongful_termination: 'Licenciement abusif',
      severance: 'Indemnité de départ',
      workplace_discrimination: 'Discrimination',
      harassment: 'Harcèlement',
      consumer_disputes: 'Litige consommation',
      debt: 'Dette / recouvrement',
      insurance_disputes: 'Litige assurance',
      tax_disputes: 'Litige fiscal',
      identity_theft: 'Vol d\'identité',
      medical_malpractice: 'Erreur médicale',
      disability_claims: 'Invalidité',
      family: 'Famille / divorce',
      criminal: 'Pénal',
      immigration: 'Immigration',
      traffic: 'Contravention / roulage',
      other: 'Autre',
    },
    descs: {
      eviction: 'Préavis, garantie, bail résidentiel',
      real_estate: 'Achat-vente, voisinage, vices cachés',
      wrongful_termination: 'Motif grave, C4, préavis',
      severance: 'Calcul indemnité, Claeys',
      workplace_discrimination: 'Critères protégés, adapt.',
      harassment: 'Harcèlement moral/sexuel',
      consumer_disputes: 'Produits défectueux, garantie',
      debt: 'Mise en demeure, saisie',
      insurance_disputes: 'Refus, mauvaise foi',
      tax_disputes: 'Contrôle, réclamation',
      identity_theft: 'Fraude carte/compte',
      medical_malpractice: 'Faute, consentement',
      disability_claims: 'INAMI, allocations',
      family: 'Divorce, garde, pension',
      criminal: 'Procédure pénale, droits',
      immigration: 'Titre de séjour, asile',
      traffic: 'PV, déchéance permis',
      other: 'Autre sujet juridique',
    },
  },
};

const MIN_CHARS = 20;
const MAX_CHARS = 500;
const MAX_BYTES = 20 * 1024 * 1024;
const DRAFT_KEY = 'analyze_doc_draft_v1';
const ACCEPTED_EXT = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'eml', 'heic', 'heif', 'webp'];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIconFor(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(ext)) return ImageIcon;
  if (ext === 'eml') return Mail;
  return File;
}

function extOf(name) {
  return (name.split('.').pop() || '').toLowerCase();
}

export default function AnalyzeDocument() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = COPY.fr;

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const catMenuRef = useRef(null);
  const caseMenuRef = useRef(null);

  const [mode, setMode] = useState('analyze_risk');
  const [file, setFile] = useState(null);
  const [caseType, setCaseType] = useState('');
  const [objective, setObjective] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [cases, setCases] = useState([]);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [draftToast, setDraftToast] = useState(false);

  const [catOpen, setCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [caseOpen, setCaseOpen] = useState(false);

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.mode) setMode(d.mode);
      if (d.caseType) setCaseType(d.caseType);
      if (d.objective) setObjective(d.objective);
      if (d.selectedCaseId) setSelectedCaseId(d.selectedCaseId);
    } catch {
      /* noop */
    }
  }, []);

  // Fetch user cases for attach dropdown
  useEffect(() => {
    let alive = true;
    axios.get(`${API}/cases`, { withCredentials: true })
      .then(res => {
        if (!alive) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.cases || []);
        setCases(list.filter(c => c.status === 'active' || c.status === 'analyzing'));
      })
      .catch(() => { /* silent — dropdown stays empty */ });
    return () => { alive = false; };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function onClick(e) {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target)) setCatOpen(false);
      if (caseMenuRef.current && !caseMenuRef.current.contains(e.target)) setCaseOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const objectiveLen = objective.trim().length;
  const isObjectiveOk = objectiveLen >= MIN_CHARS;
  const canAnalyze = !!file && !!caseType && isObjectiveOk;

  const handleFileSelect = (f) => {
    if (!f) return;
    const ext = extOf(f.name);
    if (!ACCEPTED_EXT.includes(ext)) {
      setError(`${t.errUpload} (format ${ext} non supporté)`);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(t.errFileSize);
      return;
    }
    setFile(f);
    setError(null);
    setFieldErrors(prev => ({ ...prev, file: null }));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  };
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const onBrowseClick = () => fileInputRef.current?.click();
  const onCameraClick = () => cameraInputRef.current?.click();
  const onScanViaMobile = () => {
    setError(null);
    setDraftToast(false);
    alert(t.qrNote);
  };

  const selectedCat = caseType ? {
    type: caseType,
    label: t.labels[caseType] || caseType,
    desc: t.descs[caseType] || '',
    Icon: CASE_TYPE_ICONS[caseType] || HelpCircle,
  } : null;

  const filteredFamilies = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return CASE_TYPE_FAMILIES;
    return CASE_TYPE_FAMILIES
      .map(fam => ({
        ...fam,
        types: fam.types.filter(type => {
          const label = (t.labels[type] || '').toLowerCase();
          const desc = (t.descs[type] || '').toLowerCase();
          const famLabel = (t.families[fam.id] || '').toLowerCase();
          return label.includes(q) || desc.includes(q) || famLabel.includes(q);
        }),
      }))
      .filter(fam => fam.types.length > 0);
  }, [catSearch, t]);

  const handleSaveDraft = () => {
    const payload = { mode, caseType, objective, selectedCaseId };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setDraftToast(true);
      setTimeout(() => setDraftToast(false), 2500);
    } catch {
      setError('Impossible d\'enregistrer le brouillon.');
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setDraftToast(false);
    const fe = {};
    if (!file) fe.file = t.errMissingFile;
    if (!caseType) fe.category = t.errMissingCategory;
    if (!isObjectiveOk) fe.objective = t.errMissingObjective;
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      setError(fe.file || fe.category || fe.objective);
      return;
    }

    setUploading(true);
    try {
      const backendMode = mode === 'before_sign' ? 'contract_guard' : 'standard';
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_context', objective.trim());
      fd.append('case_type', caseType);
      fd.append('analysis_mode', backendMode);
      fd.append('streaming', 'true');
      if (selectedCaseId && backendMode === 'standard') fd.append('case_id', selectedCaseId);

      const resp = await axios.post(`${API}/documents/upload`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const caseId = resp.data?.case_id;
      if (caseId) {
        axios.post(`${API}/analyze/trigger?case_id=${caseId}`, null, { withCredentials: true }).catch(() => {});
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
        navigate(`/analyze/${caseId}`);
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

  const FileIcon = file ? fileIconFor(file.name) : null;

  const counterClass = isObjectiveOk ? 'min ok' : 'min';
  const counterText = isObjectiveOk ? t.counterOk(objectiveLen, MIN_CHARS) : t.counterMin(objectiveLen, MIN_CHARS);

  return (
    <div className="analyze-doc" data-testid="analyze-document">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.jpg,.jpeg,.png,.eml,.heic,.heif,.webp"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        data-testid="file-input"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        data-testid="camera-input"
      />

      {/* HERO */}
      <div className="hero">
        <div className="hero-eyebrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {t.eyebrow}
        </div>
        <h1 className="hero-title">{t.title}</h1>
        <p className="hero-sub">
          {t.sub1} <strong>{t.subStrong}</strong> {t.sub2}
        </p>
        <div className="ctx-bar">
          <span className="ctx-flag">🇧🇪</span>
          <span className="ctx-brand">{t.ctxBrand}</span>
          <span className="ctx-dot" />
          <span>{t.ctxLaw}</span>
          <span className="ctx-tag">RGPD</span>
        </div>
      </div>

      {/* MODE TOGGLE */}
      <div className="mode-toggle" role="tablist" aria-label="Analysis mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'analyze_risk'}
          className={`mode-opt${mode === 'analyze_risk' ? ' active' : ''}`}
          onClick={() => setMode('analyze_risk')}
          data-testid="mode-analyze-risk"
        >
          <div className="mode-opt-icon"><Zap /></div>
          <div className="mode-opt-body">
            <div className="mode-opt-label">{t.modeRisk}</div>
            <div className="mode-opt-hint">{t.modeRiskHint}</div>
          </div>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'before_sign'}
          className={`mode-opt${mode === 'before_sign' ? ' active' : ''}`}
          onClick={() => setMode('before_sign')}
          data-testid="mode-before-sign"
        >
          <div className="mode-opt-icon"><Shield /></div>
          <div className="mode-opt-body">
            <div className="mode-opt-label">{t.modeSign}</div>
            <div className="mode-opt-hint">{t.modeSignHint}</div>
          </div>
        </button>
      </div>

      {/* UPLOAD */}
      <div className={`field${fieldErrors.file ? ' error' : ''}`}>
        <div className="field-label">
          {t.docLabel} <span className="req">{t.required}</span>
        </div>

        <div className="upload-zone">
          <div
            className={`upload-drop${isDragging ? ' dragging' : ''}`}
            onClick={onBrowseClick}
            onKeyDown={(e) => { if (e.key === 'Enter') onBrowseClick(); }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDragEnter={onDragOver}
            role="button"
            tabIndex={0}
            data-testid="upload-drop"
          >
            <div className="upload-drop-icon">
              <UploadIcon />
            </div>
            <div className="upload-drop-title">{t.dropTitle}</div>
            <div className="upload-drop-sub">
              {t.dropSubPre}<a>{t.dropSubLink}</a>
            </div>
            <div className="upload-drop-sub" style={{ marginTop: 2 }}>{t.dropSub2}</div>
            <div className="upload-drop-meta">{t.dropMeta}</div>
          </div>

          <div className="upload-alt">
            <button type="button" className="alt-card" onClick={onCameraClick} data-testid="alt-photo">
              <div className="alt-card-icon"><Camera /></div>
              <div className="alt-card-body">
                <div className="alt-card-title">{t.altPhotoTitle}</div>
                <div className="alt-card-sub">{t.altPhotoSub}</div>
              </div>
              <ChevronRight className="alt-card-arrow" />
            </button>
            <button type="button" className="alt-card" onClick={onScanViaMobile} data-testid="alt-qr">
              <div className="alt-card-icon"><Smartphone /></div>
              <div className="alt-card-body">
                <div className="alt-card-title">{t.altQrTitle}</div>
                <div className="alt-card-sub">{t.altQrSub}</div>
              </div>
              <ChevronRight className="alt-card-arrow" />
            </button>
          </div>
        </div>

        {file && (
          <div className="file-list">
            <div className="file-item" data-testid="file-item">
              <div className="file-item-icon"><FileIcon /></div>
              <div className="file-item-body">
                <div className="file-item-name">{file.name}</div>
                <div className="file-item-meta">{formatSize(file.size)}</div>
              </div>
              <button
                type="button"
                className="file-item-remove"
                onClick={() => setFile(null)}
                aria-label="Remove file"
                data-testid="remove-file"
              >
                <X />
              </button>
            </div>
          </div>
        )}

        {fieldErrors.file && <div className="field-error">{fieldErrors.file}</div>}
      </div>

      {/* CATEGORY */}
      <div className={`field${fieldErrors.category ? ' error' : ''}`}>
        <div className="field-label">
          {t.caseLabel} <span className="req">{t.required}</span>
        </div>
        <div className={`dd${catOpen ? ' open' : ''}`} ref={catMenuRef}>
          <button
            type="button"
            className="dd-trigger"
            onClick={() => setCatOpen(v => !v)}
            data-testid="category-trigger"
          >
            <span className="dd-trigger-inner">
              {selectedCat ? (
                <>
                  <selectedCat.Icon />
                  <span>{selectedCat.label}</span>
                </>
              ) : (
                <span className="placeholder">{t.casePlaceholder}</span>
              )}
            </span>
            <ChevronDown className="dd-chev" />
          </button>
          <div className="dd-panel">
            <div className="dd-search">
              <Search />
              <input
                type="text"
                placeholder={t.caseSearch}
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                data-testid="category-search"
              />
            </div>
            <div className="dd-list">
              {filteredFamilies.length === 0 && (
                <div className="dd-empty">{t.caseEmpty}</div>
              )}
              {filteredFamilies.map(fam => (
                <React.Fragment key={fam.id}>
                  <div className="dd-group-label">{t.families[fam.id]}</div>
                  {fam.types.map(type => {
                    const Icon = CASE_TYPE_ICONS[type] || HelpCircle;
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`dd-option${caseType === type ? ' selected' : ''}`}
                        onClick={() => {
                          setCaseType(type);
                          setCatOpen(false);
                          setCatSearch('');
                          setFieldErrors(prev => ({ ...prev, category: null }));
                        }}
                        data-testid={`category-${type}`}
                      >
                        <div className="dd-option-icon"><Icon /></div>
                        <div className="dd-option-body">
                          <div className="dd-option-title">{t.labels[type]}</div>
                          <div className="dd-option-sub">{t.descs[type]}</div>
                        </div>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="field-hint">{t.caseHint}</div>
        {fieldErrors.category && <div className="field-error">{fieldErrors.category}</div>}
      </div>

      {/* OBJECTIVE */}
      <div className={`field${fieldErrors.objective ? ' error' : ''}`}>
        <div className="field-label">
          {t.objectiveLabel} <span className="req">{t.required}</span>
        </div>
        <div className="textarea-wrap">
          <textarea
            className="textarea"
            placeholder={t.objectivePlaceholder}
            value={objective}
            onChange={(e) => {
              const v = e.target.value.slice(0, MAX_CHARS);
              setObjective(v);
              if (v.trim().length >= MIN_CHARS) {
                setFieldErrors(prev => ({ ...prev, objective: null }));
              }
            }}
            maxLength={MAX_CHARS}
            data-testid="objective"
          />
          <div className="textarea-footer">
            <span className={counterClass}>{counterText}</span>
            <span>{objectiveLen}/{MAX_CHARS}</span>
          </div>
        </div>
        <div className="examples-box">
          <div className="examples-box-title">{t.examplesTitle}</div>
          {t.examplesText}
        </div>
        {fieldErrors.objective && <div className="field-error">{fieldErrors.objective}</div>}
      </div>

      {/* ATTACH TO CASE */}
      <div className="field">
        <div className="field-label">{t.attachLabel}</div>
        <div className={`dd${caseOpen ? ' open' : ''}`} ref={caseMenuRef}>
          <button
            type="button"
            className="dd-trigger"
            onClick={() => mode === 'analyze_risk' && setCaseOpen(v => !v)}
            disabled={mode !== 'analyze_risk'}
            data-testid="attach-trigger"
          >
            <span className="dd-trigger-inner">
              {selectedCaseId ? (
                <>
                  <Folder />
                  <span>{cases.find(c => c.case_id === selectedCaseId)?.title || '—'}</span>
                </>
              ) : (
                <>
                  <Plus />
                  <span>{t.attachNew}</span>
                </>
              )}
            </span>
            <ChevronDown className="dd-chev" />
          </button>
          <div className="dd-panel">
            <div className="dd-list">
              <button
                type="button"
                className={`dd-option${!selectedCaseId ? ' selected' : ''}`}
                onClick={() => { setSelectedCaseId(''); setCaseOpen(false); }}
                data-testid="attach-new"
              >
                <div className="dd-option-icon"><Plus /></div>
                <div className="dd-option-body">
                  <div className="dd-option-title">{t.attachNew}</div>
                </div>
              </button>
              {cases.map(c => (
                <button
                  key={c.case_id}
                  type="button"
                  className={`dd-option${selectedCaseId === c.case_id ? ' selected' : ''}`}
                  onClick={() => { setSelectedCaseId(c.case_id); setCaseOpen(false); }}
                  data-testid={`attach-case-${c.case_id}`}
                >
                  <div className="dd-option-icon"><Folder /></div>
                  <div className="dd-option-body">
                    <div className="dd-option-title">{c.title || c.case_id}</div>
                    {c.type && <div className="dd-option-sub">{t.labels[c.type] || c.type}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="field-hint">
          {mode === 'before_sign' ? t.attachHintInContractGuard : t.attachHint}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="actions-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleSaveDraft}
          disabled={uploading}
          data-testid="save-draft"
        >
          {t.btnDraft}
        </button>
        <button
          type="button"
          className="cta-submit"
          onClick={handleAnalyze}
          disabled={!canAnalyze || uploading}
          data-testid="submit-analyze"
        >
          <Zap />
          {uploading ? '…' : t.btnSubmit}
        </button>
      </div>

      {draftToast && <div className="draft-toast" data-testid="draft-toast">✓ {t.draftSaved}</div>}
      {error && !Object.keys(fieldErrors).length && (
        <div className="field-error" style={{ marginTop: 12 }} data-testid="error">{error}</div>
      )}
    </div>
  );
}
