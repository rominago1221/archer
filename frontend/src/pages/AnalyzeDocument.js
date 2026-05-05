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
import QrScanModal from '../components/QrScanModal';
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
    dropMeta: 'PDF · DOC · DOCX · TXT · JPG · PNG · EML · HEIC — jusqu\'à 20 MB',
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
    errFileSize: 'Fichier trop volumineux (max. 20 MB).',
    errFormatUnsupported: (ext) => `Format .${ext} non supporté. Utilisez PDF, DOC(X), TXT, image (JPG/PNG/HEIC) ou EML.`,
    qrModalTitle: 'Scanner via mobile',
    qrModalSub: 'Flashe ce QR code avec ton téléphone pour ajouter une photo depuis l\'appareil.',
    qrModalWaiting: 'En attente d\'une photo depuis votre téléphone…',
    qrModalReceived: 'Photo reçue — elle est ajoutée au formulaire.',
    qrModalClose: 'Fermer',
    qrModalError: 'Impossible de générer le lien mobile. Réessayez.',
    families: {
      housing: 'Logement', employment: 'Travail', financial: 'Argent',
      health: 'Santé', personal: 'Personnel', catchall: 'Autre',
    },
    labels: {
      eviction: 'Expulsion / Bail', real_estate: 'Immobilier / Copropriété',
      wrongful_termination: 'Licenciement abusif', severance: 'Indemnité de départ',
      workplace_discrimination: 'Discrimination', harassment: 'Harcèlement',
      consumer_disputes: 'Litige consommation', debt: 'Dette / recouvrement',
      insurance_disputes: 'Litige assurance', tax_disputes: 'Litige fiscal',
      identity_theft: 'Vol d\'identité', medical_malpractice: 'Erreur médicale',
      disability_claims: 'Invalidité', family: 'Famille / divorce',
      criminal: 'Pénal', immigration: 'Immigration',
      traffic: 'Contravention / roulage', other: 'Autre',
    },
    descs: {
      eviction: 'Préavis, garantie, bail résidentiel', real_estate: 'Achat-vente, voisinage, vices cachés',
      wrongful_termination: 'Motif grave, C4, préavis', severance: 'Calcul indemnité, Claeys',
      workplace_discrimination: 'Critères protégés, adapt.', harassment: 'Harcèlement moral/sexuel',
      consumer_disputes: 'Produits défectueux, garantie', debt: 'Mise en demeure, saisie',
      insurance_disputes: 'Refus, mauvaise foi', tax_disputes: 'Contrôle, réclamation',
      identity_theft: 'Fraude carte/compte', medical_malpractice: 'Faute, consentement',
      disability_claims: 'INAMI, allocations', family: 'Divorce, garde, pension',
      criminal: 'Procédure pénale, droits', immigration: 'Titre de séjour, asile',
      traffic: 'PV, déchéance permis', other: 'Autre sujet juridique',
    },
  },
  nl: {
    eyebrow: 'Nieuw document',
    title: 'Analyseer uw document',
    sub1: 'Upload uw contract, brief of kennisgeving —',
    subStrong: 'Archer analyseert in minder dan 60 seconden',
    sub2: 'en vertelt u precies wat te doen.',
    ctxBrand: 'Archer België',
    ctxLaw: 'Belgisch recht van toepassing',
    modeRisk: 'Analyze risk',
    modeRiskHint: 'Ik heb een document ontvangen, wat zijn mijn risico\'s?',
    modeSign: 'Before I sign',
    modeSignHint: 'Ik ga tekenen, help me onderhandelen',
    docLabel: 'Document',
    required: '*',
    dropTitle: 'Sleep uw bestanden hier',
    dropSubPre: 'of ',
    dropSubLink: 'blader vanaf uw apparaat',
    dropSub2: 'Eén document tegelijk',
    dropMeta: 'PDF · DOC · DOCX · TXT · JPG · PNG · EML · HEIC — tot 20 MB',
    altPhotoTitle: 'Foto maken',
    altPhotoSub: 'Via de camera van het apparaat',
    altQrTitle: 'Scannen via mobiel',
    altQrSub: 'QR scannen → foto vanaf de telefoon',
    caseLabel: 'Wat is uw zaak?',
    casePlaceholder: 'Zoek of kies een categorie…',
    caseSearch: 'Zoek een juridisch domein…',
    caseHint: '17 categorieën · Archer analyseert volgens gespecialiseerd Belgisch recht',
    caseEmpty: 'Geen enkel domein komt overeen',
    objectiveLabel: 'Wat wilt u bereiken?',
    objectivePlaceholder: 'Bv.: De ingebrekestelling laten annuleren en een afbetalingsplan over 6 maanden bekomen…',
    counterMin: (len, min) => `${len}/${min} tekens min.`,
    counterOk: (len, min) => `${len}/${min} tekens ✓`,
    examplesTitle: '💡 Wees precies — voorbeelden',
    examplesText: 'Mijn huurovereenkomst kosteloos beëindigen · Een ontslagvergoeding bekomen · Mijn boete betwisten · Mijn huurwaarborg terugkrijgen',
    attachLabel: 'Aan een dossier toevoegen',
    attachNew: 'Een nieuw dossier aanmaken',
    attachHint: 'Of koppelen aan een bestaand dossier',
    attachHintInContractGuard: 'De « Before I sign » analyse maakt altijd een nieuw dossier aan',
    btnDraft: 'Concept opslaan',
    btnSubmit: 'Archer analyse starten',
    draftSaved: 'Concept opgeslagen',
    errMissingFile: 'Voeg een document toe voordat u de analyse start.',
    errMissingCategory: 'Kies een categorie.',
    errMissingObjective: 'Specificeer uw doel (min. 20 tekens).',
    errUpload: 'Upload mislukt. Probeer opnieuw.',
    errFileSize: 'Bestand te groot (max. 20 MB).',
    errFormatUnsupported: (ext) => `Formaat .${ext} niet ondersteund. Gebruik PDF, DOC(X), TXT, afbeelding (JPG/PNG/HEIC) of EML.`,
    qrModalTitle: 'Scannen via mobiel',
    qrModalSub: 'Scan deze QR code met uw telefoon om een foto vanaf het toestel toe te voegen.',
    qrModalWaiting: 'Wacht op een foto vanaf uw telefoon…',
    qrModalReceived: 'Foto ontvangen — toegevoegd aan het formulier.',
    qrModalClose: 'Sluiten',
    qrModalError: 'Kan de mobiele link niet genereren. Probeer opnieuw.',
    families: {
      housing: 'Wonen', employment: 'Werk', financial: 'Financieel',
      health: 'Gezondheid', personal: 'Persoonlijk', catchall: 'Andere',
    },
    labels: {
      eviction: 'Uitzetting / Huur', real_estate: 'Vastgoed / Mede-eigendom',
      wrongful_termination: 'Onrechtmatig ontslag', severance: 'Opzegvergoeding',
      workplace_discrimination: 'Discriminatie', harassment: 'Pesten',
      consumer_disputes: 'Consumentengeschil', debt: 'Schuld / inning',
      insurance_disputes: 'Verzekeringsgeschil', tax_disputes: 'Fiscaal geschil',
      identity_theft: 'Identiteitsdiefstal', medical_malpractice: 'Medische fout',
      disability_claims: 'Invaliditeit', family: 'Familie / scheiding',
      criminal: 'Strafrecht', immigration: 'Immigratie',
      traffic: 'Verkeersovertreding', other: 'Andere',
    },
    descs: {
      eviction: 'Opzeg, waarborg, huurcontract', real_estate: 'Verkoop, buren, verborgen gebreken',
      wrongful_termination: 'Dringende reden, C4, opzeg', severance: 'Berekening, Claeys-formule',
      workplace_discrimination: 'Beschermde criteria', harassment: 'Moreel/seksueel',
      consumer_disputes: 'Defecte producten, garantie', debt: 'Ingebrekestelling, beslag',
      insurance_disputes: 'Weigering, kwade trouw', tax_disputes: 'Controle, bezwaar',
      identity_theft: 'Fraude kaart/rekening', medical_malpractice: 'Fout, toestemming',
      disability_claims: 'RIZIV, uitkeringen', family: 'Scheiding, voogdij, alimentatie',
      criminal: 'Strafprocedure, rechten', immigration: 'Verblijfsvergunning, asiel',
      traffic: 'PV, rijbewijs', other: 'Ander juridisch onderwerp',
    },
  },
  en: {
    eyebrow: 'New document',
    title: 'Analyze your document',
    sub1: 'Upload your contract, letter or notice —',
    subStrong: 'Archer analyzes in under 60 seconds',
    sub2: 'and tells you exactly what to do.',
    ctxBrand: 'Archer Belgium',
    ctxLaw: 'Belgian law applies',
    modeRisk: 'Analyze risk',
    modeRiskHint: 'I received a document — what are my risks?',
    modeSign: 'Before I sign',
    modeSignHint: 'I\'m about to sign — help me negotiate',
    docLabel: 'Document',
    required: '*',
    dropTitle: 'Drop your files here',
    dropSubPre: 'or ',
    dropSubLink: 'browse from your device',
    dropSub2: 'One document at a time',
    dropMeta: 'PDF · DOC · DOCX · TXT · JPG · PNG · EML · HEIC — up to 20 MB',
    altPhotoTitle: 'Take a photo',
    altPhotoSub: 'Using the device camera',
    altQrTitle: 'Scan via phone',
    altQrSub: 'Scan QR → photo from your phone',
    caseLabel: 'What is your case about?',
    casePlaceholder: 'Search or select a category…',
    caseSearch: 'Search a legal area…',
    caseHint: '17 categories · Archer analyzes under specialised Belgian law',
    caseEmpty: 'No area matches',
    objectiveLabel: 'What do you want to achieve?',
    objectivePlaceholder: 'e.g., Cancel the demand letter and get a 6-month payment plan…',
    counterMin: (len, min) => `${len}/${min} chars min.`,
    counterOk: (len, min) => `${len}/${min} chars ✓`,
    examplesTitle: '💡 Be specific — examples',
    examplesText: 'End my lease without fees · Get severance pay · Contest my ticket · Recover my deposit',
    attachLabel: 'Attach to a case',
    attachNew: 'Create a new case',
    attachHint: 'Or link to an existing case',
    attachHintInContractGuard: 'The "Before I sign" analysis always creates a new case',
    btnDraft: 'Save draft',
    btnSubmit: 'Launch Archer analysis',
    draftSaved: 'Draft saved',
    errMissingFile: 'Add a document before launching the analysis.',
    errMissingCategory: 'Pick a category.',
    errMissingObjective: 'Tell us what you want to achieve (min. 20 chars).',
    errUpload: 'Upload failed. Retry.',
    errFileSize: 'File too large (max. 20 MB).',
    errFormatUnsupported: (ext) => `Format .${ext} not supported. Use PDF, DOC(X), TXT, image (JPG/PNG/HEIC) or EML.`,
    qrModalTitle: 'Scan via phone',
    qrModalSub: 'Scan this QR code with your phone to add a photo from your device.',
    qrModalWaiting: 'Waiting for a photo from your phone…',
    qrModalReceived: 'Photo received — added to the form.',
    qrModalClose: 'Close',
    qrModalError: 'Could not generate the mobile link. Retry.',
    families: {
      housing: 'Housing', employment: 'Employment', financial: 'Financial',
      health: 'Health', personal: 'Personal', catchall: 'Other',
    },
    labels: {
      eviction: 'Eviction / Lease', real_estate: 'Real estate / HOA',
      wrongful_termination: 'Wrongful termination', severance: 'Severance',
      workplace_discrimination: 'Discrimination', harassment: 'Harassment',
      consumer_disputes: 'Consumer dispute', debt: 'Debt / collection',
      insurance_disputes: 'Insurance dispute', tax_disputes: 'Tax dispute',
      identity_theft: 'Identity theft', medical_malpractice: 'Medical malpractice',
      disability_claims: 'Disability claims', family: 'Family / divorce',
      criminal: 'Criminal', immigration: 'Immigration',
      traffic: 'Traffic / moving violation', other: 'Other',
    },
    descs: {
      eviction: 'Notice, deposit, lease', real_estate: 'Sale, neighbour, defects',
      wrongful_termination: 'At-will, retaliation', severance: 'Package, non-compete',
      workplace_discrimination: 'Title VII, ADA, ADEA', harassment: 'Hostile env., sexual',
      consumer_disputes: 'Defective products, warranty', debt: 'Collection, demand letter',
      insurance_disputes: 'Denial, bad faith', tax_disputes: 'Audit, dispute',
      identity_theft: 'Fraud, credit', medical_malpractice: 'Standard of care',
      disability_claims: 'SSDI, ERISA', family: 'Divorce, custody, support',
      criminal: 'Rights, plea, expungement', immigration: 'Visa, asylum',
      traffic: 'Ticket, DUI, license', other: 'Other legal matter',
    },
  },
};

