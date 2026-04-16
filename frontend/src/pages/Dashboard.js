import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, FileText, Upload, Settings, MessageSquare, Scale, LogOut, BookOpen, Download, Share2, ExternalLink, Loader2, X, ArrowLeft, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import AddDocumentModal from '../components/AddDocumentModal';
import CaseChatDrawer from '../components/CaseChatDrawer';
import NextActionsPanel from '../components/NextActionsPanel';
import LetterFormModal from '../components/LetterFormModal';
import NotificationBell from '../components/NotificationBell';
import LetterReadyBanner from '../components/LetterReadyBanner';
import AttorneyLetterModal from '../components/AttorneyLetterModal';
import JurisdictionPills from '../components/JurisdictionPills';
import JurisdictionOnboarding, { hasSeenOnboarding } from '../components/JurisdictionOnboarding';
import AnalysisFindings from '../components/AnalysisFindings';
import ScoreHistoryChart from '../components/ScoreHistoryChart';
import { formatBoldText } from '../utils/sanitize';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Language ── */
const L = {
  en: {
    tagline: 'Your virtual legal cabinet',
    archerRole: 'Senior Legal Advisor',
    stat1: '847K+', stat1l: 'live sources',
    stat2: '20 yrs', stat2l: 'experience',
    stat3: 'Live', stat3l: 'case law',
    stat4: '#1', stat4l: 'Legal AI',
    activeCases: 'Active cases',
    newCase: 'Open a new case',
    archerBanner: 'Archer is analyzing your case in real time',
    archerSub: 'Legal AI · 20 years senior experience · Live case law',
    credSources: '847K+ sources', credLive: 'Live', credUrgent: 'Urgent',
    riskLabel: 'Archer Risk Score',
    riskHigh: 'High risk', riskMed: 'Medium risk', riskLow: 'Low risk',
    dimFin: 'Financial', dimUrg: 'Urgency', dimLeg: 'Legal', dimCom: 'Complexity',
    analysisTitle: 'Archer Analysis — Real-time update',
    live: 'Live',
    questionTitle: 'Archer needs clarification',
    questionFallback: 'Upload additional documents to strengthen your case analysis.',
    btnYes: 'Yes', btnNo: 'No', btnPartial: 'Partially',
    overview: 'Overview',
    critDeadline: 'Critical deadline',
    days: 'days', expired: 'Expired', before: 'Before',
    nextActions: 'Next actions',
    documents: 'Documents', keyDoc: 'Key',
    battleTitle: 'Archer vs Opposing counsel',
    yourArgs: 'Your arguments', theirArgs: 'Their arguments',
    overlayTitle: 'What is your problem?',
    overlaySub: 'Archer will handle your case immediately.',
    backDash: 'Back to dashboard',
    // 8 situations (EN for USA)
    sit: [
      { icon: '🏠', bg: '#fef3c7', title: 'My landlord is causing problems', desc: 'Eviction, rent, repairs, deposit' },
      { icon: '⚡', bg: '#fff5f5', title: 'I received a threatening letter', desc: 'Demand letter, attorney, bailiff' },
      { icon: '💼', bg: '#f0fdf4', title: 'My employer is causing problems', desc: 'Termination, wages, harassment' },
      { icon: '🛡️', bg: '#fff7ed', title: 'My insurance won\'t pay', desc: 'Claim denial, damages' },
      { icon: '📄', bg: '#eff6ff', title: 'I signed something worrying', desc: 'Contract, NDA, agreement' },
      { icon: '⚖️', bg: '#fdf4ff', title: 'I received a court summons', desc: 'Judgment, debt, hearing' },
      { icon: '💳', bg: '#fff5f5', title: 'A debt collector is harassing me', desc: 'Collector, bailiff, recovery' },
      { icon: '💬', bg: '#f0fdf4', title: 'Other legal situation', desc: 'Describe your problem to Archer' },
    ],
    noCase: 'No active case selected',
    deleteConfirm: 'Delete this case? This cannot be undone.',
    noCaseSub: 'Select a case from the sidebar or open a new one.',
    openedOn: 'Opened', docCount: 'documents', updatedBy: 'Updated by Archer',
    caseType: { housing: 'Housing', employment: 'Employment', debt: 'Debt', insurance: 'Insurance', contract: 'Contract', consumer: 'Consumer', family: 'Family', court: 'Court', nda: 'NDA', penal: 'Criminal', commercial: 'Commercial', other: 'Other' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Deadline in',
    navDash: 'Dashboard', navUpload: 'Upload', navCases: 'My cases', navLawyers: 'Lawyers', navDocs: 'Documents', navChat: 'Legal chat', navSettings: 'Settings',
    addDoc: 'Add document', talkLawyer: 'Talk to a lawyer',
    responseIn: 'Response in',
    brief: 'Download brief', share: 'Share',
    scoreHistory: 'Score History', outcomePred: 'Outcome Predictor',
    archerQ: 'Archer needs clarification',
    jurisTitle: 'Recent legal updates — relevant to your case', whyMatters: 'Why this matters',
    riskMonitor: 'Never miss a legal document', riskMonitorSub: 'Connect your inbox — Archer monitors it and alerts you instantly',
    connectGmail: 'Connect Gmail', connectOutlook: 'Connect Outlook',
    shareTitle: 'Share this case — read-only access', shareDesc: 'Generate a secure link', shareCopy: 'Copy link', shareExpiry: 'Link expires in',
    genLetter: 'Generate letter', downloading: 'Generating...', close: 'Close', downloadPdf: 'Download PDF',
    moreQuestions: 'Archer has more questions — ask him directly',
    updatingAnalysis: 'Archer is updating your analysis...',
  },
  fr: {
    tagline: 'Votre cabinet juridique virtuel',
    archerRole: 'Conseiller juridique senior',
    stat1: '847K+', stat1l: 'sources live',
    stat2: '20 ans', stat2l: 'expérience',
    stat3: 'Live', stat3l: 'jurisprudence',
    stat4: '#1', stat4l: 'IA juridique',
    activeCases: 'Dossiers actifs',
    newCase: 'Ouvrir un nouveau dossier',
    archerBanner: 'Archer analyse votre dossier en temps réel',
    archerSub: 'IA juridique · 20 ans d\'expérience senior · Jurisprudence live',
    credSources: '847K+ sources', credLive: 'Live', credUrgent: 'Urgent',
    riskLabel: 'Score de risque Archer',
    riskHigh: 'Risque élevé', riskMed: 'Risque modéré', riskLow: 'Risque faible',
    dimFin: 'Financier', dimUrg: 'Urgence', dimLeg: 'Juridique', dimCom: 'Complexité',
    analysisTitle: 'Analyse de Archer — Mise à jour en temps réel',
    live: 'Live',
    questionTitle: 'Archer a besoin d\'une précision',
    questionFallback: 'Téléversez des documents supplémentaires pour renforcer l\'analyse de votre dossier.',
    btnYes: 'Oui', btnNo: 'Non', btnPartial: 'Partiellement',
    overview: 'Vue d\'ensemble',
    critDeadline: 'Échéance critique',
    days: 'jours', expired: 'Expiré', before: 'Avant le',
    nextActions: 'Prochaines actions',
    documents: 'Documents', keyDoc: 'Clé',
    battleTitle: 'Archer vs Avocat adverse',
    yourArgs: 'Vos arguments', theirArgs: 'Leurs arguments',
    overlayTitle: 'Quel est votre problème ?',
    overlaySub: 'Archer va prendre votre dossier en charge immédiatement.',
    backDash: 'Retour au dashboard',
    sit: [
      { icon: '🏠', bg: '#fef3c7', title: 'Mon propriétaire me cause des problèmes', desc: 'Expulsion, loyer, réparations, dépôt' },
      { icon: '⚡', bg: '#fff5f5', title: 'J\'ai reçu une lettre menaçante', desc: 'Mise en demeure, avocat, huissier' },
      { icon: '💼', bg: '#f0fdf4', title: 'Mon employeur me pose des problèmes', desc: 'Licenciement, salaires, harcèlement' },
      { icon: '🛡️', bg: '#fff7ed', title: 'Mon assurance refuse de payer', desc: 'Refus de remboursement, sinistre' },
      { icon: '📄', bg: '#eff6ff', title: 'J\'ai signé quelque chose d\'inquiétant', desc: 'Contrat, NDA, accord, engagement' },
      { icon: '⚖️', bg: '#fdf4ff', title: 'J\'ai reçu une convocation au tribunal', desc: 'Jugement, dette, citation, audience' },
      { icon: '💳', bg: '#fff5f5', title: 'On me réclame une dette', desc: 'Collecteur, huissier, recouvrement' },
      { icon: '💬', bg: '#f0fdf4', title: 'Autre situation juridique', desc: 'Décrivez votre problème à Archer' },
    ],
    noCase: 'Aucun dossier actif sélectionné',
    deleteConfirm: 'Supprimer ce dossier ? Cette action est irréversible.',
    noCaseSub: 'Sélectionnez un dossier dans la barre latérale ou ouvrez-en un nouveau.',
    openedOn: 'Ouvert le', docCount: 'documents', updatedBy: 'Mis à jour par Archer',
    caseType: { housing: 'Logement', employment: 'Emploi', debt: 'Dettes', insurance: 'Assurance', contract: 'Contrat', consumer: 'Consommation', family: 'Famille', court: 'Tribunal', nda: 'NDA', penal: 'Pénal', commercial: 'Commercial', other: 'Autre' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Échéance dans',
    navDash: 'Dashboard', navUpload: 'Téléverser', navCases: 'Mes dossiers', navLawyers: 'Avocats', navDocs: 'Documents', navChat: 'Chat juridique', navSettings: 'Paramètres',
    addDoc: 'Ajouter un document', talkLawyer: 'Parler à un avocat',
    responseIn: 'Réponse dans',
    brief: 'Télécharger le résumé', share: 'Partager',
    scoreHistory: 'Historique du score', outcomePred: 'Prédiction d\'issue',
    archerQ: 'Archer a besoin d\'une précision',
    jurisTitle: 'Jurisprudence récente — pertinente pour votre dossier', whyMatters: 'Pertinence',
    riskMonitor: 'Ne ratez jamais un document juridique', riskMonitorSub: 'Connectez votre boîte mail — Archer la surveille et vous alerte instantanément',
    connectGmail: 'Connecter Gmail', connectOutlook: 'Connecter Outlook',
    shareTitle: 'Partager ce dossier — accès en lecture seule', shareDesc: 'Générer un lien sécurisé', shareCopy: 'Copier le lien', shareExpiry: 'Lien expire dans',
    genLetter: 'Générer la lettre', downloading: 'Génération...', close: 'Fermer', downloadPdf: 'Télécharger PDF',
    moreQuestions: 'Archer a d\'autres questions — demandez-lui directement',
    updatingAnalysis: 'Archer met à jour votre analyse...',
  },
  nl: {
    tagline: 'Uw virtueel juridisch kantoor',
    archerRole: 'Senior Juridisch Adviseur',
    stat1: '847K+', stat1l: 'live bronnen',
    stat2: '20 jaar', stat2l: 'ervaring',
    stat3: 'Live', stat3l: 'rechtspraak',
    stat4: '#1', stat4l: 'Juridische AI',
    activeCases: 'Actieve dossiers',
    newCase: 'Nieuw dossier openen',
    archerBanner: 'Archer analyseert uw dossier in realtime',
    archerSub: 'Juridische AI · 20 jaar seniorervaring · Live rechtspraak',
    credSources: '847K+ bronnen', credLive: 'Live', credUrgent: 'Dringend',
    riskLabel: 'Archer Risicoscore',
    riskHigh: 'Hoog risico', riskMed: 'Gemiddeld risico', riskLow: 'Laag risico',
    dimFin: 'Financieel', dimUrg: 'Urgentie', dimLeg: 'Juridisch', dimCom: 'Complexiteit',
    analysisTitle: 'Analyse van Archer — Realtime update',
    live: 'Live',
    questionTitle: 'Archer heeft verduidelijking nodig',
    questionFallback: 'Upload extra documenten om uw dossieranalyse te versterken.',
    btnYes: 'Ja', btnNo: 'Nee', btnPartial: 'Gedeeltelijk',
    overview: 'Overzicht',
    critDeadline: 'Kritieke deadline',
    days: 'dagen', expired: 'Verlopen', before: 'Voor',
    nextActions: 'Volgende acties',
    documents: 'Documenten', keyDoc: 'Sleutel',
    battleTitle: 'Archer vs Tegenpartij',
    yourArgs: 'Uw argumenten', theirArgs: 'Hun argumenten',
    overlayTitle: 'Wat is uw probleem?',
    overlaySub: 'Archer neemt uw dossier onmiddellijk in behandeling.',
    backDash: 'Terug naar dashboard',
    sit: [
      { icon: '🏠', bg: '#fef3c7', title: 'Mijn verhuurder veroorzaakt problemen', desc: 'Uitzetting, huur, reparaties, borg' },
      { icon: '⚡', bg: '#fff5f5', title: 'Ik heb een dreigbrief ontvangen', desc: 'Aanmaning, advocaat, deurwaarder' },
      { icon: '💼', bg: '#f0fdf4', title: 'Mijn werkgever veroorzaakt problemen', desc: 'Ontslag, lonen, pesterijen' },
      { icon: '🛡️', bg: '#fff7ed', title: 'Mijn verzekering weigert te betalen', desc: 'Weigering, schadeclaim' },
      { icon: '📄', bg: '#eff6ff', title: 'Ik heb iets verontrustends getekend', desc: 'Contract, NDA, overeenkomst' },
      { icon: '⚖️', bg: '#fdf4ff', title: 'Ik heb een dagvaarding ontvangen', desc: 'Vonnis, schuld, zitting' },
      { icon: '💳', bg: '#fff5f5', title: 'Er wordt een schuld van mij geëist', desc: 'Incassobureau, deurwaarder' },
      { icon: '💬', bg: '#f0fdf4', title: 'Andere juridische situatie', desc: 'Beschrijf uw probleem aan Archer' },
    ],
    noCase: 'Geen actief dossier geselecteerd',
    deleteConfirm: 'Dit dossier verwijderen? Dit kan niet ongedaan worden gemaakt.',
    noCaseSub: 'Selecteer een dossier in de zijbalk of open een nieuw dossier.',
    openedOn: 'Geopend op', docCount: 'documenten', updatedBy: 'Bijgewerkt door Archer',
    caseType: { housing: 'Huisvesting', employment: 'Werk', debt: 'Schulden', insurance: 'Verzekering', contract: 'Contract', consumer: 'Consument', family: 'Familie', court: 'Rechtbank', nda: 'NDA', penal: 'Strafrecht', commercial: 'Commercieel', other: 'Overig' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Deadline in',
    navDash: 'Dashboard', navUpload: 'Uploaden', navCases: 'Mijn dossiers', navLawyers: 'Advocaten', navDocs: 'Documenten', navChat: 'Juridische chat', navSettings: 'Instellingen',
    addDoc: 'Document toevoegen', talkLawyer: 'Praat met een advocaat',
    responseIn: 'Reactie in',
    brief: 'Download samenvatting', share: 'Delen',
    scoreHistory: 'Score Geschiedenis', outcomePred: 'Uitkomstvoorspelling',
    archerQ: 'Archer heeft verduidelijking nodig',
    jurisTitle: 'Recente rechtspraak — relevant voor uw dossier', whyMatters: 'Waarom dit belangrijk is',
    riskMonitor: 'Mis nooit een juridisch document', riskMonitorSub: 'Verbind uw inbox — Archer bewaakt en waarschuwt u direct',
    connectGmail: 'Verbind Gmail', connectOutlook: 'Verbind Outlook',
    shareTitle: 'Deel dit dossier — alleen-lezen', shareDesc: 'Genereer een beveiligde link', shareCopy: 'Link kopiëren', shareExpiry: 'Link verloopt in',
    genLetter: 'Brief genereren', downloading: 'Genereren...', close: 'Sluiten', downloadPdf: 'Download PDF',
    moreQuestions: 'Archer heeft meer vragen — stel ze direct',
    updatingAnalysis: 'Archer werkt uw analyse bij...',
  },
};

const getLang = (u) => {
  const lang = u?.language || 'en';
  if (lang === 'nl') return 'nl';
  if (lang === 'fr' || lang === 'fr-BE') return 'fr';
  return 'en';
};

/* ── Helpers ── */
const riskColor = (s) => s >= 70 ? '#dc2626' : s >= 40 ? '#f59e0b' : s > 0 ? '#16a34a' : '#9ca3af';
const daysUntil = (d) => { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); };

const formatDate = (d, lang) => {
  if (!d) return '';
  const dt = new Date(d);
  return lang === 'en'
    ? dt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : lang === 'nl'
      ? dt.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
      : dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const pulse = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;

const Dashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const lang = getLang(user);
  const t = L[lang] || L.en;

  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [letterFormStep, setLetterFormStep] = useState(null);
  const [letterTone, setLetterTone] = useState('citizen');
  const [attorneyModalStep, setAttorneyModalStep] = useState(null);
  const [shareModal, setShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [jqAnswered, setJqAnswered] = useState(false);
  const [jqImpact, setJqImpact] = useState(null);
  const [jqSelectedAnswer, setJqSelectedAnswer] = useState(null);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [chatDrawer, setChatDrawer] = useState(null);
  const [analysisToast, setAnalysisToast] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const prevSelectedStatusRef = React.useRef(null);

  const jurisdiction = user?.jurisdiction || user?.country || 'US';

  const handleJurisdictionSwitch = async (j) => {
    if (j === jurisdiction) return;
    updateUser({ jurisdiction: j, country: j });
    try { await axios.put(`${API}/profile`, { jurisdiction: j, country: j }, { withCredentials: true }); } catch (e) { console.error('Jurisdiction switch error:', e); }
    if (!hasSeenOnboarding(j)) setOnboarding(j);
  };

  const fetchCases = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cases`, { withCredentials: true });
      const sorted = (res.data || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setCases(sorted);
      // V7: no auto-selection — case detail lives at /cases/:caseId
    } catch (e) { console.error('Fetch cases error:', e); }
    setLoading(false);
  }, []);

  // Re-fetch and reset selection when jurisdiction changes
  useEffect(() => {
    setSelectedId(null);
    setCases([]);
    setLoading(true);
    fetchCases();
  }, [jurisdiction, fetchCases]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // Polling: 2s when any case is analyzing
  useEffect(() => {
    const hasAnalyzing = cases.some(c => c.status === 'analyzing');
    if (!hasAnalyzing) return;
    const interval = setInterval(fetchCases, 2000);
    return () => clearInterval(interval);
  }, [cases, fetchCases]);

  // Detect when selected case finishes analysis
  useEffect(() => {
    const sc = cases.find(c => c.case_id === selectedId);
    const curStatus = sc?.status;
    if (prevSelectedStatusRef.current === 'analyzing' && curStatus === 'active') {
      setAnalysisToast({ score: sc?.risk_score || 0 });
      setTimeout(() => setAnalysisToast(null), 5000);
    }
    prevSelectedStatusRef.current = curStatus;
  }, [cases, selectedId]);

  // Reset Archer Q&A state when case selection changes
  useEffect(() => {
    setJqAnswered(false);
    setJqImpact(null);
    setJqSelectedAnswer(null);
  }, [selectedId]);


  const handleReanalyze = async () => {
    if (!selectedId || reanalyzing) return;
    setReanalyzing(true);
    try {
      await axios.post(`${API}/cases/${selectedId}/reanalyze`, {}, { withCredentials: true });
      await fetchCases();
    } catch (e) { /* rate limit or other error */ }
    setReanalyzing(false);
  };

  const handleArcherAnswer = async (answer) => {
    if (!sc?.archer_question || answerLoading) return;
    setAnswerLoading(true);
    setJqSelectedAnswer(answer);
    setJqAnswered(false);
    setJqImpact(null);
    try {
      const res = await axios.post(`${API}/cases/${selectedId}/archer-answer`, {
        question: sc.archer_question.text,
        answer: answer,
      }, { withCredentials: true });
      // Set impact FIRST before fetching new data
      const impactText = res.data?.impact_summary || null;
      setJqImpact(impactText);
      setJqAnswered(true);
      // Fetch updated case data (may include new question)
      await fetchCases();
    } catch (e) {
      console.error('Archer answer error:', e);
      setJqAnswered(true);
    }
    setAnswerLoading(false);
  };


  const handleDeleteCase = async (caseId) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await axios.delete(`${API}/cases/${caseId}`, { withCredentials: true });
      if (selectedId === caseId) setSelectedId(null);
      await fetchCases();
    } catch (e) { console.error('Delete case error:', e); }
  };

  const handleShare = async () => {
    setShareModal(true);
    try {
      const res = await axios.post(`${API}/cases/${selectedId}/share`, { expires_in_hours: 168 }, { withCredentials: true });
      setShareLink(`${window.location.origin}/shared/${res.data.share_id}`);
    } catch (e) { setShareLink(''); }
  };

  const handleBriefPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(sc?.title || 'Case Brief', 20, 20);
    doc.setFontSize(10);
    doc.text(`Risk Score: ${score}/100`, 20, 30);
    doc.text(`Type: ${t.caseType[sc?.type] || sc?.type || 'Other'}`, 20, 36);
    if (sc?.ai_summary) {
      const sumLines = doc.splitTextToSize(sc.ai_summary, 170);
      doc.text(sumLines, 20, 46);
    }
    let y = 60;
    findings.forEach((f, i) => {
      const txt = doc.splitTextToSize(`${i + 1}. ${f.text || ''}`, 170);
      doc.text(txt, 20, y);
      y += txt.length * 5 + 3;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`${sc?.title || 'case-brief'}.pdf`);
  };

  const sc = cases.find(c => c.case_id === selectedId);
  const isAnalyzing = sc?.status === 'analyzing';
  const findings = sc?.ai_findings || [];
  const steps = sc?.ai_next_steps || [];
  const bp = sc?.battle_preview;
  const docs = []; // documents are displayed from findings context
  const dl = daysUntil(sc?.deadline);
  const score = sc?.risk_score || 0;
  const scoreColor = riskColor(score);
  const riskText = score >= 70 ? t.riskHigh : score >= 40 ? t.riskMed : score > 0 ? t.riskLow : '—';
  const cType = sc?.type || 'other';
  const jq = sc?.archer_question;
  const history = sc?.risk_score_history || [];
  const caseLaw = sc?.recent_case_law || [];
  const prob = sc?.success_probability;

  return (
    <>
      <style>{pulse}</style>
      <div data-testid="dashboard-page" style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'grid', gridTemplateColumns: '260px 1fr 240px',
        background: '#f8f7f4', borderRadius: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: 'hidden',
      }}>

        {/* ═══ LEFT SIDEBAR ═══ */}
        <div data-testid="left-sidebar" style={{
          background: '#fff', borderRight: '0.5px solid #e2e0db',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Logo */}
          <div style={{ padding: '18px 14px 14px', borderBottom: '0.5px solid #f0ede8' }}>
            <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="logo-link">
              <img src="/logos/archer-logo-full-color.svg" alt="Archer" style={{ height: 42 }} />
            </div>
          </div>

          {/* Archer Card */}
          <div style={{ margin: 10, padding: 11, background: '#eff6ff', borderRadius: 11, border: '0.5px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>A</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>Archer</div>
                <div style={{ fontSize: 9, color: '#3b82f6' }}>{t.archerRole}</div>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto', animation: 'pulse 1.5s infinite' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {[[t.stat1, t.stat1l], [t.stat2, t.stat2l], [t.stat3, t.stat3l], [t.stat4, t.stat4l]].map(([v, l]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 6, padding: '5px 7px', fontSize: 9, color: '#1e40af', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#1a56db' }}>{v}</span>{l}
                </div>
              ))}
            </div>
          </div>

          {/* Nav Links (compact) */}
          <div style={{ padding: '4px 10px', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {[
              { icon: <Upload size={10} />, label: t.navUpload, to: '/upload' },
              { icon: <Scale size={10} />, label: t.navLawyers, to: '/lawyers' },
              { icon: <BookOpen size={10} />, label: t.navDocs, to: '/documents' },
              { icon: <MessageSquare size={10} />, label: t.navChat, to: '/chat' },
              { icon: <Settings size={10} />, label: t.navSettings, to: '/settings' },
            ].map((n) => (
              <button key={n.to} onClick={() => navigate(n.to)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', fontSize: 9, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 5 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8f7f4'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                {n.icon}{n.label}
              </button>
            ))}
          </div>

          {/* Active Cases Section */}
          <div style={{ padding: '8px 14px 4px', fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.activeCases}</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cases.map(c => {
              const isActive = c.case_id === selectedId;
              const cScore = c.risk_score || 0;
              const cColor = riskColor(cScore);
              const cDl = daysUntil(c.deadline);
              const cTypeName = t.caseType[c.type] || t.caseType.other;
              return (
                <div key={c.case_id} data-testid={`case-item-${c.case_id}`}
                  onClick={() => navigate(`/cases/${c.case_id}`)}
                  style={{
                    margin: '2px 7px', padding: 9, borderRadius: 9, cursor: 'pointer',
                    border: isActive ? '0.5px solid #bfdbfe' : '0.5px solid transparent',
                    background: isActive ? '#eff6ff' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8f7f4'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.status === 'analyzing' ? '#f59e0b' : cColor, flexShrink: 0, marginTop: 3, animation: c.status === 'analyzing' ? 'pulse 1.5s infinite' : 'none' }} />
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a2e', flex: 1, lineHeight: 1.3 }}>{c.title || 'Untitled'}</div>
                    <button
                      data-testid={`delete-case-${c.case_id}`}
                      onClick={(e) => { e.stopPropagation(); handleDeleteCase(c.case_id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.3, transition: 'opacity 0.15s', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.3'; }}
                      title={t.deleteConfirm}
                    >
                      <Trash2 size={11} color="#dc2626" />
                    </button>
                    <div style={{ fontSize: 12, fontWeight: 800, color: c.status === 'analyzing' ? '#f59e0b' : cColor, whiteSpace: 'nowrap' }}>{c.status === 'analyzing' ? '...' : cScore > 0 ? cScore : '—'}</div>
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, marginLeft: 14 }}>{c.status === 'analyzing' ? (lang === 'fr' ? 'Archer analyse...' : lang === 'nl' ? 'Archer analyseert...' : 'Archer analyzing...') : `${cTypeName} · ${c.document_count || 0} ${t.docCount}`}</div>
                  {cDl !== null && (
                    <div style={{ fontSize: 9, fontWeight: 500, marginTop: 2, marginLeft: 14, color: cDl <= 3 ? '#dc2626' : cDl <= 14 ? '#f59e0b' : '#6b7280' }}>
                      {cDl <= 0 ? `⚡ ${t.expired}` : `${cDl <= 7 ? '⚡ ' : ''}${t.deadlineIn} ${cDl} ${t.days}`}
                    </div>
                  )}
                </div>
              );
            })}
            {cases.length === 0 && !loading && (
              <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 9, color: '#9ca3af' }}>{t.noCase}</div>
            )}
          </div>

          {/* Spacer + New Case Button */}
          <div style={{ padding: 10 }}>
            <button data-testid="new-case-btn" onClick={() => setShowOverlay(true)} style={{
              width: '100%', padding: '10px 0', background: '#1a56db', color: '#fff',
              border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Plus size={13} />{t.newCase}
            </button>
          </div>

          {/* Logout */}
          <button onClick={() => { logout(); navigate('/login'); }} style={{
            padding: '8px 14px', fontSize: 9, color: '#9ca3af', background: 'none', border: 'none',
            borderTop: '0.5px solid #f0ede8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <LogOut size={10} />{lang === 'fr' ? 'Déconnexion' : lang === 'nl' ? 'Uitloggen' : 'Sign out'}
          </button>
        </div>

        {/* ═══ MAIN CENTER ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Global Top Bar: Back + Jurisdiction + Language */}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '6px 20px',
            background: '#fff', borderBottom: '0.5px solid #f0ede8',
          }}>
            <button onClick={() => window.history.back()} data-testid="back-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9ca3af', fontWeight: 500, marginRight: 12, display: 'flex', alignItems: 'center', gap: 3 }}>← Back</button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <JurisdictionPills jurisdiction={jurisdiction} language={user?.language} onSwitch={handleJurisdictionSwitch} onLanguageChange={async (l) => { updateUser({ language: l }); try { await axios.put(`${API}/profile`, { language: l }, { withCredentials: true }); } catch {} }} />
            </div>
          </div>
          {/* Top Bar with Archer Banner + Actions */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px',
            background: '#fff', borderBottom: '0.5px solid #f0ede8',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>A</div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{t.archerBanner}</div>
                <div style={{ fontSize: 9, color: '#6b7280' }}>{t.archerSub}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {sc && <button onClick={handleBriefPdf} data-testid="brief-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}><Download size={11} />{t.brief}</button>}
              {sc && <button onClick={handleShare} data-testid="share-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}><Share2 size={11} />{t.share}</button>}
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '0.5px solid #bfdbfe' }}>{t.credSources}</div>
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#f0fdf4', color: '#15803d', border: '0.5px solid #86efac' }}>{t.credLive}</div>
              {sc && score >= 70 && <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#fff5f5', color: '#dc2626', border: '0.5px solid #fca5a5' }}>⚡ {t.credUrgent}</div>}
              {/* Phase 2 — Notifications bell */}
              <div style={{ marginLeft: 4, color: '#374151' }}>
                <NotificationBell language={lang} />
              </div>
            </div>
          </div>

          {/* Case View — V7: card grid overview, detail lives at /cases/:caseId */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <LetterReadyBanner language={lang} />
            {cases.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>A</div>
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
                  {lang === 'fr' ? 'Bienvenue. Quelle est votre situation juridique ?' : lang === 'nl' ? 'Welkom. Wat is uw juridische situatie?' : 'Welcome. What\'s your legal situation?'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
                  {lang === 'fr' ? 'Archer analysera n\'importe quel document en 60 secondes.' : lang === 'nl' ? 'Archer analyseert elk document in 60 seconden.' : 'Archer will analyze any document in 60 seconds.'}
                </div>
                <button onClick={() => setShowOverlay(true)} data-testid="empty-state-new-case-btn" style={{
                  padding: '12px 32px', background: '#1a56db', color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}><Plus size={16} />{t.newCase}</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                  {t.activeCases}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>
                  {lang === 'fr' ? 'Cliquez sur un dossier pour voir l\'analyse complète.' : lang === 'nl' ? 'Klik op een dossier voor de volledige analyse.' : 'Click a case to view the full analysis.'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {cases.map(c => {
                    const cScore = c.risk_score || 0;
                    const cColor = riskColor(cScore);
                    const cDl = daysUntil(c.deadline);
                    const cTypeName = t.caseType[c.type] || t.caseType.other;
                    const isAnalyzingCase = c.status === 'analyzing';
                    return (
                      <div
                        key={c.case_id}
                        data-testid={`case-card-${c.case_id}`}
                        onClick={() => navigate(`/cases/${c.case_id}`)}
                        style={{
                          background: '#fff', borderRadius: 12, padding: 16, cursor: 'pointer',
                          border: '0.5px solid #e2e0db', transition: 'box-shadow 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,86,219,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 600, background: '#fffbeb', border: '0.5px solid #fde68a', color: '#92400e' }}>
                            {(t.caseEmoji[c.type] || '📋')} {cTypeName}
                          </div>
                          {isAnalyzingCase ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
                              <Loader2 size={12} className="animate-spin" /> {lang === 'fr' ? 'Analyse...' : 'Analyzing...'}
                            </div>
                          ) : (
                            <div style={{ fontSize: 28, fontWeight: 800, color: cColor, lineHeight: 1 }}>{cScore || '—'}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 4, lineHeight: 1.3 }}>{c.title || 'Untitled'}</div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>
                          {formatDate(c.created_at, lang)} · {c.document_count || 0} {t.docCount}
                        </div>
                        {cDl !== null && (
                          <div style={{ fontSize: 10, fontWeight: 600, color: cDl <= 3 ? '#dc2626' : cDl <= 14 ? '#f59e0b' : '#6b7280' }}>
                            {cDl <= 0 ? `${t.expired}` : `${cDl} ${t.days} ${t.before ? t.before.toLowerCase() : ''}`}
                          </div>
                        )}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#1a56db', fontWeight: 500 }}>
                          {lang === 'fr' ? 'Voir l\'analyse' : lang === 'nl' ? 'Bekijk analyse' : 'View analysis'} →
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — Quick stats ═══ */}
        <div data-testid="right-panel" style={{
          background: '#fff', borderLeft: '0.5px solid #e2e0db',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 14px 8px', fontSize: 10, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.3px' }}>{t.overview}</div>
          <div style={{ margin: '0 8px 8px', padding: 11, background: '#eff6ff', borderRadius: 9, border: '0.5px solid #bfdbfe' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1a56db', lineHeight: 1 }}>{cases.length}</div>
            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>{t.activeCases}</div>
          </div>
          {cases.filter(c => daysUntil(c.deadline) !== null && daysUntil(c.deadline) <= 7 && daysUntil(c.deadline) > 0).length > 0 && (
            <div style={{ margin: '0 8px 8px', padding: 11, background: '#fff5f5', borderRadius: 9, border: '0.5px solid #fca5a5' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>{t.critDeadline}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', margin: '4px 0' }}>
                {cases.filter(c => daysUntil(c.deadline) !== null && daysUntil(c.deadline) <= 7 && daysUntil(c.deadline) > 0).length} {lang === 'fr' ? 'dossiers' : 'cases'}
              </div>
            </div>
          )}
          <div style={{ padding: '8px 14px' }}>
            <button onClick={() => navigate('/upload')} style={{ width: '100%', padding: '10px 0', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Upload size={13} />{lang === 'fr' ? 'Nouveau document' : 'New document'}
            </button>
          </div>
        </div>

        {/* ═══ CHAT DRAWER ═══ */}
        {chatDrawer && selectedId && (
          <CaseChatDrawer
            caseId={selectedId}
            caseTitle={sc?.title}
            lang={lang}
            onClose={() => setChatDrawer(null)}
            initialMessage={chatDrawer.initial}
            archerQuestion={chatDrawer.archerQuestion}
            lastAnswer={chatDrawer.lastAnswer}
          />
        )}

        {/* ═══ ADD DOCUMENT MODAL ═══ */}
        {showAddDoc && selectedId && (
          <AddDocumentModal
            caseId={selectedId}
            lang={lang}
            onClose={() => setShowAddDoc(false)}
            onUploadComplete={() => {
              setShowAddDoc(false);
              prevSelectedStatusRef.current = 'analyzing';
              // Mark selected case as analyzing locally so polling kicks in immediately
              setCases(prev => prev.map(c => c.case_id === selectedId ? { ...c, status: 'analyzing' } : c));
              fetchCases();
            }}
          />
        )}

        {/* ═══ LETTER FORM MODAL ═══ */}
        {/* ═══ ATTORNEY LETTER MODAL ═══ */}
        {attorneyModalStep && selectedId && (
          <AttorneyLetterModal
            caseData={sc}
            lang={lang}
            jurisdiction={jurisdiction}
            opposingPartyName={sc?.opposing_party_name}
            onClose={() => setAttorneyModalStep(null)}
            onGenerateFree={() => { setLetterTone('citizen'); setLetterFormStep(attorneyModalStep); setAttorneyModalStep(null); }}
            onOrderAttorney={() => { setLetterTone('attorney'); setLetterFormStep(attorneyModalStep); setAttorneyModalStep(null); }}
          />
        )}

        {/* ═══ LETTER FORM MODAL ═══ */}
        {letterFormStep && selectedId && (
          <LetterFormModal
            step={letterFormStep}
            caseId={selectedId}
            caseData={sc}
            userName={user?.name}
            userEmail={user?.email}
            userAddress={user?.address}
            lang={lang}
            tone={letterTone}
            onClose={() => setLetterFormStep(null)}
            onOpenChat={(msg) => setChatDrawer({ initial: msg })}
            onNavigate={(path) => navigate(path)}
          />
        )}

        {/* ═══ SHARE MODAL ═══ */}
        {shareModal && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div data-testid="share-modal" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{t.shareTitle}</div>
                <button onClick={() => setShareModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>{t.shareDesc}</div>
              {shareLink ? (
                <>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input readOnly value={shareLink} style={{ flex: 1, padding: '8px 10px', background: '#f8f7f4', border: '0.5px solid #e2e0db', borderRadius: 7, fontSize: 10, color: '#374151' }} />
                    <button onClick={() => { navigator.clipboard.writeText(shareLink); }} style={{ padding: '8px 14px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>{t.shareCopy}</button>
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 6 }}>{t.shareExpiry}: 7 {t.days}</div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}><Loader2 size={16} className="animate-spin" style={{ color: '#1a56db' }} /></div>
              )}
            </div>
          </div>
        )}

        {/* ═══ OVERLAY ═══ */}
        {showOverlay && (
          <div data-testid="new-case-overlay" style={{
            position: 'absolute', inset: 0, background: 'rgba(248,247,244,0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e2e0db', padding: 24, width: '100%', maxWidth: 680 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>A</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>{t.overlayTitle}</div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 20 }}>{t.overlaySub}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {t.sit.map((s) => (
                  <div key={s.title} data-testid={`situation-card-${s.title}`}
                    onClick={() => { setShowOverlay(false); navigate('/upload'); }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: 11, borderRadius: 10,
                      border: '0.5px solid #e2e0db', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e0db'; }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 9, color: '#6b7280', lineHeight: 1.3 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button data-testid="back-to-dashboard" onClick={() => setShowOverlay(false)} style={{
                marginTop: 14, fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
              }}>← {t.backDash}</button>
            </div>
          </div>
        )}

        {/* ═══ JURISDICTION ONBOARDING ═══ */}
        {onboarding && (
          <JurisdictionOnboarding
            jurisdiction={onboarding}
            lang={lang}
            onClose={() => setOnboarding(null)}
          />
        )}

        {/* ═══ ANALYSIS COMPLETE TOAST ═══ */}
        {analysisToast && (
          <div data-testid="analysis-toast" style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
            background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 10,
            fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out',
          }}>
            <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
            ✓ {lang === 'fr' ? 'Analyse terminée — Score de risque mis à jour' : lang === 'nl' ? 'Analyse voltooid — Risicoscore bijgewerkt' : 'Analysis complete — Risk Score updated'}
            {analysisToast.score > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>{analysisToast.score}/100</span>}
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
