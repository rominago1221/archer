import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Scale, Shield, Clock, Zap, FileText, ChevronDown, ChevronUp, Loader2, ExternalLink, AlertCircle, CheckCircle, Sword, Target, TrendingUp, TrendingDown, Mail, X, Copy, Download, Link2, Share2, Camera } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// ========== TRANSLATIONS ==========
const labels = {
  en: {
    riskScore: 'Jasper Risk Score', evolution: 'Score evolution', financial: 'Financial', urgency: 'Urgency',
    legalStrength: 'Legal Strength', complexity: 'Complexity', actionIn: (d) => d > 0 ? `Action required in ${d} day${d !== 1 ? 's' : ''}` : null,
    deadlinePassed: 'DEADLINE PASSED — Immediate action required',
    updatedWith: 'Updated with latest document',
    aiAnalysis: 'Jasper AI Analysis', findings: 'Key Findings', noFindings: 'No findings yet. Upload a document to get your analysis.',
    legalRef: 'Legal reference', jurisprudence: 'Jurisprudence',
    nextSteps: 'Recommended next steps', keyInsight: 'Key Insight',
    battlePreview: 'Legal Battle Preview', yourPosition: 'Your Position', opposingSide: 'Opposing Side',
    strength: 'Strength', arguments: 'Key Arguments', vulnerabilities: 'Vulnerabilities',
    outcomePredictor: 'Outcome Predictor', predictOutcome: 'Predict my outcome', predicting: 'Analyzing...',
    predictError: 'Unable to generate prediction — try again', probable: 'Most probable', best: 'Best case', worst: 'Worst case',
    confidenceLevel: 'Confidence level', keyFactors: 'Key factors',
    responseLetters: 'Response Letters', generateLetter: 'Generate Letter', generating: 'Generating...',
    letterReady: 'Your Response Letter', keyPoints: 'Key points in this letter', warnings: 'Important reminders',
    generateAnother: 'Generate another', copy: 'Copy', copied: 'Copied!', downloadPdf: 'Download PDF', cancel: 'Cancel',
    caseDetails: 'Case details will be included automatically', yourAddress: 'Your address (optional)',
    opposingName: 'Opposing party name', opposingAddress: 'Opposing party address (optional)',
    additionalContext: 'Additional context (optional)',
    shareCase: 'Share this case', shareDesc: 'Generate a read-only link. Anyone with the link can view this case analysis.',
    expiresIn: 'Expires in', msgRecipient: 'Message for recipient (optional)',
    shareDisclaimer: 'Recipients can view your case analysis but cannot download your documents or see your personal information.',
    generateLink: 'Generate secure link', generatingLink: 'Generating...', linkGenerated: 'Link generated!',
    linkExpires: (h) => `Link expires in ${h} hours`,
    caseTimeline: 'Case Timeline', documents: 'Documents', sharedLinks: 'Shared links',
    caseMgmt: 'Case Management', activeShares: 'active shares', noShares: 'No shared links yet',
    upload: 'Upload new document', talkLawyer: 'Talk to a lawyer',
    caseType: (t) => t || 'Other',
  },
  'fr-BE': {
    riskScore: 'Score de Risque Jasper', evolution: 'Evolution du score', financial: 'Financier', urgency: 'Urgence',
    legalStrength: 'Solidite juridique', complexity: 'Complexite', actionIn: (d) => d > 0 ? `Action requise dans ${d} jour${d !== 1 ? 's' : ''}` : null,
    deadlinePassed: 'DELAI DEPASSE — Action immediate requise',
    updatedWith: 'Mis a jour avec le dernier document',
    aiAnalysis: 'Analyse IA Jasper', findings: 'Constatations cles', noFindings: 'Aucune constatation. Telechargez un document pour obtenir votre analyse.',
    legalRef: 'Reference legale', jurisprudence: 'Jurisprudence',
    nextSteps: 'Prochaines etapes recommandees', keyInsight: 'Point cle',
    battlePreview: 'Apercu du litige', yourPosition: 'Votre position', opposingSide: 'Partie adverse',
    strength: 'Force', arguments: 'Arguments cles', vulnerabilities: 'Vulnerabilites',
    outcomePredictor: 'Predicteur d\'issue', predictOutcome: 'Predire mon issue', predicting: 'Analyse en cours...',
    predictError: 'Impossible de generer la prediction — reessayez', probable: 'Plus probable', best: 'Meilleur cas', worst: 'Pire cas',
    confidenceLevel: 'Niveau de confiance', keyFactors: 'Facteurs cles',
    responseLetters: 'Lettres de reponse', generateLetter: 'Generer la lettre', generating: 'Generation...',
    letterReady: 'Votre lettre de reponse', keyPoints: 'Points cles de cette lettre', warnings: 'Rappels importants',
    generateAnother: 'Generer une autre', copy: 'Copier', copied: 'Copie !', downloadPdf: 'Telecharger PDF', cancel: 'Annuler',
    caseDetails: 'Les details du dossier seront inclus automatiquement', yourAddress: 'Votre adresse (optionnel)',
    opposingName: 'Nom de la partie adverse', opposingAddress: 'Adresse de la partie adverse (optionnel)',
    additionalContext: 'Contexte supplementaire (optionnel)',
    shareCase: 'Partager ce dossier', shareDesc: 'Generez un lien en lecture seule. Toute personne disposant du lien pourra consulter cette analyse.',
    expiresIn: 'Expire dans', msgRecipient: 'Message pour le destinataire (optionnel)',
    shareDisclaimer: 'Les destinataires peuvent consulter votre analyse mais ne peuvent pas telecharger vos documents ni voir vos informations personnelles.',
    generateLink: 'Generer un lien securise', generatingLink: 'Generation...', linkGenerated: 'Lien genere !',
    linkExpires: (h) => `Le lien expire dans ${h} heures`,
    caseTimeline: 'Chronologie du dossier', documents: 'Documents', sharedLinks: 'Liens partages',
    caseMgmt: 'Gestion du dossier', activeShares: 'partages actifs', noShares: 'Aucun lien partage',
    upload: 'Televerser un nouveau document', talkLawyer: 'Parler a un avocat',
    caseType: (t) => ({ employment: 'Travail', housing: 'Bail', debt: 'Creance', nda: 'NDA', contract: 'Contrat', consumer: 'Consommateur', family: 'Famille', court: 'Tribunal', penal: 'Penal', commercial: 'Commercial' }[t] || t || 'Autre'),
  },
  'nl-BE': {
    riskScore: 'Jasper Risicoscore', evolution: 'Score-evolutie', financial: 'Financieel', urgency: 'Urgentie',
    legalStrength: 'Juridische sterkte', complexity: 'Complexiteit', actionIn: (d) => d > 0 ? `Actie vereist binnen ${d} dag${d !== 1 ? 'en' : ''}` : null,
    deadlinePassed: 'DEADLINE VERSTREKEN — Onmiddellijke actie vereist',
    updatedWith: 'Bijgewerkt met laatste document',
    aiAnalysis: 'Jasper AI-analyse', findings: 'Belangrijke bevindingen', noFindings: 'Nog geen bevindingen. Upload een document om uw analyse te krijgen.',
    legalRef: 'Juridische referentie', jurisprudence: 'Rechtspraak',
    nextSteps: 'Aanbevolen volgende stappen', keyInsight: 'Belangrijk inzicht',
    battlePreview: 'Juridisch geschil overzicht', yourPosition: 'Uw positie', opposingSide: 'Tegenpartij',
    strength: 'Sterkte', arguments: 'Belangrijke argumenten', vulnerabilities: 'Kwetsbaarheden',
    outcomePredictor: 'Uitkomstvoorspeller', predictOutcome: 'Voorspel mijn uitkomst', predicting: 'Analyseren...',
    predictError: 'Kan voorspelling niet genereren — probeer opnieuw', probable: 'Meest waarschijnlijk', best: 'Beste geval', worst: 'Slechtste geval',
    confidenceLevel: 'Betrouwbaarheidsniveau', keyFactors: 'Belangrijke factoren',
    responseLetters: 'Antwoordbrieven', generateLetter: 'Brief genereren', generating: 'Genereren...',
    letterReady: 'Uw antwoordbrief', keyPoints: 'Belangrijke punten', warnings: 'Belangrijke herinneringen',
    generateAnother: 'Andere genereren', copy: 'Kopieren', copied: 'Gekopieerd!', downloadPdf: 'PDF downloaden', cancel: 'Annuleren',
    caseDetails: 'Dossierdetails worden automatisch opgenomen', yourAddress: 'Uw adres (optioneel)',
    opposingName: 'Naam tegenpartij', opposingAddress: 'Adres tegenpartij (optioneel)',
    additionalContext: 'Extra context (optioneel)',
    shareCase: 'Dit dossier delen', shareDesc: 'Genereer een alleen-lezen link.',
    expiresIn: 'Verloopt over', msgRecipient: 'Bericht voor ontvanger (optioneel)',
    shareDisclaimer: 'Ontvangers kunnen uw analyse bekijken maar geen documenten downloaden.',
    generateLink: 'Beveiligde link genereren', generatingLink: 'Genereren...', linkGenerated: 'Link gegenereerd!',
    linkExpires: (h) => `Link verloopt over ${h} uur`,
    caseTimeline: 'Dossiertijdlijn', documents: 'Documenten', sharedLinks: 'Gedeelde links',
    caseMgmt: 'Dossierbeheer', activeShares: 'actieve delingen', noShares: 'Nog geen gedeelde links',
    upload: 'Nieuw document uploaden', talkLawyer: 'Spreek met een advocaat',
    caseType: (t) => ({ employment: 'Arbeidsrecht', housing: 'Huurrecht', debt: 'Schuld', nda: 'NDA', contract: 'Contract', consumer: 'Consument', family: 'Familierecht', court: 'Rechtbank', penal: 'Strafrecht', commercial: 'Handelsrecht' }[t] || t || 'Ander'),
  },
  'de-BE': {
    riskScore: 'Jasper Risikobewertung', evolution: 'Score-Entwicklung', financial: 'Finanziell', urgency: 'Dringlichkeit',
    legalStrength: 'Rechtliche Starke', complexity: 'Komplexitat', actionIn: (d) => d > 0 ? `Handlung erforderlich in ${d} Tag${d !== 1 ? 'en' : ''}` : null,
    deadlinePassed: 'FRIST ABGELAUFEN — Sofortiges Handeln erforderlich',
    updatedWith: 'Aktualisiert mit neuestem Dokument',
    aiAnalysis: 'Jasper KI-Analyse', findings: 'Wichtige Feststellungen', noFindings: 'Noch keine Feststellungen. Laden Sie ein Dokument hoch.',
    legalRef: 'Rechtsgrundlage', jurisprudence: 'Rechtsprechung',
    nextSteps: 'Empfohlene nachste Schritte', keyInsight: 'Wichtige Erkenntnis',
    battlePreview: 'Rechtsstreit-Vorschau', yourPosition: 'Ihre Position', opposingSide: 'Gegenseite',
    strength: 'Starke', arguments: 'Wichtige Argumente', vulnerabilities: 'Schwachstellen',
    outcomePredictor: 'Ergebnisvorhersage', predictOutcome: 'Mein Ergebnis vorhersagen', predicting: 'Analysieren...',
    predictError: 'Vorhersage nicht moglich — erneut versuchen', probable: 'Am wahrscheinlichsten', best: 'Bester Fall', worst: 'Schlimmster Fall',
    confidenceLevel: 'Vertrauensniveau', keyFactors: 'Wichtige Faktoren',
    responseLetters: 'Antwortbriefe', generateLetter: 'Brief erstellen', generating: 'Erstellen...',
    letterReady: 'Ihr Antwortbrief', keyPoints: 'Wichtige Punkte', warnings: 'Wichtige Hinweise',
    generateAnother: 'Anderen erstellen', copy: 'Kopieren', copied: 'Kopiert!', downloadPdf: 'PDF herunterladen', cancel: 'Abbrechen',
    caseDetails: 'Falldetails werden automatisch einbezogen', yourAddress: 'Ihre Adresse (optional)',
    opposingName: 'Name der Gegenpartei', opposingAddress: 'Adresse der Gegenpartei (optional)',
    additionalContext: 'Zusatzlicher Kontext (optional)',
    shareCase: 'Diesen Fall teilen', shareDesc: 'Erstellen Sie einen Nur-Lesen-Link.',
    expiresIn: 'Lauft ab in', msgRecipient: 'Nachricht fur Empfanger (optional)',
    shareDisclaimer: 'Empfanger konnen Ihre Analyse einsehen, aber keine Dokumente herunterladen.',
    generateLink: 'Sicheren Link erstellen', generatingLink: 'Erstellen...', linkGenerated: 'Link erstellt!',
    linkExpires: (h) => `Link lauft in ${h} Stunden ab`,
    caseTimeline: 'Fallchronik', documents: 'Dokumente', sharedLinks: 'Geteilte Links',
    caseMgmt: 'Fallverwaltung', activeShares: 'aktive Freigaben', noShares: 'Noch keine geteilten Links',
    upload: 'Neues Dokument hochladen', talkLawyer: 'Mit einem Anwalt sprechen',
    caseType: (t) => ({ employment: 'Arbeitsrecht', housing: 'Mietrecht', debt: 'Schulden', nda: 'NDA', contract: 'Vertrag', consumer: 'Verbraucher', family: 'Familienrecht', court: 'Gericht', penal: 'Strafrecht', commercial: 'Handelsrecht' }[t] || t || 'Sonstige'),
  },
};