// Resolve user language (fr/nl/en) from the auth context, with fr as final fallback
// since the project is BE-focused post freeze. Locales like 'fr-BE' collapse to 'fr'.
function pickLangCopy(userLanguage) {
  const raw = String(userLanguage || 'fr').toLowerCase().split('-')[0];
  if (raw === 'fr' || raw === 'nl' || raw === 'en') return raw;
  return 'fr';
}

const MIN_CHARS = 20;
const MAX_CHARS = 500;
const MAX_BYTES = 20 * 1024 * 1024;
const DRAFT_KEY = 'analyze_doc_draft_v1';
const ACCEPTED_EXT = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'eml', 'heic', 'heif', 'webp'];

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
  const lang = pickLangCopy(user?.language);
  const t = COPY[lang] || COPY.fr;

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
      const msg = typeof t.errFormatUnsupported === 'function' ? t.errFormatUnsupported(ext) : t.errUpload;
      setFieldErrors(prev => ({ ...prev, file: msg }));
      setError(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setFieldErrors(prev => ({ ...prev, file: t.errFileSize }));
      setError(null);
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
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const onScanViaMobile = () => {
    setError(null);
    setDraftToast(false);
    setQrModalOpen(true);
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
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.eml,.heic,.heif,.webp"
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

      <QrScanModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onFileReceived={(f) => handleFileSelect(f)}
        copy={{
          qrModalTitle: t.qrModalTitle,
          qrModalSub: t.qrModalSub,
          qrModalWaiting: t.qrModalWaiting,
          qrModalReceived: t.qrModalReceived,
          qrModalClose: t.qrModalClose,
          qrModalError: t.qrModalError,
        }}
      />
    </div>
  );
}
