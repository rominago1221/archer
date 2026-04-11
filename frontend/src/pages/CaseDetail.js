import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ArrowLeft, Download, Share2, FileText, Plus, Scale, ExternalLink, Loader2, Upload, MessageSquare, Settings, BookOpen, LogOut, ChevronRight, X } from 'lucide-react';
import jsPDF from 'jspdf';
import AddDocumentModal from '../components/AddDocumentModal';
import CaseChatDrawer from '../components/CaseChatDrawer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Language ── */
const L = {
  en: {
    back: 'My Cases', brief: 'Download brief', share: 'Share', addDoc: 'Add document', talkLawyer: 'Talk to a lawyer',
    riskLabel: 'Jasper Risk Score', riskHigh: 'High risk', riskMed: 'Medium risk', riskLow: 'Low risk',
    dimFin: 'Financial', dimUrg: 'Urgency', dimLeg: 'Legal', dimCom: 'Complexity',
    analysisTitle: 'James Analysis — Real-time update', live: 'Live',
    battleTitle: 'Legal Battle Preview — James vs Opposing Counsel', yourArgs: 'Your arguments', theirArgs: 'Their arguments',
    nextActions: 'Next actions', documents: 'Documents', keyDoc: 'Key',
    critDeadline: 'Critical deadline', days: 'days', expired: 'Expired', before: 'Before',
    overview: 'Overview', scoreHistory: 'Score History', outcomePred: 'Outcome Predictor',
    jamesQ: 'James needs clarification',
    jurisTitle: 'Recent legal updates — relevant to your case', whyMatters: 'Why this matters for your case',
    riskMonitor: 'Never miss a legal document', riskMonitorSub: 'Connect your inbox — James monitors it and alerts you instantly',
    connectGmail: 'Connect Gmail', connectOutlook: 'Connect Outlook', connected: 'connected — Risk Monitor active',
    shareTitle: 'Share this case — read-only access', shareDesc: 'Generate a secure link', shareCopy: 'Copy link', shareExpiry: 'Link expires in',
    genLetter: 'Generate letter', downloading: 'Generating...', close: 'Close', downloadPdf: 'Download PDF',
    openedOn: 'Opened', docCount: 'documents', updatedBy: 'Updated by James',
    caseType: { housing: 'Housing', employment: 'Employment', debt: 'Debt', insurance: 'Insurance', contract: 'Contract', consumer: 'Consumer', family: 'Family', court: 'Court', nda: 'NDA', penal: 'Criminal', commercial: 'Commercial', other: 'Other' },
    analyzing: 'James is analyzing...', reanalyze: 'Re-analyze',
    newCase: 'Open a new case', tagline: 'Your virtual legal cabinet', jamesRole: 'Senior Legal Advisor',
    overlayTitle: 'What is your problem?', overlaySub: 'James will handle your case immediately.', backCase: 'Back to case',
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
    stat1: '847K+', stat1l: 'live sources', stat2: '20 yrs', stat2l: 'experience', stat3: 'Live', stat3l: 'case law', stat4: '#1', stat4l: 'Legal AI',
    activeCases: 'Active cases', navUpload: 'Upload', navLawyers: 'Lawyers', navDocs: 'Documents', navChat: 'Legal chat', navSettings: 'Settings',
    deadlineIn: 'Deadline in',
    moreQuestions: 'James has more questions — ask him directly',
  },
  fr: {
    back: 'Mes dossiers', brief: 'Télécharger le résumé', share: 'Partager', addDoc: 'Ajouter un document', talkLawyer: 'Parler à un avocat',
    riskLabel: 'Score de risque Jasper', riskHigh: 'Risque élevé', riskMed: 'Risque modéré', riskLow: 'Risque faible',
    dimFin: 'Financier', dimUrg: 'Urgence', dimLeg: 'Juridique', dimCom: 'Complexité',
    analysisTitle: 'Analyse de James — Mise à jour en temps réel', live: 'Live',
    battleTitle: 'Aperçu juridique — James vs Avocat adverse', yourArgs: 'Vos arguments', theirArgs: 'Leurs arguments',
    nextActions: 'Prochaines actions', documents: 'Documents', keyDoc: 'Clé',
    critDeadline: 'Échéance critique', days: 'jours', expired: 'Expiré', before: 'Avant le',
    overview: 'Vue d\'ensemble', scoreHistory: 'Historique du score', outcomePred: 'Prédiction d\'issue',
    jamesQ: 'James a besoin d\'une précision',
    jurisTitle: 'Jurisprudence récente — pertinente pour votre dossier', whyMatters: 'Pertinence pour votre dossier',
    riskMonitor: 'Ne ratez jamais un document juridique', riskMonitorSub: 'Connectez votre boîte mail — James la surveille et vous alerte instantanément',
    connectGmail: 'Connecter Gmail', connectOutlook: 'Connecter Outlook', connected: 'connecté — Risk Monitor actif',
    shareTitle: 'Partager ce dossier — accès en lecture seule', shareDesc: 'Générer un lien sécurisé', shareCopy: 'Copier le lien', shareExpiry: 'Lien expire dans',
    genLetter: 'Générer la lettre', downloading: 'Génération...', close: 'Fermer', downloadPdf: 'Télécharger PDF',
    openedOn: 'Ouvert le', docCount: 'documents', updatedBy: 'Mis à jour par James',
    caseType: { housing: 'Logement', employment: 'Emploi', debt: 'Dettes', insurance: 'Assurance', contract: 'Contrat', consumer: 'Consommation', family: 'Famille', court: 'Tribunal', nda: 'NDA', penal: 'Pénal', commercial: 'Commercial', other: 'Autre' },
    analyzing: 'James analyse...', reanalyze: 'Ré-analyser',
    newCase: 'Ouvrir un nouveau dossier', tagline: 'Votre cabinet juridique virtuel', jamesRole: 'Conseiller juridique senior',
    overlayTitle: 'Quel est votre problème ?', overlaySub: 'James va prendre votre dossier en charge immédiatement.', backCase: 'Retour au dossier',
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
    stat1: '847K+', stat1l: 'sources live', stat2: '20 ans', stat2l: 'expérience', stat3: 'Live', stat3l: 'jurisprudence', stat4: '#1', stat4l: 'IA juridique',
    activeCases: 'Dossiers actifs', navUpload: 'Téléverser', navLawyers: 'Avocats', navDocs: 'Documents', navChat: 'Chat juridique', navSettings: 'Paramètres',
    deadlineIn: 'Échéance dans',
    moreQuestions: 'James a d\'autres questions — demandez-lui directement',
  },
  nl: {
    back: 'Mijn dossiers', brief: 'Download samenvatting', share: 'Delen', addDoc: 'Document toevoegen', talkLawyer: 'Praat met een advocaat',
    riskLabel: 'Jasper Risicoscore', riskHigh: 'Hoog risico', riskMed: 'Gemiddeld risico', riskLow: 'Laag risico',
    dimFin: 'Financieel', dimUrg: 'Urgentie', dimLeg: 'Juridisch', dimCom: 'Complexiteit',
    analysisTitle: 'Analyse van James — Realtime update', live: 'Live',
    battleTitle: 'Juridisch overzicht — James vs Tegenpartij', yourArgs: 'Uw argumenten', theirArgs: 'Hun argumenten',
    nextActions: 'Volgende acties', documents: 'Documenten', keyDoc: 'Sleutel',
    critDeadline: 'Kritieke deadline', days: 'dagen', expired: 'Verlopen', before: 'Voor',
    overview: 'Overzicht', scoreHistory: 'Score Geschiedenis', outcomePred: 'Uitkomstvoorspelling',
    jamesQ: 'James heeft verduidelijking nodig',
    jurisTitle: 'Recente rechtspraak — relevant voor uw dossier', whyMatters: 'Waarom dit belangrijk is',
    riskMonitor: 'Mis nooit een juridisch document', riskMonitorSub: 'Verbind uw inbox — James bewaakt en waarschuwt u direct',
    connectGmail: 'Verbind Gmail', connectOutlook: 'Verbind Outlook', connected: 'verbonden — Risk Monitor actief',
    shareTitle: 'Deel dit dossier — alleen-lezen', shareDesc: 'Genereer een beveiligde link', shareCopy: 'Link kopiëren', shareExpiry: 'Link verloopt in',
    genLetter: 'Brief genereren', downloading: 'Genereren...', close: 'Sluiten', downloadPdf: 'Download PDF',
    openedOn: 'Geopend op', docCount: 'documenten', updatedBy: 'Bijgewerkt door James',
    caseType: { housing: 'Huisvesting', employment: 'Werk', debt: 'Schulden', insurance: 'Verzekering', contract: 'Contract', consumer: 'Consument', family: 'Familie', court: 'Rechtbank', nda: 'NDA', penal: 'Strafrecht', commercial: 'Commercieel', other: 'Overig' },
    analyzing: 'James analyseert...', reanalyze: 'Heranalyse',
    newCase: 'Nieuw dossier openen', tagline: 'Uw virtueel juridisch kantoor', jamesRole: 'Senior Juridisch Adviseur',
    overlayTitle: 'Wat is uw probleem?', overlaySub: 'James neemt uw dossier onmiddellijk in behandeling.', backCase: 'Terug naar dossier',
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
    stat1: '847K+', stat1l: 'live bronnen', stat2: '20 jaar', stat2l: 'ervaring', stat3: 'Live', stat3l: 'rechtspraak', stat4: '#1', stat4l: 'Juridische AI',
    activeCases: 'Actieve dossiers', navUpload: 'Uploaden', navLawyers: 'Advocaten', navDocs: 'Documenten', navChat: 'Juridische chat', navSettings: 'Instellingen',
    deadlineIn: 'Deadline in',
    moreQuestions: 'James heeft meer vragen — stel ze direct',
  },
};
const getLang = (u) => { const l = u?.language || 'en'; return l === 'nl' ? 'nl' : (l === 'fr' || l === 'fr-BE') ? 'fr' : 'en'; };
const riskColor = (s) => s >= 70 ? '#dc2626' : s >= 40 ? '#f59e0b' : s > 0 ? '#16a34a' : '#9ca3af';
const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const fmtDate = (d, l) => d ? new Date(d).toLocaleDateString(l === 'fr' ? 'fr-FR' : l === 'nl' ? 'nl-BE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const pulse = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`;

const CaseDetail = () => {
  const { caseId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const lang = getLang(user);
  const t = L[lang] || L.en;

  const [caseData, setCaseData] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [letterModal, setLetterModal] = useState(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [chatDrawer, setChatDrawer] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [caseRes, casesRes] = await Promise.all([
        axios.get(`${API}/cases/${caseId}`, { withCredentials: true }),
        axios.get(`${API}/cases`, { withCredentials: true }),
      ]);
      setCaseData(caseRes.data);
      setCases((casesRes.data || []).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)));
    } catch (e) { /* ok */ }
    setLoading(false);
  }, [caseId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (caseData?.status === 'analyzing') {
      const interval = setInterval(fetchData, 5000);
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
  const jq = sc?.james_question;
  const history = sc?.risk_score_history || [];
  const caseLaw = sc?.recent_case_law || [];
  const prob = sc?.success_probability;

  const handleGenerateLetter = async (step) => {
    setLetterLoading(true);
    setLetterModal({ step, letter: null });
    try {
      const res = await axios.post(`${API}/cases/${caseId}/generate-action-letter`, {
        action_title: step.title || '',
        action_description: step.description || '',
      }, { withCredentials: true });
      setLetterModal({ step, letter: res.data });
    } catch (e) { setLetterModal({ step, letter: { body: 'Letter generation failed. Please try again.' } }); }
    setLetterLoading(false);
  };

  const handleDownloadPdf = (letter) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(letter?.subject || 'Legal Letter', 20, 20);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(letter?.body || '', 170);
    doc.text(lines, 20, 35);
    doc.save(`${sc?.title || 'letter'}.pdf`);
  };

  const handleJamesAnswer = async (answer) => {
    if (!jq || answerLoading) return;
    setAnswerLoading(true);
    try {
      await axios.post(`${API}/cases/${caseId}/james-answer`, {
        question: jq.text,
        answer: answer,
      }, { withCredentials: true });
      await fetchData();
    } catch (e) { /* ok */ }
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
            <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{t.tagline}</div>
          </div>
          {/* James Card */}
          <div style={{ margin: 10, padding: 11, background: '#eff6ff', borderRadius: 11, border: '0.5px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>J</div>
              <div><div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>James</div><div style={{ fontSize: 9, color: '#3b82f6' }}>{t.jamesRole}</div></div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto', animation: 'pulse 1.5s infinite' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {[[t.stat1, t.stat1l], [t.stat2, t.stat2l], [t.stat3, t.stat3l], [t.stat4, t.stat4l]].map(([v, l], i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 6, padding: '5px 7px', fontSize: 9, color: '#1e40af', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#1a56db' }}>{v}</span>{l}
                </div>
              ))}
            </div>
          </div>
          {/* Nav */}
          <div style={{ padding: '4px 10px', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {[{ icon: <Upload size={10} />, label: t.navUpload, to: '/upload' }, { icon: <Scale size={10} />, label: t.navLawyers, to: '/lawyers' }, { icon: <BookOpen size={10} />, label: t.navDocs, to: '/documents' }, { icon: <MessageSquare size={10} />, label: t.navChat, to: '/chat' }, { icon: <Settings size={10} />, label: t.navSettings, to: '/settings' }].map((n, i) => (
              <button key={i} onClick={() => navigate(n.to)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', fontSize: 9, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 5 }}>{n.icon}{n.label}</button>
            ))}
          </div>
          {/* Cases */}
          <div style={{ padding: '8px 14px 4px', fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.activeCases}</div>
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
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a2e', flex: 1, lineHeight: 1.3 }}>{c.title || 'Untitled'}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: cColor }}>{cScore > 0 ? cScore : '—'}</div>
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, marginLeft: 14 }}>{t.caseType[c.type] || c.type || 'Other'} · {c.document_count || 0} {t.docCount}</div>
                  {cDl !== null && cDl <= 14 && <div style={{ fontSize: 9, fontWeight: 500, marginTop: 2, marginLeft: 14, color: cDl <= 3 ? '#dc2626' : '#f59e0b' }}>{cDl <= 0 ? `⚡ ${t.expired}` : `${t.deadlineIn} ${cDl} ${t.days}`}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ padding: 10 }}>
            <button onClick={() => setShowOverlay(true)} data-testid="new-case-btn" style={{ width: '100%', padding: '10px 0', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Plus size={13} />{t.newCase}</button>          </div>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ padding: '8px 14px', fontSize: 9, color: '#9ca3af', background: 'none', border: 'none', borderTop: '0.5px solid #f0ede8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><LogOut size={10} />{lang === 'fr' ? 'Déconnexion' : lang === 'nl' ? 'Uitloggen' : 'Sign out'}</button>
        </div>

        {/* ═══ MAIN CENTER ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Breadcrumb + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#fff', borderBottom: '0.5px solid #f0ede8' }}>
            <button onClick={() => navigate('/dashboard')} data-testid="back-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#1a56db', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={13} />{t.back}</button>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={handleBriefPdf} data-testid="brief-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}><Download size={11} />{t.brief}</button>
              <button onClick={handleShare} data-testid="share-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}><Share2 size={11} />{t.share}</button>
              <button onClick={() => setShowAddDoc(true)} data-testid="add-doc-btn" style={{ fontSize: 9, padding: '5px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }}>{t.addDoc}</button>
              <button onClick={() => navigate('/lawyers')} style={{ fontSize: 9, padding: '5px 10px', background: '#1a56db', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#fff' }}>{t.talkLawyer}</button>
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {!sc ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9ca3af' }}>Case not found</div>
            ) : sc.status === 'analyzing' ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>⚖️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{t.analyzing}</div>
                <div style={{ marginTop: 16, display: 'flex', gap: 4, justifyContent: 'center' }}>{[0,1,2,3,4].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a56db', animation: `pulse 1.5s infinite ${i*0.3}s` }} />)}</div>
              </div>
            ) : (
              <>
                {/* Case type + title */}
                <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#fffbeb', border: '0.5px solid #fde68a', color: '#92400e', marginBottom: 8 }}>
                  {t.caseType[sc.type] || sc.type || 'Other'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{sc.title}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 14 }}>
                  {t.openedOn} {fmtDate(sc.created_at, lang)} · {sc.document_count || 0} {t.docCount} · {t.updatedBy}
                </div>

                {/* Risk Score */}
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
                      {[[sc.risk_financial, t.dimFin], [sc.risk_urgency, t.dimUrg], [sc.risk_legal_strength, t.dimLeg], [sc.risk_complexity, t.dimCom]].map(([v, label], i) => (
                        <div key={i} style={{ background: '#f8f7f4', borderRadius: 7, padding: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: riskColor(v || 0) }}>{v || '—'}</div>
                          <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score History */}
                {history.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>{t.scoreHistory}</div>
                    <svg viewBox="0 0 400 80" style={{ width: '100%', height: 60 }}>
                      {history.map((h, i) => {
                        const x = history.length === 1 ? 200 : 20 + (i / (history.length - 1)) * 360;
                        const y = 75 - (h.score / 100) * 70;
                        const c = riskColor(h.score);
                        return <g key={i}>
                          {i > 0 && <line x1={20 + ((i-1) / (history.length - 1)) * 360} y1={75 - (history[i-1].score / 100) * 70} x2={x} y2={y} stroke={c} strokeWidth="2" />}
                          <circle cx={x} cy={y} r="4" fill={c} />
                          <text x={x} y={y - 8} textAnchor="middle" fontSize="8" fill={c}>{h.score}</text>
                        </g>;
                      })}
                    </svg>
                  </div>
                )}

                {/* James Analysis */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>J</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e' }}>{t.analysisTitle}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 9, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />{t.live}
                    </div>
                  </div>
                  {findings.map((f, i) => {
                    const fColor = f.impact === 'high' || f.type === 'risk' ? '#dc2626' : f.impact === 'low' || f.type === 'opportunity' ? '#16a34a' : '#f59e0b';
                    return (
                      <div key={i} style={{ padding: '9px 0', borderBottom: i < findings.length - 1 ? '0.5px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: fColor, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: (f.text || '').replace(/\*\*(.*?)\*\*/g, '<b style="color:#1a1a2e;font-weight:600">$1</b>') }} />
                          {f.legal_ref && <div style={{ marginTop: 5, padding: '5px 9px', background: '#eff6ff', borderLeft: '2px solid #1a56db', borderRadius: '0 5px 5px 0' }}><div style={{ fontSize: 9, fontWeight: 600, color: '#1d4ed8' }}>{f.legal_ref}</div></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* James Question Card — max 1 question */}
                {jq && (
                  <div data-testid="james-question" style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #fde68a', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1a1a2e', marginBottom: 5 }}>💬 {t.jamesQ}</div>
                    <div style={{ fontSize: 11, color: '#78350f', lineHeight: 1.6, marginBottom: 8 }}>{jq.text}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {(jq.options || []).slice(0, 3).map((opt, i) => (
                        <button key={i} data-testid={`james-answer-${i}`} onClick={() => handleJamesAnswer(opt)} disabled={answerLoading}
                          style={{ padding: '6px 14px', background: answerLoading ? '#f3f4f6' : '#fff', color: answerLoading ? '#9ca3af' : '#1a1a2e', border: '0.5px solid #e2e0db', borderRadius: 8, fontSize: 10, fontWeight: 500, cursor: answerLoading ? 'default' : 'pointer' }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <button data-testid="ask-james-directly" onClick={() => setChatDrawer({ initial: `I have a question about my case "${sc?.title}". ${jq.text}` })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#1a56db', fontWeight: 500, padding: 0 }}>
                      {t.moreQuestions} →
                    </button>
                  </div>
                )}

                {/* Battle Preview — Horizontal */}
                {bp && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', marginBottom: 10 }}>{t.battleTitle}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 9, padding: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#16a34a', marginBottom: 6 }}>{t.yourArgs}</div>
                        {(bp.user_side?.strongest_arguments || bp.user_arguments || []).slice(0, 5).map((a, i) => (
                          <div key={i} style={{ fontSize: 10, color: '#374151', padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>•</span>
                            <span>{typeof a === 'string' ? a : a.argument || a.text || ''}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#fff5f5', border: '0.5px solid #fca5a5', borderRadius: 9, padding: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#dc2626', marginBottom: 6 }}>{t.theirArgs}</div>
                        {(bp.opposing_side?.strongest_arguments || bp.opposing_side?.opposing_arguments || bp.opposing_arguments || []).slice(0, 5).map((a, i) => (
                          <div key={i} style={{ fontSize: 10, color: '#374151', padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
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
                    {caseLaw.map((cl, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < caseLaw.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
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
                    {(Array.isArray(prob) ? prob : [
                      { label: lang === 'fr' ? 'Résolution favorable' : lang === 'nl' ? 'Gunstige uitkomst' : 'Full resolution in your favor', pct: prob.full_resolution_in_favor || prob.favorable || 0, color: '#16a34a' },
                      { label: lang === 'fr' ? 'Accord négocié' : lang === 'nl' ? 'Onderhandelde schikking' : 'Negotiated settlement', pct: prob.negotiated_settlement || prob.settlement || 0, color: '#1a56db' },
                      { label: lang === 'fr' ? 'Résolution partielle' : lang === 'nl' ? 'Gedeeltelijk verlies' : 'Partial loss', pct: prob.partial_loss || prob.partial || 0, color: '#f59e0b' },
                      { label: lang === 'fr' ? 'Issue défavorable' : lang === 'nl' ? 'Volledig verlies' : 'Full loss', pct: prob.full_loss || prob.unfavorable || 0, color: '#dc2626' },
                    ]).map((o, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
        <div data-testid="right-panel" style={{ background: '#fff', borderLeft: '0.5px solid #e2e0db', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '14px 14px 8px', fontSize: 10, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.3px' }}>{t.overview}</div>

          {/* Deadline */}
          {sc?.deadline && (
            <div style={{ margin: '0 8px 8px', padding: 11, background: '#fff5f5', borderRadius: 9, border: '0.5px solid #fca5a5' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.3px' }}>⚡ {t.critDeadline}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#dc2626', margin: '4px 0 2px' }}>{dl !== null ? (dl <= 0 ? t.expired : `${dl} ${t.days}`) : '—'}</div>
              <div style={{ fontSize: 9, color: '#991b1b' }}>{t.before} {fmtDate(sc.deadline, lang)}</div>
            </div>
          )}

          {/* Next Actions */}
          {steps.length > 0 && (
            <>
              <div style={{ padding: '8px 14px 4px', fontSize: 9, fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.nextActions}</div>
              {steps.map((s, i) => {
                const sTitle = typeof s === 'string' ? s : (s.title || s.titre || '');
                const sDesc = typeof s === 'string' ? '' : (s.description || '');
                const isBookLawyer = (s.action_type === 'book_lawyer') || sTitle.toLowerCase().includes('attorney') || sTitle.toLowerCase().includes('avocat') || sTitle.toLowerCase().includes('advocaat');
                return (
                  <div key={i} data-testid={`action-item-${i}`}
                    onClick={() => isBookLawyer ? navigate('/lawyers') : handleGenerateLetter(s)}
                    style={{ margin: '0 8px 4px', padding: '8px 10px', background: '#fff', borderRadius: 8, border: '0.5px solid #e2e0db', display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#1a56db'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e0db'; }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1a56db', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#1a1a2e' }}>{sTitle}</div>
                      {sDesc && <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>{sDesc}</div>}
                      <div style={{ fontSize: 8, color: '#1a56db', marginTop: 2, fontWeight: 500 }}>{isBookLawyer ? (lang === 'fr' ? 'Réserver un appel →' : 'Book a call →') : (lang === 'fr' ? 'Générer la lettre →' : 'Generate letter →')}</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Documents */}
          <div style={{ padding: '8px 14px 4px', fontSize: 9, fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.documents}</div>
          <div style={{ margin: '0 8px' }}>
            <div style={{ padding: '6px 8px', borderRadius: 7, border: '0.5px solid #e2e0db', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: 4, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={11} color="#1a56db" /></div>
              <div style={{ fontSize: 10, color: '#374151', fontWeight: 500, flex: 1 }}>{sc?.document_count || 0} {t.docCount}</div>
              <div style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 600 }}>{t.keyDoc}</div>
            </div>
          </div>
        </div>

        {/* ═══ LETTER MODAL ═══ */}
        {letterModal && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div data-testid="letter-modal" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{letterModal.step?.title || t.genLetter}</div>
                <button onClick={() => setLetterModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
              </div>
              {letterLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={20} className="animate-spin" style={{ color: '#1a56db' }} /><div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>{t.downloading}</div></div>
              ) : letterModal.letter ? (
                <>
                  {letterModal.letter.subject && <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{letterModal.letter.subject}</div>}
                  {letterModal.letter.recipient && <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 12 }}>To: {letterModal.letter.recipient}</div>}
                  <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: 16, background: '#f8f7f4', borderRadius: 10, border: '0.5px solid #e2e0db', marginBottom: 16 }}>{letterModal.letter.body}</div>
                  {letterModal.letter.legal_citations && (
                    <div style={{ fontSize: 9, color: '#1d4ed8', marginBottom: 12 }}>
                      {letterModal.letter.legal_citations.map((c, i) => <span key={i} style={{ display: 'inline-block', padding: '2px 8px', background: '#eff6ff', borderRadius: 4, marginRight: 4, marginBottom: 4 }}>{c}</span>)}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleDownloadPdf(letterModal.letter)} data-testid="download-letter-pdf" style={{ flex: 1, padding: '10px 0', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}><Download size={13} style={{ marginRight: 4 }} />{t.downloadPdf}</button>
                    <button onClick={() => setLetterModal(null)} style={{ flex: 1, padding: '10px 0', background: '#fff', color: '#374151', border: '0.5px solid #e2e0db', borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>{t.close}</button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
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

        {/* ═══ CHAT DRAWER ═══ */}
        {chatDrawer && (
          <CaseChatDrawer
            caseId={caseId}
            caseTitle={sc?.title}
            lang={lang}
            onClose={() => setChatDrawer(null)}
            initialMessage={chatDrawer.initial}
          />
        )}

        {/* ═══ ADD DOCUMENT MODAL ═══ */}
        {showAddDoc && (
          <AddDocumentModal
            caseId={caseId}
            lang={lang}
            onClose={() => setShowAddDoc(false)}
            onUploadComplete={() => { setShowAddDoc(false); fetchData(); }}
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
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>J</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>{t.overlayTitle}</div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 20 }}>{t.overlaySub}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {t.sit.map((s, i) => (
                  <div key={i} data-testid={`situation-card-${i}`}
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
              <button data-testid="back-to-case" onClick={() => setShowOverlay(false)} style={{
                marginTop: 14, fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
              }}>← {t.backCase}</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CaseDetail;