// ========== RISK HISTORY CHART ==========
const RiskHistoryChart = ({ history, currentScore, t }) => {
  if (!history || history.length === 0) return null;
  const maxScore = 100;
  const points = history.map((h, i) => ({ x: (i / Math.max(history.length - 1, 1)) * 100, y: 100 - (h.score / maxScore) * 100 }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <div className="mt-3" data-testid="risk-history-chart">
      <div className="text-[10px] text-[#9ca3af] mb-2">{t.evolution}</div>
      <svg viewBox="-5 -5 110 60" className="w-full h-16">
        <path d={pathD} fill="none" stroke="#1a56db" strokeWidth="1.5" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={i === points.length - 1 ? '#1a56db' : '#93c5fd'} />)}
      </svg>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
const CaseDetail = () => {
  const { caseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [showOutcome, setShowOutcome] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState(false);
  const [letterTypes, setLetterTypes] = useState([]);
  const [selectedLetterType, setSelectedLetterType] = useState(null);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [letterForm, setLetterForm] = useState({ user_address: '', opposing_party_name: '', opposing_party_address: '', additional_context: '' });
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareExpiry, setShareExpiry] = useState(48);
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [activeShares, setActiveShares] = useState([]);

  const userLang = user?.language || 'en';
  const t = labels[userLang] || labels['en'];

  const fetchCase = useCallback(async () => {
    try {
      const [caseRes, eventsRes, sharesRes] = await Promise.all([
        axios.get(`${API}/cases/${caseId}`, { withCredentials: true }),
        axios.get(`${API}/cases/${caseId}/events`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API}/cases/${caseId}/shares`, { withCredentials: true }).catch(() => ({ data: [] })),
      ]);
      setCaseData(caseRes.data);
      setEvents(eventsRes.data || []);
      setActiveShares(sharesRes.data || []);

      const userCountry = user?.country || caseRes.data?.country || 'US';
      const caseType = caseRes.data?.type || 'other';
      const ltRes = await axios.get(`${API}/letters/types/${caseType}?country=${userCountry}`, { withCredentials: true }).catch(() => ({ data: { letter_types: [] } }));
      setLetterTypes(ltRes.data?.letter_types || ltRes.data || []);
    } catch (err) {
      console.error('Failed to load case:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId, user]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const handlePredict = async () => {
    setPredicting(true);
    setPredictError(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await axios.post(`${API}/cases/${caseId}/predict-outcome`, {}, { withCredentials: true, signal: controller.signal });
      setPrediction(res.data);
    } catch (err) {
      console.error('Prediction failed:', err);
      setPredictError(true);
    } finally {
      clearTimeout(timeout);
      setPredicting(false);
    }
  };

  const submitLetterGeneration = async () => {
    if (!selectedLetterType) return;
    setGeneratingLetter(true);
    try {
      const res = await axios.post(`${API}/letters/generate`, {
        case_id: caseId,
        letter_type: selectedLetterType.id,
        user_name: user?.name || '',
        user_address: letterForm.user_address || undefined,
        opposing_party_name: letterForm.opposing_party_name || undefined,
        opposing_party_address: letterForm.opposing_party_address || undefined,
        additional_context: letterForm.additional_context || undefined,
      }, { withCredentials: true });
      setGeneratedLetter(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate letter');
    } finally {
      setGeneratingLetter(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLetter) return;
    const text = `${generatedLetter.subject}\n\n${generatedLetter.letter_body?.replace(/\\n/g, '\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsPDF = () => {
    if (!generatedLetter) return;
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(generatedLetter.subject || '', 20, 20);
      doc.setFontSize(10);
      const body = generatedLetter.letter_body?.replace(/\\n/g, '\n') || '';
      const lines = doc.splitTextToSize(body, 170);
      doc.text(lines, 20, 35);
      doc.save(`letter_${caseId}.pdf`);
    });
  };

  const getRiskColor = (score) => {
    if (score >= 75) return '#dc2626';
    if (score >= 50) return '#f59e0b';
    if (score >= 25) return '#3b82f6';
    return '#22c55e';
  };

  const getDimensionColor = (score) => {
    if (score >= 70) return '#dc2626';
    if (score >= 40) return '#f59e0b';
    return '#22c55e';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={24} className="animate-spin text-[#1a56db]" />
    </div>
  );

  if (!caseData) return (
    <div className="text-center py-20">
      <div className="text-sm text-[#6b7280]">Case not found</div>
    </div>
  );

  const findings = caseData.ai_findings || [];
  const nextSteps = caseData.ai_next_steps || [];
  const battlePreview = caseData.battle_preview;
  const daysUntil = caseData.deadline ? Math.ceil((new Date(caseData.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12" data-testid="case-detail-page">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#1a56db] uppercase tracking-wider font-medium mb-1" data-testid="case-type-label">{t.caseType(caseData.type)}</div>
          <h1 className="text-xl font-semibold text-[#111827] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="case-title">{caseData.title}</h1>
          {daysUntil !== null && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${daysUntil <= 0 ? 'text-[#dc2626]' : daysUntil <= 7 ? 'text-[#f59e0b]' : 'text-[#6b7280]'}`} data-testid="deadline-indicator">
              <Clock size={12} />
              {daysUntil <= 0 ? t.deadlinePassed : t.actionIn(daysUntil)}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowShareModal(true)} className="btn-pill btn-outline text-xs flex items-center gap-1.5" data-testid="share-btn">
            <Share2 size={13} /> {activeShares.length > 0 && <span className="text-[#1a56db]">{activeShares.length}</span>}
          </button>
          <button onClick={() => navigate('/upload')} className="btn-pill btn-blue text-xs flex items-center gap-1.5" data-testid="upload-btn">
            <FileText size={13} /> {t.upload}
          </button>
        </div>
      </div>

      {/* RISK SCORE CARD */}
      <div className="card p-5" data-testid="risk-score-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#1a56db]" />
            <span className="text-sm font-medium text-[#111827]">{t.riskScore}</span>
          </div>
          <div className="text-xs text-[#9ca3af]">{t.updatedWith}</div>
        </div>
        <div className="grid grid-cols-5 gap-4 items-center">
          <div className="col-span-1 text-center">
            <div className="text-4xl font-bold" style={{ color: getRiskColor(caseData.risk_score) }} data-testid="risk-score-value">{caseData.risk_score}</div>
            <div className="text-xs text-[#9ca3af]">/ 100</div>
          </div>
          <div className="col-span-4 grid grid-cols-4 gap-3">
            {[
              { key: 'financial', val: caseData.risk_financial, icon: <Scale size={12} /> },
              { key: 'urgency', val: caseData.risk_urgency, icon: <Clock size={12} /> },
              { key: 'legalStrength', val: caseData.risk_legal_strength, icon: <Shield size={12} /> },
              { key: 'complexity', val: caseData.risk_complexity, icon: <Zap size={12} /> },
            ].map(d => (
              <div key={d.key} className="text-center">
                <div className="text-lg font-semibold" style={{ color: getDimensionColor(d.val) }}>{d.val || 0}</div>
                <div className="text-[10px] text-[#9ca3af] flex items-center justify-center gap-1">{d.icon} {t[d.key]}</div>
                <div className="h-1 bg-[#f3f4f6] rounded-full mt-1">
                  <div className="h-full rounded-full" style={{ width: `${d.val || 0}%`, backgroundColor: getDimensionColor(d.val) }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <RiskHistoryChart history={caseData.risk_score_history} currentScore={caseData.risk_score} t={t} />
      </div>

      {/* AI ANALYSIS — FINDINGS */}
      <div className="card p-5" data-testid="ai-analysis-section">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={16} className="text-[#1a56db]" />
          <span className="text-sm font-medium text-[#111827]">{t.aiAnalysis}</span>
        </div>

        {caseData.ai_summary && (
          <div className="mb-4 p-3 bg-[#f8f8f8] rounded-xl text-sm text-[#444] leading-relaxed" data-testid="case-summary">
            {caseData.ai_summary}
          </div>
        )}

        {caseData.key_insight && (
          <div className="mb-4 p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl" data-testid="key-insight">
            <div className="text-[10px] text-[#1d4ed8] font-semibold uppercase tracking-wider mb-1">{t.keyInsight}</div>
            <div className="text-sm text-[#1e40af] leading-relaxed">{caseData.key_insight}</div>
          </div>
        )}

        <div className="text-xs font-semibold text-[#111827] mb-3">{t.findings}</div>

        {findings.length > 0 ? (
          <div className="space-y-3">
            {findings.map((finding, i) => {
              const findingText = finding.text || finding.texte || finding.description || finding.constatation || '';
              const impactColor = finding.impact === 'high' ? '#dc2626' : finding.impact === 'medium' ? '#f59e0b' : '#22c55e';
              const impactBg = finding.impact === 'high' ? '#fef2f2' : finding.impact === 'medium' ? '#fffbeb' : '#f0fdf4';
              const legalRef = finding.legal_ref || finding.reference_legale || finding.loi_applicable || '';
              const juris = finding.jurisprudence || finding.jurisprudence_applicable || '';
              return (
                <div key={i} className="p-3 rounded-xl border border-[#ebebeb]" data-testid={`finding-${i}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: impactBg }}>
                      {finding.type === 'opportunity' ? <TrendingUp size={12} style={{ color: '#22c55e' }} /> :
                       finding.type === 'risk' ? <TrendingDown size={12} style={{ color: impactColor }} /> :
                       <AlertCircle size={12} style={{ color: impactColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#111827] leading-relaxed mb-1.5" data-testid={`finding-text-${i}`}>{findingText}</div>
                      {(legalRef || juris) && (
                        <div className="space-y-1 mt-2">
                          {legalRef && (
                            <div className="flex items-start gap-1.5 text-[11px]" data-testid={`finding-legal-ref-${i}`}>
                              <Scale size={10} className="text-[#6366f1] mt-0.5 flex-shrink-0" />
                              <span className="text-[#6366f1] font-medium">{t.legalRef}:</span>
                              <span className="text-[#555]">{legalRef}</span>
                            </div>
                          )}
                          {juris && (
                            <div className="flex items-start gap-1.5 text-[11px]" data-testid={`finding-juris-${i}`}>
                              <FileText size={10} className="text-[#8b5cf6] mt-0.5 flex-shrink-0" />
                              <span className="text-[#8b5cf6] font-medium">{t.jurisprudence}:</span>
                              <span className="text-[#555]">{juris}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: impactBg, color: impactColor }}>
                      {finding.impact}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-[#9ca3af] py-4 text-center">{t.noFindings}</div>
        )}
      </div>

      {/* NEXT STEPS */}
      {nextSteps.length > 0 && (
        <div className="card p-5" data-testid="next-steps-section">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-[#16a34a]" />
            <span className="text-sm font-medium text-[#111827]">{t.nextSteps}</span>
          </div>
          <div className="space-y-3">
            {nextSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3" data-testid={`next-step-${i}`}>
                <div className="w-6 h-6 rounded-full bg-[#f0fdf4] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-[#16a34a]">{i + 1}</div>
                <div>
                  <div className="text-sm font-medium text-[#111827]">{step.title || step.titre || ''}</div>
                  <div className="text-xs text-[#6b7280] mt-0.5">{step.description || step.desc || ''}</div>
                  {step.deadline && <div className="text-[10px] text-[#f59e0b] mt-1 font-medium">{step.deadline}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BATTLE PREVIEW */}
      {battlePreview && (battlePreview.user_side || battlePreview.opposing_side) && (
        <div className="card p-5" data-testid="battle-preview-section">
          <div className="flex items-center gap-2 mb-4">
            <Sword size={16} className="text-[#7c3aed]" />
            <span className="text-sm font-medium text-[#111827]">{t.battlePreview}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {battlePreview.user_side && (
              <div className="bg-[#eff6ff] rounded-xl p-4">
                <div className="text-xs font-semibold text-[#1d4ed8] mb-2">{t.yourPosition}</div>
                {battlePreview.user_side.strength && <div className="text-xs text-[#6b7280] mb-2">{t.strength}: <span className="font-medium text-[#1d4ed8]">{battlePreview.user_side.strength}/10</span></div>}
                <div className="text-xs text-[#111] mb-2">{battlePreview.user_side.summary || ''}</div>
                {battlePreview.user_side.arguments && (
                  <div className="space-y-1 mb-2">
                    <div className="text-[10px] font-medium text-[#1d4ed8]">{t.arguments}:</div>
                    {(battlePreview.user_side.arguments || []).map((a, i) => <div key={i} className="text-[11px] text-[#555] flex items-start gap-1"><CheckCircle size={10} className="text-[#1d4ed8] mt-0.5 flex-shrink-0" />{typeof a === 'string' ? a : a.argument || a.text || ''}</div>)}
                  </div>
                )}
              </div>
            )}
            {battlePreview.opposing_side && (
              <div className="bg-[#fef2f2] rounded-xl p-4">
                <div className="text-xs font-semibold text-[#dc2626] mb-2">{t.opposingSide}</div>
                {battlePreview.opposing_side.strength && <div className="text-xs text-[#6b7280] mb-2">{t.strength}: <span className="font-medium text-[#dc2626]">{battlePreview.opposing_side.strength}/10</span></div>}
                <div className="text-xs text-[#111] mb-2">{battlePreview.opposing_side.summary || ''}</div>
                {battlePreview.opposing_side.vulnerabilities && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-medium text-[#dc2626]">{t.vulnerabilities}:</div>
                    {(battlePreview.opposing_side.vulnerabilities || []).map((v, i) => <div key={i} className="text-[11px] text-[#555] flex items-start gap-1"><AlertCircle size={10} className="text-[#dc2626] mt-0.5 flex-shrink-0" />{typeof v === 'string' ? v : v.vulnerability || v.text || ''}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OUTCOME PREDICTOR */}
      <div className="card p-5" data-testid="outcome-predictor-section">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#0891b2]" />
            <span className="text-sm font-medium text-[#111827]">{t.outcomePredictor}</span>
          </div>
          {!prediction && !predicting && !predictError && (
            <button onClick={handlePredict} className="btn-pill btn-outline text-xs flex items-center gap-1.5" data-testid="predict-btn">
              <Zap size={12} /> {t.predictOutcome}
            </button>
          )}
        </div>
        {predicting && (
          <div className="text-center py-6">
            <Loader2 size={20} className="animate-spin text-[#0891b2] mx-auto mb-2" />
            <div className="text-xs text-[#6b7280]">{t.predicting}</div>
          </div>
        )}
        {predictError && (
          <div className="text-center py-4" data-testid="predict-error">
            <div className="text-sm text-[#dc2626] mb-2">{t.predictError}</div>
            <button onClick={handlePredict} className="btn-pill btn-outline text-xs">{t.predictOutcome}</button>
          </div>
        )}
        {prediction && (
          <div className="space-y-3" data-testid="prediction-result">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t.probable, val: prediction.probable_outcome || prediction.cas_probable, color: '#0891b2' },
                { label: t.best, val: prediction.best_case || prediction.meilleur_cas, color: '#16a34a' },
                { label: t.worst, val: prediction.worst_case || prediction.pire_cas, color: '#dc2626' },
              ].map((o, i) => o.val && (
                <div key={i} className="bg-[#f8f8f8] rounded-xl p-3 text-center">
                  <div className="text-[10px] text-[#9ca3af] mb-1">{o.label}</div>
                  <div className="text-xs font-medium" style={{ color: o.color }}>{typeof o.val === 'string' ? o.val : o.val?.description || JSON.stringify(o.val)}</div>
                </div>
              ))}
            </div>
            {prediction.confidence && (
              <div className="text-xs text-[#6b7280]">{t.confidenceLevel}: <span className="font-medium text-[#111]">{prediction.confidence}</span></div>
            )}
            {prediction.key_factors && (
              <div>
                <div className="text-xs font-medium text-[#111] mb-1">{t.keyFactors}:</div>
                <div className="space-y-1">
                  {(prediction.key_factors || []).map((f, i) => (
                    <div key={i} className="text-xs text-[#555] flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#0891b2] mt-1.5 flex-shrink-0"></span>
                      {typeof f === 'string' ? f : f.factor || f.text || ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RESPONSE LETTERS */}
      {letterTypes.length > 0 && (
        <div className="card p-5" data-testid="response-letters-section">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-[#1a56db]" />
            <span className="text-sm font-medium text-[#111827]">{t.responseLetters}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {letterTypes.map((lt, i) => (
              <button
                key={i}
                onClick={() => { setSelectedLetterType(lt); setShowLetterModal(true); setGeneratedLetter(null); }}
                className="text-left p-3 rounded-xl border border-[#ebebeb] hover:border-[#93c5fd] hover:bg-[#fafafa] transition-all"
                data-testid={`letter-type-${i}`}
              >
                <div className="text-sm font-medium text-[#111827] mb-1">{lt.label}</div>
                <div className="text-xs text-[#6b7280] leading-relaxed">{lt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TIMELINE + DOCUMENTS */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-sm font-medium text-[#111827] mb-3">{t.caseTimeline}</div>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.slice(0, 10).map((ev, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="text-[#111]">{ev.title}</div>
                    <div className="text-[#9ca3af]">{new Date(ev.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-xs text-[#9ca3af]">No events yet</div>}
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-[#111827] mb-3">{t.caseMgmt}</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6b7280]">
              <span>{t.documents}</span>
              <span>{caseData.document_count || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6b7280]">
              <span>{t.sharedLinks}</span>
              <span>{activeShares.length} {t.activeShares}</span>
            </div>
            <button onClick={() => navigate('/lawyers')} className="w-full mt-2 btn-pill btn-outline text-xs py-2">{t.talkLawyer}</button>
          </div>
        </div>
      </div>

      {/* LETTER MODAL */}
      {showLetterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#ebebeb] flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#111827]">
                  {generatedLetter ? t.letterReady : `${t.generateLetter}: ${selectedLetterType?.label}`}
                </div>
                <div className="text-xs text-[#6b7280]">{selectedLetterType?.desc}</div>
              </div>
              <button onClick={() => { setShowLetterModal(false); setGeneratedLetter(null); }} className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center">
                <X size={18} className="text-[#6b7280]" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {!generatedLetter ? (
                <div className="space-y-4">
                  <div className="bg-[#eff6ff] rounded-xl p-4">
                    <div className="text-xs font-medium text-[#1d4ed8] mb-2">{t.caseDetails}:</div>
                    <div className="text-xs text-[#3b82f6] space-y-1">
                      <div>• {caseData.title}</div>
                      <div>• Risk Score: {caseData.risk_score}/100</div>
                      {caseData.financial_exposure && <div>• {caseData.financial_exposure}</div>}
                      {caseData.deadline && <div>• {caseData.deadline}</div>}
                    </div>
                  </div>
                  <div><label className="form-label">{t.yourAddress}</label><input type="text" className="form-input" value={letterForm.user_address} onChange={(e) => setLetterForm({ ...letterForm, user_address: e.target.value })} /></div>
                  <div><label className="form-label">{t.opposingName}</label><input type="text" className="form-input" value={letterForm.opposing_party_name} onChange={(e) => setLetterForm({ ...letterForm, opposing_party_name: e.target.value })} /></div>
                  <div><label className="form-label">{t.opposingAddress}</label><input type="text" className="form-input" value={letterForm.opposing_party_address} onChange={(e) => setLetterForm({ ...letterForm, opposing_party_address: e.target.value })} /></div>
                  <div><label className="form-label">{t.additionalContext}</label><textarea className="form-input min-h-[80px]" value={letterForm.additional_context} onChange={(e) => setLetterForm({ ...letterForm, additional_context: e.target.value })} /></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#fafafa] rounded-xl p-5 border border-[#ebebeb]">
                    <div className="text-xs font-medium text-[#1a56db] mb-2">{generatedLetter.subject}</div>
                    <div className="text-xs text-[#444] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                      {generatedLetter.letter_body?.replace(/\\n/g, '\n')}
                    </div>
                  </div>
                  {generatedLetter.key_points && (
                    <div className="bg-[#f0fdf4] rounded-xl p-4">
                      <div className="text-xs font-medium text-[#16a34a] mb-2">{t.keyPoints}:</div>
                      <ul className="space-y-1">{generatedLetter.key_points.map((p, i) => <li key={i} className="text-xs text-[#15803d] flex items-start gap-2"><CheckCircle size={12} className="text-[#16a34a] mt-0.5 flex-shrink-0" />{p}</li>)}</ul>
                    </div>
                  )}
                  {generatedLetter.warnings && (
                    <div className="bg-[#fffbeb] rounded-xl p-4">
                      <div className="text-xs font-medium text-[#d97706] mb-2">{t.warnings}:</div>
                      <ul className="space-y-1">{generatedLetter.warnings.map((w, i) => <li key={i} className="text-xs text-[#b45309] flex items-start gap-2"><AlertCircle size={12} className="text-[#d97706] mt-0.5 flex-shrink-0" />{w}</li>)}</ul>
                    </div>
                  )}
                  {generatedLetter.disclaimer && <div className="text-[10px] text-[#9ca3af] leading-relaxed">{generatedLetter.disclaimer}</div>}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-[#ebebeb] flex items-center justify-between bg-[#fafafa]">
              {!generatedLetter ? (
                <>
                  <button onClick={() => setShowLetterModal(false)} className="btn-pill btn-outline">{t.cancel}</button>
                  <button onClick={submitLetterGeneration} disabled={generatingLetter} className="btn-pill btn-blue flex items-center gap-2" data-testid="generate-letter-btn">
                    {generatingLetter ? <><Loader2 size={16} className="animate-spin" /> {t.generating}</> : <><Mail size={16} /> {t.generateLetter}</>}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setGeneratedLetter(null)} className="btn-pill btn-outline">{t.generateAnother}</button>
                  <div className="flex gap-2">
                    <button onClick={copyToClipboard} className="btn-pill btn-outline flex items-center gap-2" data-testid="copy-letter-btn"><Copy size={16} /> {copied ? t.copied : t.copy}</button>
                    <button onClick={downloadAsPDF} className="btn-pill btn-blue flex items-center gap-2" data-testid="download-letter-btn"><Download size={16} /> {t.downloadPdf}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setShowShareModal(false); setShareLink(null); }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()} data-testid="share-modal">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium">{t.shareCase}</div>
              <button onClick={() => { setShowShareModal(false); setShareLink(null); }}><X size={16} className="text-[#9ca3af]" /></button>
            </div>
            {!shareLink ? (
              <>
                <div className="text-xs text-[#6b7280] mb-4">{t.shareDesc}</div>
                <div className="mb-3">
                  <div className="text-[11px] text-[#9ca3af] mb-1.5">{t.expiresIn}</div>
                  <div className="flex gap-2">
                    {[{h: 24, l: '24h'}, {h: 48, l: '48h'}, {h: 168, l: '7d'}, {h: 720, l: '30d'}].map(opt => (
                      <button key={opt.h} onClick={() => setShareExpiry(opt.h)}
                        className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${shareExpiry === opt.h ? 'bg-[#eff6ff] border-[#1a56db] text-[#1a56db]' : 'border-[#ebebeb] text-[#555] hover:border-[#93c5fd]'}`}
                        data-testid={`expiry-${opt.h}`}
                      >{opt.l}</button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-[11px] text-[#9ca3af] mb-1.5">{t.msgRecipient}</div>
                  <input value={shareMessage} onChange={e => setShareMessage(e.target.value)} className="w-full px-3 py-2 text-xs border border-[#ebebeb] rounded-lg focus:outline-none focus:border-[#1a56db]" data-testid="share-message-input" />
                </div>
                <div className="text-[10px] text-[#9ca3af] mb-4">{t.shareDisclaimer}</div>
                <button onClick={async () => {
                  setSharing(true);
                  try {
                    const res = await axios.post(`${API}/cases/${caseId}/share`, { expiry_hours: shareExpiry, message: shareMessage || null }, { withCredentials: true });
                    setShareLink(`${window.location.origin}/shared/${res.data.token}`);
                    const sharesRes = await axios.get(`${API}/cases/${caseId}/shares`, { withCredentials: true });
                    setActiveShares(sharesRes.data || []);
                  } catch (err) {
                    alert(err.response?.data?.detail || 'Failed');
                  } finally { setSharing(false); }
                }} disabled={sharing} className="w-full btn-pill btn-blue py-2.5 flex items-center justify-center gap-2" data-testid="generate-link-btn">
                  {sharing ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  {sharing ? t.generatingLink : t.generateLink}
                </button>
              </>
            ) : (
              <>
                <div className="text-xs text-[#16a34a] flex items-center gap-1.5 mb-3"><CheckCircle size={14} /> {t.linkGenerated}</div>
                <div className="flex items-center gap-2 mb-4">
                  <input value={shareLink} readOnly className="flex-1 px-3 py-2 text-xs bg-[#f8f8f8] border border-[#ebebeb] rounded-lg" data-testid="share-link-input" />
                  <button onClick={() => { navigator.clipboard.writeText(shareLink); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2000); }}
                    className="btn-pill btn-blue text-xs" data-testid="copy-share-link-btn">
                    {shareLinkCopied ? t.copied : t.copy}
                  </button>
                </div>
                <div className="flex gap-2 mb-3">
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareLink)}`} target="_blank" rel="noopener noreferrer" className="flex-1 btn-pill btn-outline text-xs text-center py-2">WhatsApp</a>
                  <a href={`mailto:?body=${encodeURIComponent(shareLink)}`} className="flex-1 btn-pill btn-outline text-xs text-center py-2">Email</a>
                </div>
                <div className="text-[10px] text-[#9ca3af]">{t.linkExpires(shareExpiry)}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetail;
