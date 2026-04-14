import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ArrowLeft, Download, Share2, FileText, Plus, Scale, ExternalLink, Loader2, Upload, MessageSquare, Settings, BookOpen, LogOut, ChevronRight, X } from 'lucide-react';
import jsPDF from 'jspdf';
import AddDocumentModal from '../components/AddDocumentModal';
import CaseChatDrawer from '../components/CaseChatDrawer';
import NextActionsPanel from '../components/NextActionsPanel';
import LetterFormModal from '../components/LetterFormModal';
import AttorneyLetterModal from '../components/AttorneyLetterModal';
import JurisdictionPills from '../components/JurisdictionPills';
import AnalysisFindings from '../components/AnalysisFindings';
import ScoreHistoryChart from '../components/ScoreHistoryChart';
import { formatBoldText } from '../utils/sanitize';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Language ── */
const L = {
  en: {
    back: 'My Cases', brief: 'Download brief', share: 'Share', addDoc: 'Add document', talkLawyer: 'Talk to a lawyer',
    riskLabel: 'Archer Risk Score', riskHigh: 'High risk', riskMed: 'Medium risk', riskLow: 'Low risk',
    dimFin: 'Financial', dimUrg: 'Urgency', dimLeg: 'Legal', dimCom: 'Complexity',
    analysisTitle: 'Archer Analysis — Real-time update', live: 'Live',
    battleTitle: 'Legal Battle Preview — Archer vs Opposing Counsel', yourArgs: 'Your arguments', theirArgs: 'Their arguments',
    nextActions: 'Next actions', documents: 'Documents', keyDoc: 'Key',
    critDeadline: 'Critical deadline', days: 'days', expired: 'Expired', before: 'Before',
    overview: 'Overview', scoreHistory: 'Score History', outcomePred: 'Outcome Predictor',
    archerQ: 'Archer needs clarification',
    jurisTitle: 'Recent legal updates — relevant to your case', whyMatters: 'Why this matters for your case',
    riskMonitor: 'Never miss a legal document', riskMonitorSub: 'Connect your inbox — Archer monitors it and alerts you instantly',
    connectGmail: 'Connect Gmail', connectOutlook: 'Connect Outlook', connected: 'connected — Risk Monitor active',
    shareTitle: 'Share this case — read-only access', shareDesc: 'Generate a secure link', shareCopy: 'Copy link', shareExpiry: 'Link expires in',
    genLetter: 'Generate letter', downloading: 'Generating...', close: 'Close', downloadPdf: 'Download PDF',
    openedOn: 'Opened', docCount: 'documents', updatedBy: 'Updated by Archer',
    caseType: { housing: 'Housing', employment: 'Employment', debt: 'Debt', insurance: 'Insurance', contract: 'Contract', consumer: 'Consumer', family: 'Family', court: 'Court', nda: 'NDA', penal: 'Criminal', commercial: 'Commercial', other: 'Other' },
    analyzing: 'Archer is analyzing...', reanalyze: 'Re-analyze',
    newCase: 'Open a new case', tagline: 'Your virtual legal cabinet', archerRole: 'Senior Legal Advisor',
    overlayTitle: 'What is your problem?', overlaySub: 'Archer will handle your case immediately.', backCase: 'Back to case',
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
    stat1: '847K+', stat1l: 'live sources', stat2: '20 yrs', stat2l: 'experience', stat3: 'Live', stat3l: 'case law', stat4: '#1', stat4l: 'Legal AI',
    activeCases: 'Active cases', navUpload: 'Upload', navLawyers: 'Lawyers', navDocs: 'Documents', navChat: 'Legal chat', navSettings: 'Settings',
    deadlineIn: 'Deadline in',
    moreQuestions: 'Archer has more questions — ask him directly',
  },
  fr: {
    back: 'Mes dossiers', brief: 'Télécharger le résumé', share: 'Partager', addDoc: 'Ajouter un document', talkLawyer: 'Parler à un avocat',
    riskLabel: 'Score de risque Archer', riskHigh: 'Risque élevé', riskMed: 'Risque modéré', riskLow: 'Risque faible',
    dimFin: 'Financier', dimUrg: 'Urgence', dimLeg: 'Juridique', dimCom: 'Complexité',
    analysisTitle: "Analyse d'Archer — Mise à jour en temps réel", live: 'Live',
    battleTitle: 'Aperçu juridique — Archer vs Avocat adverse', yourArgs: 'Vos arguments', theirArgs: 'Leurs arguments',
    nextActions: 'Prochaines actions', documents: 'Documents', keyDoc: 'Clé',
    critDeadline: 'Échéance critique', days: 'jours', expired: 'Expiré', before: 'Avant le',
    overview: 'Vue d\'ensemble', scoreHistory: 'Historique du score', outcomePred: 'Prédiction d\'issue',
    archerQ: 'Archer a besoin d\'une précision',
    jurisTitle: 'Jurisprudence récente — pertinente pour votre dossier', whyMatters: 'Pertinence pour votre dossier',
    riskMonitor: 'Ne ratez jamais un document juridique', riskMonitorSub: 'Connectez votre boîte mail — Archer la surveille et vous alerte instantanément',
    connectGmail: 'Connecter Gmail', connectOutlook: 'Connecter Outlook', connected: 'connecté — Risk Monitor actif',
    shareTitle: 'Partager ce dossier — accès en lecture seule', shareDesc: 'Générer un lien sécurisé', shareCopy: 'Copier le lien', shareExpiry: 'Lien expire dans',
    genLetter: 'Générer la lettre', downloading: 'Génération...', close: 'Fermer', downloadPdf: 'Télécharger PDF',
    openedOn: 'Ouvert le', docCount: 'documents', updatedBy: 'Mis à jour par Archer',
    caseType: { housing: 'Logement', employment: 'Emploi', debt: 'Dettes', insurance: 'Assurance', contract: 'Contrat', consumer: 'Consommation', family: 'Famille', court: 'Tribunal', nda: 'NDA', penal: 'Pénal', commercial: 'Commercial', other: 'Autre' },
    analyzing: 'Archer analyse...', reanalyze: 'Ré-analyser',
    newCase: 'Ouvrir un nouveau dossier', tagline: 'Votre cabinet juridique virtuel', archerRole: 'Conseiller juridique senior',
    overlayTitle: 'Quel est votre problème ?', overlaySub: 'Archer va prendre votre dossier en charge immédiatement.', backCase: 'Retour au dossier',
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
    stat1: '847K+', stat1l: 'sources live', stat2: '20 ans', stat2l: 'expérience', stat3: 'Live', stat3l: 'jurisprudence', stat4: '#1', stat4l: 'IA juridique',
    activeCases: 'Dossiers actifs', navUpload: 'Téléverser', navLawyers: 'Avocats', navDocs: 'Documents', navChat: 'Chat juridique', navSettings: 'Paramètres',
    deadlineIn: 'Échéance dans',
    moreQuestions: 'Archer a d\'autres questions — demandez-lui directement',
  },
  nl: {
    back: 'Mijn dossiers', brief: 'Download samenvatting', share: 'Delen', addDoc: 'Document toevoegen', talkLawyer: 'Praat met een advocaat',
    riskLabel: 'Archer Risicoscore', riskHigh: 'Hoog risico', riskMed: 'Gemiddeld risico', riskLow: 'Laag risico',
    dimFin: 'Financieel', dimUrg: 'Urgentie', dimLeg: 'Juridisch', dimCom: 'Complexiteit',
    analysisTitle: 'Analyse van Archer — Realtime update', live: 'Live',
    battleTitle: 'Juridisch overzicht — Archer vs Tegenpartij', yourArgs: 'Uw argumenten', theirArgs: 'Hun argumenten',
    nextActions: 'Volgende acties', documents: 'Documenten', keyDoc: 'Sleutel',
    critDeadline: 'Kritieke deadline', days: 'dagen', expired: 'Verlopen', before: 'Voor',
    overview: 'Overzicht', scoreHistory: 'Score Geschiedenis', outcomePred: 'Uitkomstvoorspelling',
    archerQ: 'Archer heeft verduidelijking nodig',
    jurisTitle: 'Recente rechtspraak — relevant voor uw dossier', whyMatters: 'Waarom dit belangrijk is',
    riskMonitor: 'Mis nooit een juridisch document', riskMonitorSub: 'Verbind uw inbox — Archer bewaakt en waarschuwt u direct',
    connectGmail: 'Verbind Gmail', connectOutlook: 'Verbind Outlook', connected: 'verbonden — Risk Monitor actief',
    shareTitle: 'Deel dit dossier — alleen-lezen', shareDesc: 'Genereer een beveiligde link', shareCopy: 'Link kopiëren', shareExpiry: 'Link verloopt in',
    genLetter: 'Brief genereren', downloading: 'Genereren...', close: 'Sluiten', downloadPdf: 'Download PDF',
    openedOn: 'Geopend op', docCount: 'documenten', updatedBy: 'Bijgewerkt door Archer',
    caseType: { housing: 'Huisvesting', employment: 'Werk', debt: 'Schulden', insurance: 'Verzekering', contract: 'Contract', consumer: 'Consument', family: 'Familie', court: 'Rechtbank', nda: 'NDA', penal: 'Strafrecht', commercial: 'Commercieel', other: 'Overig' },
    analyzing: 'Archer analyseert...', reanalyze: 'Heranalyse',
    newCase: 'Nieuw dossier openen', tagline: 'Uw virtueel juridisch kantoor', archerRole: 'Senior Juridisch Adviseur',
    overlayTitle: 'Wat is uw probleem?', overlaySub: 'Archer neemt uw dossier onmiddellijk in behandeling.', backCase: 'Terug naar dossier',
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
    stat1: '847K+', stat1l: 'live bronnen', stat2: '20 jaar', stat2l: 'ervaring', stat3: 'Live', stat3l: 'rechtspraak', stat4: '#1', stat4l: 'Juridische AI',
    activeCases: 'Actieve dossiers', navUpload: 'Uploaden', navLawyers: 'Advocaten', navDocs: 'Documenten', navChat: 'Juridische chat', navSettings: 'Instellingen',
    deadlineIn: 'Deadline in',
    moreQuestions: 'Archer heeft meer vragen — stel ze direct',
  },
};
const getLang = (u) => { const l = u?.language || 'en'; return l === 'nl' ? 'nl' : (l === 'fr' || l === 'fr-BE') ? 'fr' : 'en'; };
const riskColor = (s) => s >= 70 ? '#dc2626' : s >= 40 ? '#f59e0b' : s > 0 ? '#16a34a' : '#9ca3af';
const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const fmtDate = (d, l) => d ? new Date(d).toLocaleDateString(l === 'fr' ? 'fr-FR' : l === 'nl' ? 'nl-BE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const pulse = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`;

const CaseDetail = () => {
  const { caseId } = useParams();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const lang = getLang(user);
  const t = L[lang] || L.en;
  const jurisdiction = user?.jurisdiction || user?.country || 'US';

  const handleJurisdictionSwitch = async (j) => {
    if (j === jurisdiction) return;
    updateUser({ jurisdiction: j, country: j });
    try { await axios.put(`${API}/profile`, { jurisdiction: j, country: j }, { withCredentials: true }); } catch (e) {}
    navigate('/dashboard');
  };

  const [caseData, setCaseData] = useState(null);
  const [cases, setCases] = useState([]);
  const [caseDocs, setCaseDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [letterModal, setLetterModal] = useState(null);
  const [letterFormStep, setLetterFormStep] = useState(null);
  const [letterTone, setLetterTone] = useState('citizen');
  const [attorneyModalStep, setAttorneyModalStep] = useState(null);
  const [shareModal, setShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [jqAnswered, setJqAnswered] = useState(false);
  const [jqImpact, setJqImpact] = useState(null);
  const [jqSelectedAnswer, setJqSelectedAnswer] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [chatDrawer, setChatDrawer] = useState(null);
  const [analysisToast, setAnalysisToast] = useState(null);
  const prevStatusRef = React.useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [caseRes, casesRes, docsRes] = await Promise.all([
        axios.get(`${API}/cases/${caseId}`, { withCredentials: true }),
        axios.get(`${API}/cases`, { withCredentials: true }),
        axios.get(`${API}/cases/${caseId}/documents`, { withCredentials: true }).catch(() => ({ data: [] })),
      ]);
      const newCase = caseRes.data;
      if (prevStatusRef.current === 'analyzing' && newCase.status === 'active') {
        setAnalysisToast({ score: newCase.risk_score || 0 });
        setTimeout(() => setAnalysisToast(null), 5000);
      }
      prevStatusRef.current = newCase.status;
      setCaseData(newCase);
      setCases((casesRes.data || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
      setCaseDocs(docsRes.data || []);
    } catch (e) { /* ok */ }
    setLoading(false);
  }, [caseId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (caseData?.status === 'analyzing') {
      const interval = setInterval(fetchData, 2000);
      return () => clearInterval(interval);
    }
  }, [caseData?.status, fetchData]);

  const sc = caseData;
  const score = sc?.risk_score || 0;
  const scoreColor = riskColor(score);
  const riskText = score >= 70 ? t.riskHigh : score >= 40 ? t.riskMed : score > 0 ? t.riskLow : '—';
  const findings = sc?.ai_findings || [];
  const steps = sc?.ai_next_steps || [];
  const bp = sc?.battle_preview;
  const dl = daysUntil(sc?.deadline);
  const jq = sc?.archer_question;
  const history = sc?.risk_score_history || [];
  const caseLaw = sc?.recent_case_law || [];
  const prob = sc?.success_probability;

  const handleArcherAnswer = async (answer) => {
    if (!jq || answerLoading) return;
    setAnswerLoading(true);
    setJqSelectedAnswer(answer);
    setJqAnswered(false);
    setJqImpact(null);
    try {
      const res = await axios.post(`${API}/cases/${caseId}/archer-answer`, {
        question: jq.text,
        answer: answer,
      }, { withCredentials: true });
      const impactText = res.data?.impact_summary || null;
      setJqImpact(impactText);
      setJqAnswered(true);
      await fetchData();
    } catch (e) {
      console.error('Archer answer error:', e);
      setJqAnswered(true);
    }
    setAnswerLoading(false);
  };

  const handleShare = async () => {
    setShareModal(true);
    try {
      const res = await axios.post(`${API}/cases/${caseId}/share`, { expires_in_hours: 168 }, { withCredentials: true });
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

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Loader2 size={20} className="animate-spin" style={{ color: '#1a56db' }} /></div>;

  return (
    <>
      <style>{pulse}</style>
      <div data-testid="case-detail-page" style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'grid', gridTemplateColumns: '260px 1fr 240px',
        background: '#f8f7f4', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: 'hidden',
      }}>

        {/* ═══ LEFT SIDEBAR ═══ */}
        <div style={{ background: '#fff', borderRight: '0.5px solid #e2e0db', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '18px 14px 14px', borderBottom: '0.5px solid #f0ede8' }}>
            <div onClick={() => navigate('/')} style={{ fontSize: 19, fontWeight: 500, color: '#1a1a2e', letterSpacing: '0.3px', cursor: 'pointer' }} data-testid="logo-link">Jas<span style={{ color: '#1a56db' }}>per</span></div>
            <div style={{ fontSize: 15, color: '#9ca3af', marginTop: 1 }}>{t.tagline}</div>
          </div>
          {/* Archer Card */}
          <div style={{ margin: 10, padding: 11, background: '#eff6ff', borderRadius: 11, border: '0.5px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>A</div>
              <div><div style={{ fontSize: 16, fontWeight: 700, color: '#1e40af' }}>Archer</div><div style={{ fontSize: 15, color: '#3b82f6' }}>{t.archerRole}</div></div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto', animation: 'pulse 1.5s infinite' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {[[t.stat1, t.stat1l], [t.stat2, t.stat2l], [t.stat3, t.stat3l], [t.stat4, t.stat4l]].map(([v, l]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 6, padding: '5px 7px', fontSize: 15, color: '#1e40af', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: '#1a56db' }}>{v}</span>{l}
                </div>
              ))}
            </div>
          </div>
          {/* Nav */}
          <div style={{ padding: '4px 10px', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {[{ icon: <Upload size={10} />, label: t.navUpload, to: '/upload' }, { icon: <Scale size={10} />, label: t.navLawyers, to: '/lawyers' }, { icon: <BookOpen size={10} />, label: t.navDocs, to: '/documents' }, { icon: <MessageSquare size={10} />, label: t.navChat, to: '/chat' }, { icon: <Settings size={10} />, label: t.navSettings, to: '/settings' }].map((n) => (
              <button key={n.to} onClick={() => navigate(n.to)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', fontSize: 15, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 5 }}>{n.icon}{n.label}</button>
            ))}
          </div>
          {/* Cases */}
          <div style={{ padding: '8px 14px 4px', fontSize: 15, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.activeCases}</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cases.map(c => {
              const isActive = c.case_id === caseId;
              const cScore = c.risk_score || 0;
              const cColor = riskColor(cScore);
              const cDl = daysUntil(c.deadline);
              return (
                <div key={c.case_id} onClick={() => navigate(`/cases/${c.case_id}`)} data-testid={`sidebar-case-${c.case_id}`}
                  style={{ margin: '2px 7px', padding: 9, borderRadius: 9, cursor: 'pointer', border: isActive ? '0.5px solid #bfdbfe' : '0.5px solid transparent', background: isActive ? '#eff6ff' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cColor, flexShrink: 0, marginTop: 3 }} />
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e', flex: 1, lineHeight: 1.3 }}>{c.title || 'Untitled'}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: cColor }}>{cScore > 0 ? cScore : '—'}</div>
                  </div>
                  <div style={{ fontSize: 15, color: '#9ca3af', marginTop: 2, marginLeft: 14 }}>{t.caseType[c.type] || c.type || 'Other'} · {c.document_count || 0} {t.docCount}</div>
                  {cDl !== null && cDl <= 14 && <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2, marginLeft: 14, color: cDl <= 3 ? '#dc2626' : '#f59e0b' }}>{cDl <= 0 ? `⚡ ${t.expired}` : `${t.deadlineIn} ${cDl} ${t.days}`}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ padding: 10 }}>
            <button onClick={() => setShowOverlay(true)} data-testid="new-case-btn" style={{ width: '100%', padding: '10px 0', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Plus size={13} />{t.newCase}</button>          </div>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ padding: '8px 14px', fontSize: 15, color: '#9ca3af', background: 'none', border: 'none', borderTop: '0.5px solid #f0ede8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><LogOut size={10} />{lang === 'fr' ? 'Déconnexion' : lang === 'nl' ? 'Uitloggen' : 'Sign out'}</button>
        </div>

        {/* ═══ MAIN CENTER ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Global Top Bar: Back + Jurisdiction */}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '6px 20px',
            background: '#fff', borderBottom: '0.5px solid #f0ede8',
          }}>
            <button onClick={() => navigate('/dashboard')} data-testid="back-btn-global" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#9ca3af', fontWeight: 500, marginRight: 12, display: 'flex', alignItems: 'center', gap: 3 }}>← Back</button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <JurisdictionPills jurisdiction={jurisdiction} language={user?.language} onSwitch={handleJurisdictionSwitch} onLanguageChange={async (l) => { updateUser({ language: l }); try { await axios.put(`${API}/profile`, { language: l }, { withCredentials: true }); } catch {} }} />
            </div>
          </div>
          {/* Breadcrumb + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#fff', borderBottom: '0.5px solid #f0ede8' }}>
            <button onClick={() => navigate('/dashboard')} data-testid="back-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 15, color: '#1a56db', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={13} />{t.back}</button>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={handleBriefPdf} data-testid="brief-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}><Download size={11} />{t.brief}</button>
              <button onClick={handleShare} data-testid="share-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}><Share2 size={11} />{t.share}</button>
              <button onClick={() => setShowAddDoc(true)} data-testid="add-doc-btn" style={{ fontSize: 15, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}>{t.addDoc}</button>
              <button onClick={() => navigate('/lawyers')} style={{ fontSize: 15, padding: '5px 10px', background: '#1a56db', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#fff' }}>{t.talkLawyer}</button>
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {!sc ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9ca3af' }}>Case not found</div>
            ) : sc.status === 'analyzing' && score === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>⚖️</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>{t.analyzing}</div>
                <div style={{ marginTop: 16, display: 'flex', gap: 4, justifyContent: 'center' }}>{[0,1,2,3,4].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a56db', animation: `pulse 1.5s infinite ${i*0.3}s` }} />)}</div>
              </div>
            ) : (
              <>
                {/* Re-analyzing banner */}
                {sc.status === 'analyzing' && score > 0 && (
                  <div data-testid="reanalyzing-banner" style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 10,
                    background: '#eff6ff', borderRadius: 10, border: '0.5px solid #bfdbfe',
                  }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: '#1a56db' }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e40af' }}>
                      {lang === 'fr' ? 'Archer ré-analyse votre dossier complet...' : lang === 'nl' ? 'Archer heranalyseert uw volledig dossier...' : 'Archer is re-analyzing your complete case...'}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>{[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#1a56db', animation: `pulse 1.5s infinite ${i*0.3}s` }} />)}</div>
                  </div>
                )}
                {/* Case type + title */}
                <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 15, fontWeight: 600, background: '#fffbeb', border: '0.5px solid #fde68a', color: '#92400e', marginBottom: 8 }}>
                  {t.caseType[sc.type] || sc.type || 'Other'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{sc.title}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                  {t.openedOn} {fmtDate(sc.created_at, lang)} · {sc.document_count || 0} {t.docCount} · {t.updatedBy}
                </div>

                {/* Risk Score */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center', background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                  <div>
                    <div style={{ fontSize: 15, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{t.riskLabel}</div>
                    <div data-testid="risk-score-big" style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, lineHeight: 1, color: scoreColor }}>{score || '—'}</div>
                    <div style={{ fontSize: 15, color: scoreColor, fontWeight: 600, marginTop: 2 }}>{riskText}</div>
                  </div>
                  <div>
                    <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 9 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: scoreColor, width: `${score}%`, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                      {[[sc.risk_financial, t.dimFin], [sc.risk_urgency, t.dimUrg], [sc.risk_legal_strength, t.dimLeg], [sc.risk_complexity, t.dimCom]].map(([v, label]) => (
                        <div key={label} style={{ background: '#f8f7f4', borderRadius: 7, padding: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: riskColor(v || 0) }}>{v || '—'}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score History */}
                {history.length > 0 && (
                  <ScoreHistoryChart history={history} title={t.scoreHistory} />
                )}

                {/* Archer Analysis */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ position: 'relative', width: 32, height: 32, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
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
                  <AnalysisFindings findings={findings} lang={lang} isCompact={false} />
                </div>

                {/* Archer Question Card — max 1 question */}
                {(jq || jqImpact) && (
                  <div data-testid="archer-question" style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #fde68a', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 5 }}>💬 {t.archerQ}</div>
                    {/* Previous answer impact — shown after answer */}
                    {jqAnswered && jqImpact && (
                      <>
                        <div data-testid="archer-impact" style={{ fontSize: 12, color: '#1a56db', lineHeight: 1.5, marginBottom: 8, padding: '6px 10px', background: '#eff6ff', borderRadius: 8, border: '0.5px solid #bfdbfe' }}>
                          <span style={{ fontWeight: 600 }}>Archer:</span> {jqImpact}
                        </div>
                        <button data-testid="ask-archer-directly"
                          onClick={() => setChatDrawer({
                            initial: `${lang === 'fr' ? 'Mon dossier' : 'My case'}: "${sc?.title}". ${jqSelectedAnswer || ''}`,
                            archerQuestion: jq?.text || '',
                            lastAnswer: jqSelectedAnswer,
                          })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#1a56db', fontWeight: 500, padding: 0, marginBottom: jq ? 10 : 0 }}>
                          {t.moreQuestions} →
                        </button>
                        {jq && <div style={{ borderTop: '0.5px solid #fde68a', marginTop: 4, paddingTop: 8 }} />}
                      </>
                    )}
                    {/* Current question */}
                    {jq && (
                      <>
                        <div style={{ fontSize: 15, color: '#78350f', lineHeight: 1.6, marginBottom: 8 }}>{jq.text}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(jq.options || []).slice(0, 4).map((opt, optIdx) => (
                            <button key={`jq-opt-${optIdx}-${opt.slice(0, 15)}`} data-testid={`archer-answer-${optIdx}`}
                              onClick={() => handleArcherAnswer(opt)}
                              disabled={answerLoading}
                              style={{
                                padding: '6px 14px',
                                background: answerLoading ? '#f3f4f6' : '#fff',
                                color: answerLoading ? '#9ca3af' : '#1a1a2e',
                                border: '0.5px solid #e2e0db',
                                borderRadius: 8, fontSize: 12, fontWeight: 500,
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

                {/* Battle Preview — Horizontal */}
                {bp && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 10 }}>{t.battleTitle}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 9, padding: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#16a34a', marginBottom: 6 }}>{t.yourArgs}</div>
                        {(bp.user_side?.strongest_arguments || bp.user_side?.strong_arguments || bp.user_arguments || []).slice(0, 5).map((a, aIdx) => (
                          <div key={`ua-${aIdx}-${(typeof a === 'string' ? a : a.argument || '').slice(0, 15)}`} style={{ fontSize: 12, color: '#374151', padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>•</span>
                            <span>{typeof a === 'string' ? a : a.argument || a.text || ''}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#fff5f5', border: '0.5px solid #fca5a5', borderRadius: 9, padding: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#dc2626', marginBottom: 6 }}>{t.theirArgs}</div>
                        {(bp.opposing_side?.strongest_arguments || bp.opposing_side?.opposing_arguments || bp.opposing_arguments || []).slice(0, 5).map((a, aIdx) => (
                          <div key={`oa-${aIdx}-${(typeof a === 'string' ? a : a.argument || '').slice(0, 15)}`} style={{ fontSize: 12, color: '#374151', padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
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
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>{t.jurisTitle}</div>
                    {caseLaw.map((cl, clIdx) => (
                      <div key={cl.case_name || cl.court} style={{ padding: '8px 0', borderBottom: clIdx < caseLaw.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', flex: 1 }}>{cl.case_name}</div>
                          {cl.url && <a href={cl.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} color="#1a56db" /></a>}
                        </div>
                        <div style={{ fontSize: 15, color: '#9ca3af', marginTop: 2 }}>{cl.court} · {cl.date_filed}</div>
                        {cl.snippet && <div style={{ fontSize: 15, color: '#6b7280', marginTop: 3, lineHeight: 1.4 }}>{cl.snippet.substring(0, 150)}...</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Outcome Predictor */}
                {prob && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>{t.outcomePred}</div>
                    {(Array.isArray(prob) ? prob : [
                      { label: lang === 'fr' ? 'Résolution favorable' : lang === 'nl' ? 'Gunstige uitkomst' : 'Full resolution in your favor', pct: prob.full_resolution_in_favor || prob.resolution_favorable || prob.favorable || 0, color: '#16a34a' },
                      { label: lang === 'fr' ? 'Accord négocié' : lang === 'nl' ? 'Onderhandelde schikking' : 'Negotiated settlement', pct: prob.negotiated_settlement || prob.compromis_negocie || prob.settlement || 0, color: '#1a56db' },
                      { label: lang === 'fr' ? 'Résolution partielle' : lang === 'nl' ? 'Gedeeltelijk verlies' : 'Partial loss', pct: prob.partial_loss || prob.perte_partielle || prob.partial || 0, color: '#f59e0b' },
                      { label: lang === 'fr' ? 'Issue défavorable' : lang === 'nl' ? 'Volledig verlies' : 'Full loss', pct: prob.full_loss || prob.perte_totale || prob.unfavorable || 0, color: '#dc2626' },
                    ]).map((o) => (
                      <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: 12, color: '#374151', width: 160, flexShrink: 0 }}>{o.label}</div>
                        <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: o.color, width: `${o.pct}%`, transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: o.color, width: 32, textAlign: 'right' }}>{o.pct}%</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risk Monitor */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 3 }}>{t.riskMonitor}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>{t.riskMonitorSub}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ flex: 1, padding: '8px 0', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>📧 {t.connectGmail}</button>
                    <button style={{ flex: 1, padding: '8px 0', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>📨 {t.connectOutlook}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div data-testid="right-panel" style={{ background: '#fff', borderLeft: '0.5px solid #e2e0db', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '14px 14px 8px', fontSize: 12, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.3px' }}>{t.overview}</div>

          {/* Deadline */}
          {sc?.deadline && (
            <div style={{ margin: '0 8px 8px', padding: 11, background: '#fff5f5', borderRadius: 9, border: '0.5px solid #fca5a5' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.3px' }}>⚡ {t.critDeadline}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#dc2626', margin: '4px 0 2px' }}>{dl !== null ? (dl <= 0 ? t.expired : `${dl} ${t.days}`) : '—'}</div>
              <div style={{ fontSize: 15, color: '#991b1b' }}>{t.before} {fmtDate(sc.deadline, lang)}</div>
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
          <div style={{ padding: '8px 14px 4px', fontSize: 15, fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.documents}</div>
          <div style={{ margin: '0 8px' }}>
            {caseDocs.length > 0 ? caseDocs.map((d, i) => (
              <div key={d.document_id || i} onClick={() => navigate(`/documents/${d.document_id}`)} data-testid={`doc-link-${i}`}
                style={{ padding: '7px 8px', borderRadius: 7, border: '1px solid #e2e0db', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={12} color="#1a56db" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.file_name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : ''}</div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #e2e0db', display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={12} color="#1a56db" /></div>
                <div style={{ fontSize: 16, color: '#374151', fontWeight: 500 }}>{sc?.document_count || 0} {t.docCount}</div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ ATTORNEY LETTER MODAL ═══ */}
        {attorneyModalStep && (
          <AttorneyLetterModal
            caseData={sc}
            lang={lang}
            jurisdiction={user?.jurisdiction || 'US'}
            opposingPartyName={sc?.opposing_party_name}
            onClose={() => setAttorneyModalStep(null)}
            onGenerateFree={() => { setLetterTone('citizen'); setLetterFormStep(attorneyModalStep); setAttorneyModalStep(null); }}
            onOrderAttorney={() => { setLetterTone('attorney'); setLetterFormStep(attorneyModalStep); setAttorneyModalStep(null); }}
          />
        )}

        {/* ═══ LETTER FORM MODAL ═══ */}
        {letterFormStep && (
          <LetterFormModal
            step={letterFormStep}
            caseId={caseId}
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
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{t.shareTitle}</div>
                <button onClick={() => setShareModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
              </div>
              <div style={{ fontSize: 15, color: '#6b7280', marginBottom: 12 }}>{t.shareDesc}</div>
              {shareLink ? (
                <>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input readOnly value={shareLink} style={{ flex: 1, padding: '8px 10px', background: '#f8f7f4', border: '0.5px solid #e2e0db', borderRadius: 7, fontSize: 12, color: '#374151' }} />
                    <button onClick={() => { navigator.clipboard.writeText(shareLink); }} style={{ padding: '8px 14px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.shareCopy}</button>
                  </div>
                  <div style={{ fontSize: 15, color: '#9ca3af', marginTop: 6 }}>{t.shareExpiry}: 7 {t.days}</div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}><Loader2 size={16} className="animate-spin" style={{ color: '#1a56db' }} /></div>
              )}
            </div>
          </div>
        )}

        {/* ═══ CHAT DRAWER ═══ */}
        {chatDrawer && (
          <CaseChatDrawer
            caseId={caseId}
            caseTitle={sc?.title}
            lang={lang}
            onClose={() => setChatDrawer(null)}
            initialMessage={chatDrawer.initial}
            archerQuestion={chatDrawer.archerQuestion}
            lastAnswer={chatDrawer.lastAnswer}
          />
        )}

        {/* ═══ ADD DOCUMENT MODAL ═══ */}
        {showAddDoc && (
          <AddDocumentModal
            caseId={caseId}
            lang={lang}
            onClose={() => setShowAddDoc(false)}
            onUploadComplete={() => {
              setShowAddDoc(false);
              // Force analyzing state so polling kicks in immediately
              setCaseData(prev => prev ? { ...prev, status: 'analyzing' } : prev);
              prevStatusRef.current = 'analyzing';
              fetchData();
            }}
          />
        )}

        {/* ═══ NEW CASE OVERLAY ═══ */}
        {showOverlay && (
          <div data-testid="new-case-overlay" style={{
            position: 'absolute', inset: 0, background: 'rgba(248,247,244,0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e2e0db', padding: 24, width: '100%', maxWidth: 680 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>A</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>{t.overlayTitle}</div>
              </div>
              <div style={{ fontSize: 15, color: '#6b7280', marginBottom: 20 }}>{t.overlaySub}</div>
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
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.3 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button data-testid="back-to-case" onClick={() => setShowOverlay(false)} style={{
                marginTop: 14, fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
              }}>← {t.backCase}</button>
            </div>
          </div>
        )}

        {/* ═══ ANALYSIS COMPLETE TOAST ═══ */}
        {analysisToast && (
          <div data-testid="analysis-toast" style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
            background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 10,
            fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
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

export default CaseDetail;
