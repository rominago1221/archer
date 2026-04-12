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
import AttorneyLetterModal from '../components/AttorneyLetterModal';
import JurisdictionPills from '../components/JurisdictionPills';
import JurisdictionOnboarding, { hasSeenOnboarding } from '../components/JurisdictionOnboarding';
import AnalysisFindings from '../components/AnalysisFindings';
import { formatBoldText } from '../utils/sanitize';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Language ── */
const L = {
  en: {
    tagline: 'Your virtual legal cabinet',
    jamesRole: 'Senior Legal Advisor',
    stat1: '847K+', stat1l: 'live sources',
    stat2: '20 yrs', stat2l: 'experience',
    stat3: 'Live', stat3l: 'case law',
    stat4: '#1', stat4l: 'Legal AI',
    activeCases: 'Active cases',
    newCase: 'Open a new case',
    jamesBanner: 'James is analyzing your case in real time',
    jamesSub: 'Legal AI · 20 years senior experience · Live case law',
    credSources: '847K+ sources', credLive: 'Live', credUrgent: 'Urgent',
    riskLabel: 'Jasper Risk Score',
    riskHigh: 'High risk', riskMed: 'Medium risk', riskLow: 'Low risk',
    dimFin: 'Financial', dimUrg: 'Urgency', dimLeg: 'Legal', dimCom: 'Complexity',
    analysisTitle: 'James Analysis — Real-time update',
    live: 'Live',
    questionTitle: 'James needs clarification',
    questionFallback: 'Upload additional documents to strengthen your case analysis.',
    btnYes: 'Yes', btnNo: 'No', btnPartial: 'Partially',
    overview: 'Overview',
    critDeadline: 'Critical deadline',
    days: 'days', expired: 'Expired', before: 'Before',
    nextActions: 'Next actions',
    documents: 'Documents', keyDoc: 'Key',
    battleTitle: 'James vs Opposing counsel',
    yourArgs: 'Your arguments', theirArgs: 'Their arguments',
    overlayTitle: 'What is your problem?',
    overlaySub: 'James will handle your case immediately.',
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
      { icon: '💬', bg: '#f0fdf4', title: 'Other legal situation', desc: 'Describe your problem to James' },
    ],
    noCase: 'No active case selected',
    deleteConfirm: 'Delete this case? This cannot be undone.',
    noCaseSub: 'Select a case from the sidebar or open a new one.',
    openedOn: 'Opened', docCount: 'documents', updatedBy: 'Updated by James',
    caseType: { housing: 'Housing', employment: 'Employment', debt: 'Debt', insurance: 'Insurance', contract: 'Contract', consumer: 'Consumer', family: 'Family', court: 'Court', nda: 'NDA', penal: 'Criminal', commercial: 'Commercial', other: 'Other' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Deadline in',
    navDash: 'Dashboard', navUpload: 'Upload', navCases: 'My cases', navLawyers: 'Lawyers', navDocs: 'Documents', navChat: 'Legal chat', navSettings: 'Settings',
    addDoc: 'Add document', talkLawyer: 'Talk to a lawyer',
    responseIn: 'Response in',
    brief: 'Download brief', share: 'Share',
    scoreHistory: 'Score History', outcomePred: 'Outcome Predictor',
    jamesQ: 'James needs clarification',
    jurisTitle: 'Recent legal updates — relevant to your case', whyMatters: 'Why this matters',
    riskMonitor: 'Never miss a legal document', riskMonitorSub: 'Connect your inbox — James monitors it and alerts you instantly',
    connectGmail: 'Connect Gmail', connectOutlook: 'Connect Outlook',
    shareTitle: 'Share this case — read-only access', shareDesc: 'Generate a secure link', shareCopy: 'Copy link', shareExpiry: 'Link expires in',
    genLetter: 'Generate letter', downloading: 'Generating...', close: 'Close', downloadPdf: 'Download PDF',
    moreQuestions: 'James has more questions — ask him directly',
    updatingAnalysis: 'James is updating your analysis...',
  },
  fr: {
    tagline: 'Votre cabinet juridique virtuel',
    jamesRole: 'Conseiller juridique senior',
    stat1: '847K+', stat1l: 'sources live',
    stat2: '20 ans', stat2l: 'expérience',
    stat3: 'Live', stat3l: 'jurisprudence',
    stat4: '#1', stat4l: 'IA juridique',
    activeCases: 'Dossiers actifs',
    newCase: 'Ouvrir un nouveau dossier',
    jamesBanner: 'James analyse votre dossier en temps réel',
    jamesSub: 'IA juridique · 20 ans d\'expérience senior · Jurisprudence live',
    credSources: '847K+ sources', credLive: 'Live', credUrgent: 'Urgent',
    riskLabel: 'Score de risque Jasper',
    riskHigh: 'Risque élevé', riskMed: 'Risque modéré', riskLow: 'Risque faible',
    dimFin: 'Financier', dimUrg: 'Urgence', dimLeg: 'Juridique', dimCom: 'Complexité',
    analysisTitle: 'Analyse de James — Mise à jour en temps réel',
    live: 'Live',
    questionTitle: 'James a besoin d\'une précision',
    questionFallback: 'Téléversez des documents supplémentaires pour renforcer l\'analyse de votre dossier.',
    btnYes: 'Oui', btnNo: 'Non', btnPartial: 'Partiellement',
    overview: 'Vue d\'ensemble',
    critDeadline: 'Échéance critique',
    days: 'jours', expired: 'Expiré', before: 'Avant le',
    nextActions: 'Prochaines actions',
    documents: 'Documents', keyDoc: 'Clé',
    battleTitle: 'James vs Avocat adverse',
    yourArgs: 'Vos arguments', theirArgs: 'Leurs arguments',
    overlayTitle: 'Quel est votre problème ?',
    overlaySub: 'James va prendre votre dossier en charge immédiatement.',
    backDash: 'Retour au dashboard',
    sit: [
      { icon: '🏠', bg: '#fef3c7', title: 'Mon propriétaire me cause des problèmes', desc: 'Expulsion, loyer, réparations, dépôt' },
      { icon: '⚡', bg: '#fff5f5', title: 'J\'ai reçu une lettre menaçante', desc: 'Mise en demeure, avocat, huissier' },
      { icon: '💼', bg: '#f0fdf4', title: 'Mon employeur me pose des problèmes', desc: 'Licenciement, salaires, harcèlement' },
      { icon: '🛡️', bg: '#fff7ed', title: 'Mon assurance refuse de payer', desc: 'Refus de remboursement, sinistre' },
      { icon: '📄', bg: '#eff6ff', title: 'J\'ai signé quelque chose d\'inquiétant', desc: 'Contrat, NDA, accord, engagement' },
      { icon: '⚖️', bg: '#fdf4ff', title: 'J\'ai reçu une convocation au tribunal', desc: 'Jugement, dette, citation, audience' },
      { icon: '💳', bg: '#fff5f5', title: 'On me réclame une dette', desc: 'Collecteur, huissier, recouvrement' },
      { icon: '💬', bg: '#f0fdf4', title: 'Autre situation juridique', desc: 'Décrivez votre problème à James' },
    ],
    noCase: 'Aucun dossier actif sélectionné',
    deleteConfirm: 'Supprimer ce dossier ? Cette action est irréversible.',
    noCaseSub: 'Sélectionnez un dossier dans la barre latérale ou ouvrez-en un nouveau.',
    openedOn: 'Ouvert le', docCount: 'documents', updatedBy: 'Mis à jour par James',
    caseType: { housing: 'Logement', employment: 'Emploi', debt: 'Dettes', insurance: 'Assurance', contract: 'Contrat', consumer: 'Consommation', family: 'Famille', court: 'Tribunal', nda: 'NDA', penal: 'Pénal', commercial: 'Commercial', other: 'Autre' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Échéance dans',
    navDash: 'Dashboard', navUpload: 'Téléverser', navCases: 'Mes dossiers', navLawyers: 'Avocats', navDocs: 'Documents', navChat: 'Chat juridique', navSettings: 'Paramètres',
    addDoc: 'Ajouter un document', talkLawyer: 'Parler à un avocat',
    responseIn: 'Réponse dans',
    brief: 'Télécharger le résumé', share: 'Partager',
    scoreHistory: 'Historique du score', outcomePred: 'Prédiction d\'issue',
    jamesQ: 'James a besoin d\'une précision',
    jurisTitle: 'Jurisprudence récente — pertinente pour votre dossier', whyMatters: 'Pertinence',
    riskMonitor: 'Ne ratez jamais un document juridique', riskMonitorSub: 'Connectez votre boîte mail — James la surveille et vous alerte instantanément',
    connectGmail: 'Connecter Gmail', connectOutlook: 'Connecter Outlook',
    shareTitle: 'Partager ce dossier — accès en lecture seule', shareDesc: 'Générer un lien sécurisé', shareCopy: 'Copier le lien', shareExpiry: 'Lien expire dans',
    genLetter: 'Générer la lettre', downloading: 'Génération...', close: 'Fermer', downloadPdf: 'Télécharger PDF',
    moreQuestions: 'James a d\'autres questions — demandez-lui directement',
    updatingAnalysis: 'James met à jour votre analyse...',
  },
  nl: {
    tagline: 'Uw virtueel juridisch kantoor',
    jamesRole: 'Senior Juridisch Adviseur',
    stat1: '847K+', stat1l: 'live bronnen',
    stat2: '20 jaar', stat2l: 'ervaring',
    stat3: 'Live', stat3l: 'rechtspraak',
    stat4: '#1', stat4l: 'Juridische AI',
    activeCases: 'Actieve dossiers',
    newCase: 'Nieuw dossier openen',
    jamesBanner: 'James analyseert uw dossier in realtime',
    jamesSub: 'Juridische AI · 20 jaar seniorervaring · Live rechtspraak',
    credSources: '847K+ bronnen', credLive: 'Live', credUrgent: 'Dringend',
    riskLabel: 'Jasper Risicoscore',
    riskHigh: 'Hoog risico', riskMed: 'Gemiddeld risico', riskLow: 'Laag risico',
    dimFin: 'Financieel', dimUrg: 'Urgentie', dimLeg: 'Juridisch', dimCom: 'Complexiteit',
    analysisTitle: 'Analyse van James — Realtime update',
    live: 'Live',
    questionTitle: 'James heeft verduidelijking nodig',
    questionFallback: 'Upload extra documenten om uw dossieranalyse te versterken.',
    btnYes: 'Ja', btnNo: 'Nee', btnPartial: 'Gedeeltelijk',
    overview: 'Overzicht',
    critDeadline: 'Kritieke deadline',
    days: 'dagen', expired: 'Verlopen', before: 'Voor',
    nextActions: 'Volgende acties',
    documents: 'Documenten', keyDoc: 'Sleutel',
    battleTitle: 'James vs Tegenpartij',
    yourArgs: 'Uw argumenten', theirArgs: 'Hun argumenten',
    overlayTitle: 'Wat is uw probleem?',
    overlaySub: 'James neemt uw dossier onmiddellijk in behandeling.',
    backDash: 'Terug naar dashboard',
    sit: [
      { icon: '🏠', bg: '#fef3c7', title: 'Mijn verhuurder veroorzaakt problemen', desc: 'Uitzetting, huur, reparaties, borg' },
      { icon: '⚡', bg: '#fff5f5', title: 'Ik heb een dreigbrief ontvangen', desc: 'Aanmaning, advocaat, deurwaarder' },
      { icon: '💼', bg: '#f0fdf4', title: 'Mijn werkgever veroorzaakt problemen', desc: 'Ontslag, lonen, pesterijen' },
      { icon: '🛡️', bg: '#fff7ed', title: 'Mijn verzekering weigert te betalen', desc: 'Weigering, schadeclaim' },
      { icon: '📄', bg: '#eff6ff', title: 'Ik heb iets verontrustends getekend', desc: 'Contract, NDA, overeenkomst' },
      { icon: '⚖️', bg: '#fdf4ff', title: 'Ik heb een dagvaarding ontvangen', desc: 'Vonnis, schuld, zitting' },
      { icon: '💳', bg: '#fff5f5', title: 'Er wordt een schuld van mij geëist', desc: 'Incassobureau, deurwaarder' },
      { icon: '💬', bg: '#f0fdf4', title: 'Andere juridische situatie', desc: 'Beschrijf uw probleem aan James' },
    ],
    noCase: 'Geen actief dossier geselecteerd',
    deleteConfirm: 'Dit dossier verwijderen? Dit kan niet ongedaan worden gemaakt.',
    noCaseSub: 'Selecteer een dossier in de zijbalk of open een nieuw dossier.',
    openedOn: 'Geopend op', docCount: 'documenten', updatedBy: 'Bijgewerkt door James',
    caseType: { housing: 'Huisvesting', employment: 'Werk', debt: 'Schulden', insurance: 'Verzekering', contract: 'Contract', consumer: 'Consument', family: 'Familie', court: 'Rechtbank', nda: 'NDA', penal: 'Strafrecht', commercial: 'Commercieel', other: 'Overig' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Deadline in',
    navDash: 'Dashboard', navUpload: 'Uploaden', navCases: 'Mijn dossiers', navLawyers: 'Advocaten', navDocs: 'Documenten', navChat: 'Juridische chat', navSettings: 'Instellingen',
    addDoc: 'Document toevoegen', talkLawyer: 'Praat met een advocaat',
    responseIn: 'Reactie in',
    brief: 'Download samenvatting', share: 'Delen',
    scoreHistory: 'Score Geschiedenis', outcomePred: 'Uitkomstvoorspelling',
    jamesQ: 'James heeft verduidelijking nodig',
    jurisTitle: 'Recente rechtspraak — relevant voor uw dossier', whyMatters: 'Waarom dit belangrijk is',
    riskMonitor: 'Mis nooit een juridisch document', riskMonitorSub: 'Verbind uw inbox — James bewaakt en waarschuwt u direct',
    connectGmail: 'Verbind Gmail', connectOutlook: 'Verbind Outlook',
    shareTitle: 'Deel dit dossier — alleen-lezen', shareDesc: 'Genereer een beveiligde link', shareCopy: 'Link kopiëren', shareExpiry: 'Link verloopt in',
    genLetter: 'Brief genereren', downloading: 'Genereren...', close: 'Sluiten', downloadPdf: 'Download PDF',
    moreQuestions: 'James heeft meer vragen — stel ze direct',
    updatingAnalysis: 'James werkt uw analyse bij...',
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
      setSelectedId(prev => (sorted.length > 0 && !prev) ? sorted[0].case_id : prev);
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

  // Reset James Q&A state when case selection changes
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

  const handleJamesAnswer = async (answer) => {
    if (!sc?.james_question || answerLoading) return;
    setAnswerLoading(true);
    setJqSelectedAnswer(answer);
    setJqAnswered(false);
    setJqImpact(null);
    try {
      const res = await axios.post(`${API}/cases/${selectedId}/james-answer`, {
        question: sc.james_question.text,
        answer: answer,
      }, { withCredentials: true });
      // Set impact FIRST before fetching new data
      const impactText = res.data?.impact_summary || null;
      setJqImpact(impactText);
      setJqAnswered(true);
      // Fetch updated case data (may include new question)
      await fetchCases();
    } catch (e) {
      console.error('James answer error:', e);
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
  const jq = sc?.james_question;
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
            <div onClick={() => navigate('/')} style={{ fontSize: 19, fontWeight: 500, color: '#1a1a2e', letterSpacing: '0.3px', cursor: 'pointer' }} data-testid="logo-link">
              Jas<span style={{ color: '#1a56db' }}>per</span>
            </div>
            <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{t.tagline}</div>
          </div>

          {/* James Card */}
          <div style={{ margin: 10, padding: 11, background: '#eff6ff', borderRadius: 11, border: '0.5px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>J</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>James</div>
                <div style={{ fontSize: 9, color: '#3b82f6' }}>{t.jamesRole}</div>
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
                  onClick={() => setSelectedId(c.case_id)}
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
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, marginLeft: 14 }}>{c.status === 'analyzing' ? (lang === 'fr' ? 'James analyse...' : lang === 'nl' ? 'James analyseert...' : 'James analyzing...') : `${cTypeName} · ${c.document_count || 0} ${t.docCount}`}</div>
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
          {/* Top Bar with James Banner + Actions */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px',
            background: '#fff', borderBottom: '0.5px solid #f0ede8',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>J</div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{t.jamesBanner}</div>
                <div style={{ fontSize: 9, color: '#6b7280' }}>{t.jamesSub}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {sc && <button onClick={handleBriefPdf} data-testid="brief-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}><Download size={11} />{t.brief}</button>}
              {sc && <button onClick={handleShare} data-testid="share-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}><Share2 size={11} />{t.share}</button>}
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '0.5px solid #bfdbfe' }}>{t.credSources}</div>
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#f0fdf4', color: '#15803d', border: '0.5px solid #86efac' }}>{t.credLive}</div>
              {sc && score >= 70 && <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#fff5f5', color: '#dc2626', border: '0.5px solid #fca5a5' }}>⚡ {t.credUrgent}</div>}
            </div>
          </div>

          {/* Case View */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {!sc ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>J</div>
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
                  {lang === 'fr' ? 'Bienvenue. Quelle est votre situation juridique ?' : lang === 'nl' ? 'Welkom. Wat is uw juridische situatie?' : 'Welcome. What\'s your legal situation?'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
                  {lang === 'fr' ? 'James analysera n\'importe quel document en 60 secondes.' : lang === 'nl' ? 'James analyseert elk document in 60 seconden.' : 'James will analyze any document in 60 seconds.'}
                </div>
                <button onClick={() => setShowOverlay(true)} data-testid="empty-state-new-case-btn" style={{
                  padding: '12px 32px', background: '#1a56db', color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}><Plus size={16} />{t.newCase}</button>
              </div>
            ) : isAnalyzing && score === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>⚖️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                  {lang === 'fr' ? 'James analyse votre document...' : lang === 'nl' ? 'James analyseert uw document...' : 'James is analyzing your document...'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {lang === 'fr' ? 'Cela prend environ 60 secondes. Les résultats apparaîtront automatiquement.' : lang === 'nl' ? 'Dit duurt ongeveer 60 seconden. Resultaten verschijnen automatisch.' : 'This takes about 60 seconds. Results will appear automatically.'}
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 4, justifyContent: 'center' }}>
                  {[0,1,2,3,4].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a56db', animation: `pulse 1.5s infinite ${i*0.3}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Re-analyzing banner */}
                {isAnalyzing && score > 0 && (
                  <div data-testid="reanalyzing-banner" style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 10,
                    background: '#eff6ff', borderRadius: 10, border: '0.5px solid #bfdbfe',
                  }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: '#1a56db' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1e40af' }}>
                      {lang === 'fr' ? 'James ré-analyse votre dossier complet...' : lang === 'nl' ? 'James heranalyseert uw volledig dossier...' : 'James is re-analyzing your complete case...'}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>{[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#1a56db', animation: `pulse 1.5s infinite ${i*0.3}s` }} />)}</div>
                  </div>
                )}
                {/* Case type badge + title */}
                <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#fffbeb', border: '0.5px solid #fde68a', color: '#92400e', marginBottom: 8 }}>
                  {(t.caseEmoji[cType] || '📋')} {lang === 'fr' ? 'Dossier' : lang === 'nl' ? 'Dossier' : 'Case'} {t.caseType[cType] || cType}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{sc.title}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{t.openedOn} {formatDate(sc.created_at, lang)}</span>
                  <span style={{ color: '#d1d5db' }}>·</span>
                  <span>{sc.document_count || 0} {t.docCount}</span>
                  <span style={{ color: '#d1d5db' }}>·</span>
                  <span>{t.updatedBy}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowAddDoc(true)} style={{ fontSize: 9, padding: '4px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }} data-testid="add-doc-btn">{t.addDoc}</button>
                    <button onClick={() => navigate('/lawyers')} style={{ fontSize: 9, padding: '4px 10px', background: '#1a56db', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#fff' }} data-testid="talk-lawyer-btn">{t.talkLawyer}</button>
                    {score <= 0 && <button onClick={handleReanalyze} disabled={reanalyzing} style={{ fontSize: 9, padding: '4px 10px', background: reanalyzing ? '#9ca3af' : '#16a34a', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#fff' }} data-testid="reanalyze-btn">{reanalyzing ? '...' : (lang === 'fr' ? 'Ré-analyser' : lang === 'nl' ? 'Heranalyse' : 'Re-analyze')}</button>}
                  </span>
                </div>

                {/* Risk Score Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center', background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{t.riskLabel}</div>
                    <div data-testid="risk-score-big" style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, lineHeight: 1, color: scoreColor }}>{score || '—'}</div>
                    <div style={{ fontSize: 9, color: scoreColor, fontWeight: 600, marginTop: 2 }}>{riskText}</div>
                  </div>
                  <div>
                    <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 9 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: scoreColor, width: `${score}%`, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                      {[
                        [sc.risk_financial, t.dimFin],
                        [sc.risk_urgency, t.dimUrg],
                        [sc.risk_legal_strength, t.dimLeg],
                        [sc.risk_complexity, t.dimCom],
                      ].map(([v, label]) => (
                        <div key={label} style={{ background: '#f8f7f4', borderRadius: 7, padding: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: riskColor(v || 0) }}>{v || '—'}</div>
                          <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* James Analysis */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ position: 'relative', width: 32, height: 32, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      J
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff', animation: 'pulse 1.5s infinite' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0f' }}>{t.analysisTitle}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{sc?.title} · {sc?.type}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#16a34a' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                      {t.live}
                    </div>
                  </div>
                  {/* Optimistic loading banner */}
                  {answerLoading && (
                    <div data-testid="analysis-updating" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#eff6ff', borderRadius: 8, marginBottom: 10, border: '0.5px solid #bfdbfe' }}>
                      <div style={{ width: 14, height: 14, border: '2px solid #1a56db', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 10, fontWeight: 500, color: '#1a56db' }}>{t.updatingAnalysis}</span>
                    </div>
                  )}
                  {findings.length === 0 && <div style={{ fontSize: 11, color: '#9ca3af', padding: '10px 0' }}>{t.questionFallback}</div>}
                  <AnalysisFindings findings={findings} lang={lang} isCompact={true} />
                </div>

                {/* James Question Card — max 1 question */}
                {(jq || jqImpact) && (
                  <div data-testid="james-question" style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #fde68a', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1a1a2e', marginBottom: 5 }}>💬 {t.jamesQ}</div>
                    {/* Previous answer impact — shown after answer */}
                    {jqAnswered && jqImpact && (
                      <>
                        <div data-testid="james-impact" style={{ fontSize: 10, color: '#1a56db', lineHeight: 1.5, marginBottom: 8, padding: '6px 10px', background: '#eff6ff', borderRadius: 8, border: '0.5px solid #bfdbfe' }}>
                          <span style={{ fontWeight: 600 }}>James:</span> {jqImpact}
                        </div>
                        <button data-testid="ask-james-directly"
                          onClick={() => setChatDrawer({
                            initial: `${lang === 'fr' ? 'Mon dossier' : 'My case'}: "${sc?.title}". ${jqSelectedAnswer || ''}`,
                            jamesQuestion: jq?.text || '',
                            lastAnswer: jqSelectedAnswer,
                          })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#1a56db', fontWeight: 500, padding: 0, marginBottom: jq ? 10 : 0 }}>
                          {t.moreQuestions} →
                        </button>
                        {jq && <div style={{ borderTop: '0.5px solid #fde68a', marginTop: 4, paddingTop: 8 }} />}
                      </>
                    )}
                    {/* Current question */}
                    {jq && (
                      <>
                        <div style={{ fontSize: 11, color: '#78350f', lineHeight: 1.6, marginBottom: 8 }}>{jq.text}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(jq.options || []).slice(0, 4).map((opt, optIdx) => (
                            <button key={`jq-opt-${optIdx}-${opt.slice(0, 15)}`} data-testid={`james-answer-${optIdx}`}
                              onClick={() => handleJamesAnswer(opt)}
                              disabled={answerLoading}
                              style={{
                                padding: '6px 14px',
                                background: answerLoading ? '#f3f4f6' : '#fff',
                                color: answerLoading ? '#9ca3af' : '#1a1a2e',
                                border: '0.5px solid #e2e0db',
                                borderRadius: 8, fontSize: 10, fontWeight: 500,
                                cursor: answerLoading ? 'default' : 'pointer',
                              }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {/* Fallback: key_insight */}
                {!jq && sc.key_insight && (
                  <div style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #fde68a', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1a1a2e', marginBottom: 5 }}>💬 {t.questionTitle}</div>
                    <div style={{ fontSize: 10, color: '#78350f', lineHeight: 1.6 }}>{sc.key_insight}</div>
                  </div>
                )}

                {/* Score History */}
                {history.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 10, border: '1px solid #e2e0db' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 12 }}>{t.scoreHistory}</div>
                    <svg viewBox="0 0 460 160" style={{ width: '100%', height: 120 }}>
                      {[0, 25, 50, 75, 100].map(v => {
                        const y = 130 - (v / 100) * 110;
                        return <g key={v}>
                          <line x1={40} y1={y} x2={440} y2={y} stroke="#f0f0f0" strokeWidth="0.5" strokeDasharray="4,3" />
                          <text x={35} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{v}</text>
                        </g>;
                      })}
                      {history.map((h, hIdx) => {
                        const x = history.length === 1 ? 240 : 50 + (hIdx / (history.length - 1)) * 380;
                        const y = 130 - (h.score / 100) * 110;
                        const c = h.score <= 30 ? '#16a34a' : h.score <= 60 ? '#f59e0b' : '#dc2626';
                        const lineColor = history[history.length - 1].score <= 30 ? '#16a34a' : history[history.length - 1].score <= 60 ? '#f59e0b' : '#dc2626';
                        const prevX = hIdx > 0 ? (history.length === 1 ? 240 : 50 + ((hIdx - 1) / (history.length - 1)) * 380) : x;
                        const prevY = hIdx > 0 ? 130 - (history[hIdx - 1].score / 100) * 110 : y;
                        const dt = h.date ? new Date(h.date) : null;
                        const label = dt ? `${dt.toLocaleString('en', { month: 'short' })} ${dt.getDate()}` : `#${hIdx + 1}`;
                        return <g key={h.date || `history-${hIdx}`}>
                          {hIdx > 0 && <line x1={prevX} y1={prevY} x2={x} y2={y} stroke={lineColor} strokeWidth="2" />}
                          <circle cx={x} cy={y} r="5" fill={c} stroke="#fff" strokeWidth="2" />
                          <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill={c}>{h.score}</text>
                          <text x={x} y={148} textAnchor="middle" fontSize="10" fill="#9ca3af">{label}</text>
                        </g>;
                      })}
                    </svg>
                  </div>
                )}

                {/* Battle Preview — Horizontal */}
                {bp && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', marginBottom: 10 }}>{t.battleTitle}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 9, padding: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#16a34a', marginBottom: 6 }}>{t.yourArgs}</div>
                        {(bp.user_side?.strongest_arguments || bp.user_side?.strong_arguments || bp.user_arguments || []).slice(0, 5).map((a, aIdx) => (
                          <div key={`ua-${aIdx}-${(typeof a === 'string' ? a : a.argument || '').slice(0, 15)}`} style={{ fontSize: 10, color: '#374151', padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>•</span>
                            <span>{typeof a === 'string' ? a : a.argument || a.text || ''}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#fff5f5', border: '0.5px solid #fca5a5', borderRadius: 9, padding: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#dc2626', marginBottom: 6 }}>{t.theirArgs}</div>
                        {(bp.opposing_side?.strongest_arguments || bp.opposing_side?.opposing_arguments || bp.opposing_arguments || []).slice(0, 5).map((a, aIdx) => (
                          <div key={`oa-${aIdx}-${(typeof a === 'string' ? a : a.argument || '').slice(0, 15)}`} style={{ fontSize: 10, color: '#374151', padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>•</span>
                            <span>{typeof a === 'string' ? a : a.argument || a.text || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Jurisprudence */}
                {caseLaw.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>{t.jurisTitle}</div>
                    {caseLaw.map((cl, clIdx) => (
                      <div key={cl.case_name || cl.court} style={{ padding: '8px 0', borderBottom: clIdx < caseLaw.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', flex: 1 }}>{cl.case_name}</div>
                          {cl.url && <a href={cl.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} color="#1a56db" /></a>}
                        </div>
                        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{cl.court} · {cl.date_filed}</div>
                        {cl.snippet && <div style={{ fontSize: 9, color: '#6b7280', marginTop: 3, lineHeight: 1.4 }}>{cl.snippet.substring(0, 150)}...</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Outcome Predictor */}
                {prob && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>{t.outcomePred}</div>
                    {[
                      { label: lang === 'fr' ? 'Résolution favorable' : lang === 'nl' ? 'Gunstige uitkomst' : 'Full resolution in your favor', pct: prob.full_resolution_in_favor || prob.resolution_favorable || prob.favorable || 0, color: '#16a34a' },
                      { label: lang === 'fr' ? 'Accord négocié' : lang === 'nl' ? 'Onderhandelde schikking' : 'Negotiated settlement', pct: prob.negotiated_settlement || prob.compromis_negocie || prob.settlement || 0, color: '#1a56db' },
                      { label: lang === 'fr' ? 'Résolution partielle' : lang === 'nl' ? 'Gedeeltelijk verlies' : 'Partial loss', pct: prob.partial_loss || prob.perte_partielle || prob.partial || 0, color: '#f59e0b' },
                      { label: lang === 'fr' ? 'Issue défavorable' : lang === 'nl' ? 'Volledig verlies' : 'Full loss', pct: prob.full_loss || prob.perte_totale || prob.unfavorable || 0, color: '#dc2626' },
                    ].map((o) => (
                      <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: '#374151', width: 160, flexShrink: 0 }}>{o.label}</div>
                        <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: o.color, width: `${o.pct}%`, transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: o.color, width: 32, textAlign: 'right' }}>{o.pct}%</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risk Monitor */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', marginBottom: 3 }}>{t.riskMonitor}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 10 }}>{t.riskMonitorSub}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ flex: 1, padding: '8px 0', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 8, fontSize: 10, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>📧 {t.connectGmail}</button>
                    <button style={{ flex: 1, padding: '8px 0', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 8, fontSize: 10, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>📨 {t.connectOutlook}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div data-testid="right-panel" style={{
          background: '#fff', borderLeft: '0.5px solid #e2e0db',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 14px 8px', fontSize: 10, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.3px' }}>{t.overview}</div>

          {/* Deadline */}
          {sc && sc.deadline && (
            <div style={{ margin: '0 8px 8px', padding: 11, background: '#fff5f5', borderRadius: 9, border: '0.5px solid #fca5a5' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.3px' }}>⚡ {t.critDeadline}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#dc2626', margin: '4px 0 2px' }}>
                {dl !== null ? (dl <= 0 ? t.expired : `${dl} ${t.days}`) : '—'}
              </div>
              <div style={{ fontSize: 9, color: '#991b1b' }}>{t.before} {formatDate(sc.deadline, lang)}</div>
            </div>
          )}

          {/* Next Actions */}
          <NextActionsPanel
            steps={steps}
            findings={findings}
            lang={lang}
            opposingPartyName={sc?.opposing_party_name}
            onLetterClick={(s) => setAttorneyModalStep(s)}
            onCallClick={() => navigate('/lawyers')}
          />

          {/* Documents */}
          <div style={{ padding: '8px 14px 4px', fontSize: 9, fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.documents}</div>
          {sc ? (
            <div style={{ margin: '0 8px' }}>
              {(sc.document_count || 0) > 0 ? (
                <div onClick={() => navigate(`/cases/${sc.case_id}`)} style={{
                  padding: '6px 8px', borderRadius: 7, border: '0.5px solid #e2e0db',
                  display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', marginBottom: 4,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f7f4'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={11} color="#1a56db" />
                  </div>
                  <div style={{ fontSize: 10, color: '#374151', fontWeight: 500, flex: 1 }}>{sc.document_count || 0} {t.docCount}</div>
                  <div style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 600 }}>{t.keyDoc}</div>
                </div>
              ) : (
                <div style={{ padding: 8, fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>—</div>
              )}
            </div>
          ) : (
            <div style={{ padding: 8, margin: '0 8px', fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>—</div>
          )}
        </div>

        {/* ═══ CHAT DRAWER ═══ */}
        {chatDrawer && selectedId && (
          <CaseChatDrawer
            caseId={selectedId}
            caseTitle={sc?.title}
            lang={lang}
            onClose={() => setChatDrawer(null)}
            initialMessage={chatDrawer.initial}
            jamesQuestion={chatDrawer.jamesQuestion}
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
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>J</div>
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
