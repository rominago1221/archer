import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, FileText, Upload, Settings, MessageSquare, Scale, LogOut, BookOpen } from 'lucide-react';

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
    noCaseSub: 'Select a case from the sidebar or open a new one.',
    openedOn: 'Opened', docCount: 'documents', updatedBy: 'Updated by James',
    caseType: { housing: 'Housing', employment: 'Employment', debt: 'Debt', insurance: 'Insurance', contract: 'Contract', consumer: 'Consumer', family: 'Family', court: 'Court', nda: 'NDA', penal: 'Criminal', commercial: 'Commercial', other: 'Other' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Deadline in',
    navDash: 'Dashboard', navUpload: 'Upload', navCases: 'My cases', navLawyers: 'Lawyers', navDocs: 'Documents', navChat: 'Legal chat', navSettings: 'Settings',
    addDoc: 'Add document', talkLawyer: 'Talk to a lawyer',
    responseIn: 'Response in',
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
    noCaseSub: 'Sélectionnez un dossier dans la barre latérale ou ouvrez-en un nouveau.',
    openedOn: 'Ouvert le', docCount: 'documents', updatedBy: 'Mis à jour par James',
    caseType: { housing: 'Logement', employment: 'Emploi', debt: 'Dettes', insurance: 'Assurance', contract: 'Contrat', consumer: 'Consommation', family: 'Famille', court: 'Tribunal', nda: 'NDA', penal: 'Pénal', commercial: 'Commercial', other: 'Autre' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Échéance dans',
    navDash: 'Dashboard', navUpload: 'Téléverser', navCases: 'Mes dossiers', navLawyers: 'Avocats', navDocs: 'Documents', navChat: 'Chat juridique', navSettings: 'Paramètres',
    addDoc: 'Ajouter un document', talkLawyer: 'Parler à un avocat',
    responseIn: 'Réponse dans',
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
    noCaseSub: 'Selecteer een dossier in de zijbalk of open een nieuw dossier.',
    openedOn: 'Geopend op', docCount: 'documenten', updatedBy: 'Bijgewerkt door James',
    caseType: { housing: 'Huisvesting', employment: 'Werk', debt: 'Schulden', insurance: 'Verzekering', contract: 'Contract', consumer: 'Consument', family: 'Familie', court: 'Rechtbank', nda: 'NDA', penal: 'Strafrecht', commercial: 'Commercieel', other: 'Overig' },
    caseEmoji: { housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡️', contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖️', nda: '📄', penal: '⚖️', commercial: '🏢', other: '📋' },
    deadlineIn: 'Deadline in',
    navDash: 'Dashboard', navUpload: 'Uploaden', navCases: 'Mijn dossiers', navLawyers: 'Advocaten', navDocs: 'Documenten', navChat: 'Juridische chat', navSettings: 'Instellingen',
    addDoc: 'Document toevoegen', talkLawyer: 'Praat met een advocaat',
    responseIn: 'Reactie in',
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

const pulse = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const lang = getLang(user);
  const t = L[lang] || L.en;

  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  const fetchCases = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cases`, { withCredentials: true });
      const sorted = (res.data || []).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
      setCases(sorted);
      if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0].case_id);
      // If any case is still analyzing, poll again in 5 seconds
      if (sorted.some(c => c.status === 'analyzing')) {
        setTimeout(() => fetchCases(), 5000);
      }
    } catch (e) { /* ok */ }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleReanalyze = async () => {
    if (!selectedId || reanalyzing) return;
    setReanalyzing(true);
    try {
      await axios.post(`${API}/cases/${selectedId}/reanalyze`, {}, { withCredentials: true });
      await fetchCases();
    } catch (e) { /* rate limit or other error */ }
    setReanalyzing(false);
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
            <div style={{ fontSize: 19, fontWeight: 500, color: '#1a1a2e', letterSpacing: '0.3px' }}>
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
              {[[t.stat1, t.stat1l], [t.stat2, t.stat2l], [t.stat3, t.stat3l], [t.stat4, t.stat4l]].map(([v, l], i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 6, padding: '5px 7px', fontSize: 9, color: '#1e40af', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>
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
            ].map((n, i) => (
              <button key={i} onClick={() => navigate(n.to)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', fontSize: 9, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 5 }}
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
                    <div style={{ fontSize: 12, fontWeight: 800, color: c.status === 'analyzing' ? '#f59e0b' : cColor, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{c.status === 'analyzing' ? '...' : cScore > 0 ? cScore : '—'}</div>
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
          {/* James Banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
            background: '#fff', borderBottom: '0.5px solid #f0ede8',
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>J</div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{t.jamesBanner}</div>
              <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>{t.jamesSub}</div>
            </div>
            <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '0.5px solid #bfdbfe' }}>{t.credSources}</div>
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#f0fdf4', color: '#15803d', border: '0.5px solid #86efac' }}>{t.credLive}</div>
              {sc && score >= 70 && <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#fff5f5', color: '#dc2626', border: '0.5px solid #fca5a5' }}>⚡ {t.credUrgent}</div>}
            </div>
          </div>

          {/* Case View */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {!sc ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{t.noCase}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{t.noCaseSub}</div>
                <button onClick={() => setShowOverlay(true)} style={{
                  marginTop: 16, padding: '8px 20px', background: '#1a56db', color: '#fff',
                  border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>{t.newCase}</button>
              </div>
            ) : isAnalyzing ? (
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
                    <button onClick={() => navigate('/upload')} style={{ fontSize: 9, padding: '4px 10px', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 7, cursor: 'pointer', fontWeight: 500, color: '#374151' }} data-testid="add-doc-btn">{t.addDoc}</button>
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
                      ].map(([v, label], i) => (
                        <div key={i} style={{ background: '#f8f7f4', borderRadius: 7, padding: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: riskColor(v || 0) }}>{v || '—'}</div>
                          <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* James Analysis */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>J</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e' }}>{t.analysisTitle}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 9, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                      {t.live}
                    </div>
                  </div>
                  {findings.length === 0 && <div style={{ fontSize: 11, color: '#9ca3af', padding: '10px 0' }}>{t.questionFallback}</div>}
                  {findings.map((f, i) => {
                    const fColor = f.impact === 'high' || f.type === 'risk' ? '#dc2626' : f.impact === 'low' || f.type === 'opportunity' ? '#16a34a' : '#f59e0b';
                    return (
                      <div key={i} style={{ padding: '9px 0', borderBottom: i < findings.length - 1 ? '0.5px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: fColor, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: (f.text || '').replace(/\*\*(.*?)\*\*/g, '<b style="color:#1a1a2e;font-weight:600">$1</b>') }} />
                          {f.legal_ref && (
                            <div style={{ marginTop: 5, padding: '5px 9px', background: '#eff6ff', borderLeft: '2px solid #1a56db', borderRadius: '0 5px 5px 0' }}>
                              <div style={{ fontSize: 9, fontWeight: 600, color: '#1d4ed8' }}>{f.legal_ref}</div>
                              {f.jurisprudence && <div style={{ fontSize: 8, color: '#3b82f6', marginTop: 1 }}>{f.jurisprudence}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* James Question Card */}
                {sc.key_insight && (
                  <div style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #fde68a', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1a1a2e', marginBottom: 5 }}>💬 {t.questionTitle}</div>
                    <div style={{ fontSize: 10, color: '#78350f', lineHeight: 1.6 }}>{sc.key_insight}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={() => navigate('/upload')} style={{ padding: '5px 14px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 7, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>{t.addDoc}</button>
                      <button onClick={() => navigate('/lawyers')} style={{ padding: '5px 14px', background: '#fff', color: '#374151', border: '0.5px solid #e2e0db', borderRadius: 7, fontSize: 9, fontWeight: 500, cursor: 'pointer' }}>{t.talkLawyer}</button>
                    </div>
                  </div>
                )}
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
          {steps.length > 0 && (
            <>
              <div style={{ padding: '8px 14px 4px', fontSize: 9, fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.nextActions}</div>
              {steps.map((s, i) => {
                const sTitle = typeof s === 'string' ? s : (s.title || s.titre || '');
                const sDesc = typeof s === 'string' ? '' : (s.description || s.why_important || '');
                return (
                  <div key={i} data-testid={`action-item-${i}`} style={{
                    margin: '0 8px 4px', padding: '8px 10px', background: '#fff', borderRadius: 8, border: '0.5px solid #e2e0db',
                    display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#1a56db'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e0db'; }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1a56db', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#1a1a2e' }}>{sTitle}</div>
                      {sDesc && <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>{sDesc}</div>}
                    </div>
                  </div>
                );
              })}
            </>
          )}

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

          {/* Battle Preview */}
          {bp && (
            <>
              <div style={{ padding: '8px 14px 4px', fontSize: 9, fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Battle Preview</div>
              <div style={{ margin: 8, padding: 10, background: '#f8f7f4', borderRadius: 9, border: '0.5px solid #e2e0db' }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>{t.battleTitle}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 6, padding: 6 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#16a34a', marginBottom: 3 }}>{t.yourArgs}</div>
                    {(bp.user_side?.strongest_arguments || bp.user_arguments || bp.our_arguments || []).slice(0, 3).map((a, i) => (
                      <div key={i} style={{ fontSize: 9, color: '#374151', padding: '2px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', lineHeight: 1.4 }}>{typeof a === 'string' ? a : a.argument || a.text || ''}</div>
                    ))}
                  </div>
                  <div style={{ background: '#fff5f5', border: '0.5px solid #fca5a5', borderRadius: 6, padding: 6 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#dc2626', marginBottom: 3 }}>{t.theirArgs}</div>
                    {(bp.opposing_side?.strongest_arguments || bp.opposing_arguments || []).slice(0, 3).map((a, i) => (
                      <div key={i} style={{ fontSize: 9, color: '#374151', padding: '2px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', lineHeight: 1.4 }}>{typeof a === 'string' ? a : a.argument || a.text || ''}</div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

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
              <button data-testid="back-to-dashboard" onClick={() => setShowOverlay(false)} style={{
                marginTop: 14, fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
              }}>← {t.backDash}</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
