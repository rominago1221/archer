import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, FileText, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ─── Situation cards for new case overlay ─── */
const SITUATIONS = [
  { icon: '\u{1F3E0}', title: "Mon propri\u00e9taire me cause des probl\u00e8mes", desc: "Expulsion, loyer, r\u00e9parations, d\u00e9p\u00f4t", type: 'housing' },
  { icon: '\u26A1', title: "J'ai re\u00e7u une lettre mena\u00e7ante", desc: "Mise en demeure, avocat, huissier", type: 'debt' },
  { icon: '\u{1F4BC}', title: "Mon employeur me pose des probl\u00e8mes", desc: "Licenciement, salaires, harc\u00e8lement", type: 'employment' },
  { icon: '\u{1F6E1}\uFE0F', title: "Mon assurance refuse de payer", desc: "Refus de remboursement, sinistre", type: 'insurance' },
  { icon: '\u{1F4C4}', title: "J'ai sign\u00e9 quelque chose d'inqui\u00e9tant", desc: "Contrat, NDA, accord, engagement", type: 'contract' },
  { icon: '\u2696\uFE0F', title: "J'ai re\u00e7u une convocation au tribunal", desc: "Jugement, dette, citation, audience", type: 'court' },
  { icon: '\u{1F4B3}', title: "On me r\u00e9clame une dette", desc: "Collecteur, huissier, recouvrement", type: 'debt_collection' },
  { icon: '\u{1F4AC}', title: "Autre situation juridique", desc: "D\u00e9crivez votre probl\u00e8me \u00e0 James", type: 'other' },
];

/* ─── Risk color helper ─── */
const riskColor = (score) => {
  if (score >= 70) return '#dc2626';
  if (score >= 40) return '#f59e0b';
  return '#16a34a';
};

const riskLevel = (score) => {
  if (score >= 70) return 'Risque \u00e9lev\u00e9';
  if (score >= 40) return 'Risque mod\u00e9r\u00e9';
  return 'Risque faible';
};

const typeLabel = (type) => {
  const map = { housing: '\u{1F3E0} Dossier logement', employment: '\u{1F4BC} Dossier emploi', debt: '\u26A1 Dossier dette',
    contract: '\u{1F4C4} Dossier contrat', insurance: '\u{1F6E1}\uFE0F Dossier assurance', court: '\u2696\uFE0F Dossier tribunal',
    debt_collection: '\u{1F4B3} Dossier recouvrement', consumer: '\u{1F6E1}\uFE0F Dossier consommation', family: '\u{1F3E0} Dossier famille',
    other: '\u{1F4C4} Dossier juridique' };
  return map[type] || '\u{1F4C4} Dossier juridique';
};

const typeBadgeColor = (type) => {
  const map = { housing: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }, employment: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    debt: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }, contract: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
    insurance: { bg: '#f0fdf4', text: '#166534', border: '#86efac' } };
  return map[type] || { bg: '#f5f5f5', text: '#555', border: '#e5e5e5' };
};

/* ─── Finding text extractor ─── */
const findingText = (f) => {
  if (typeof f === 'string') return f;
  return f.text || f.texte || f.description || f.constatation || f.issue || f.details || f.finding || JSON.stringify(f);
};

/* ─── Main Dashboard ─── */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);

  // New case flow state
  const [newCaseStep, setNewCaseStep] = useState('select'); // 'select' | 'chat' | 'upload' | 'analyzing'
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  // Load cases
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await axios.get(`${API}/cases`, { withCredentials: true });
        const sorted = res.data.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
        setCases(sorted);
        if (sorted.length > 0) setSelectedCase(sorted[0]);
      } catch (e) { /* ok */ }
      setLoading(false);
    };
    fetchCases();
  }, []);

  const selectCase = (c) => setSelectedCase(c);

  // New case: situation selected -> James asks questions
  const handleSituationSelect = (sit) => {
    setSelectedSituation(sit);
    setNewCaseStep('chat');
    setQuestionIndex(0);
    const questions = getQuestionsForType(sit.type);
    setChatMessages([
      { role: 'james', text: `Je prends votre dossier en charge. ${sit.title.toLowerCase()} \u2014 je connais bien ce type de situation.` },
      { role: 'james', text: questions[0] }
    ]);
  };

  const getQuestionsForType = (type) => {
    const base = [
      "Pour commencer, pouvez-vous me d\u00e9crire bri\u00e8vement votre situation en quelques phrases ?",
      "Quand est-ce que cette situation a commenc\u00e9 ? Y a-t-il une date ou un d\u00e9lai important \u00e0 respecter ?",
      "Avez-vous d\u00e9j\u00e0 re\u00e7u ou envoy\u00e9 des documents li\u00e9s \u00e0 cette affaire ? (lettres, contrats, emails...)",
      "Parfait. Si vous avez un document \u00e0 me montrer, t\u00e9l\u00e9versez-le maintenant. Sinon, je lance l'analyse avec ce que vous m'avez dit."
    ];
    return base;
  };

  const handleChatSend = () => {
    if (!chatInput.trim() || chatSending) return;
    const text = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text }]);

    const questions = getQuestionsForType(selectedSituation?.type);
    const nextQ = questionIndex + 1;

    if (nextQ < questions.length - 1) {
      setQuestionIndex(nextQ);
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'james', text: questions[nextQ] }]);
      }, 600);
    } else {
      // Last question = upload prompt
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'james', text: questions[questions.length - 1] }]);
        setNewCaseStep('upload');
      }, 600);
    }
  };

  const handleUploadAndAnalyze = () => {
    // Navigate to upload page to use existing upload flow
    setShowOverlay(false);
    navigate('/upload');
  };

  const handleSkipUpload = () => {
    setShowOverlay(false);
    navigate('/upload');
  };

  // ─── Derived data for selected case ───
  const sc = selectedCase;
  const scColor = sc ? riskColor(sc.risk_score || 0) : '#999';
  const scDaysLeft = sc?.deadline ? Math.ceil((new Date(sc.deadline) - new Date()) / 86400000) : null;
  const findings = sc?.ai_findings || [];
  const nextSteps = sc?.ai_next_steps || sc?.immediate_actions || [];
  const battle = sc?.battle_preview || {};
  const userArgs = battle?.user_side?.strong_arguments || [];
  const oppArgs = battle?.opposing_side?.strong_arguments || battle?.opposing_side?.arguments_probables || [];
  const laws = sc?.applicable_laws || [];
  const docs = []; // We'll show doc_count from case
  const docCount = sc?.document_count || 0;

  if (loading) {
    return <div className="-m-7 flex items-center justify-center" style={{ height: '680px', background: '#f8f7f4' }}><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>;
  }

  return (
    <div className="-m-7" data-testid="dashboard-cabinet">
      <style>{`
        @keyframes jcPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 240px', height: '680px', background: '#f8f7f4', borderRadius: '16px', overflow: 'hidden', border: '0.5px solid #e2e0db', width: '100%', position: 'relative', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#1a1a2e' }}>

        {/* ════════ LEFT SIDEBAR ════════ */}
        <div style={{ background: '#fff', borderRight: '0.5px solid #e2e0db', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} data-testid="cabinet-sidebar">
          {/* Logo */}
          <div style={{ padding: '18px 14px 14px', borderBottom: '0.5px solid #f0ede8' }}>
            <div style={{ fontSize: '19px', fontWeight: 600, letterSpacing: '-0.8px', marginBottom: '1px' }}>Jas<span style={{ color: '#1a56db' }}>per</span></div>
            <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.3px' }}>Votre cabinet juridique virtuel</div>
          </div>

          {/* James card */}
          <div style={{ margin: '10px', padding: '11px', background: '#eff6ff', borderRadius: '11px', border: '0.5px solid #bfdbfe' }} data-testid="james-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>J</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>James</div>
                <div style={{ fontSize: '9px', color: '#3b82f6' }}>Senior Legal Advisor</div>
              </div>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', marginLeft: 'auto', animation: 'jcPulse 1.5s infinite' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {[{ v: '847K+', l: 'sources live' }, { v: '20 ans', l: "exp\u00e9rience" }, { v: 'Live', l: 'jurisprudence' }, { v: '#1', l: 'IA juridique' }].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '5px 7px', fontSize: '9px', color: '#1e40af', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#1a56db' }}>{s.v}</span>{s.l}
                </div>
              ))}
            </div>
          </div>

          {/* Active cases */}
          <div style={{ padding: '8px 14px 4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af', fontWeight: 600 }}>Dossiers actifs</div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {cases.slice(0, 8).map((c) => {
              const isActive = sc?.case_id === c.case_id;
              const color = riskColor(c.risk_score || 0);
              const dl = c.deadline ? Math.ceil((new Date(c.deadline) - new Date()) / 86400000) : null;
              return (
                <div key={c.case_id} onClick={() => selectCase(c)}
                  style={{ margin: '2px 7px', padding: '9px', borderRadius: '9px', cursor: 'pointer', border: `0.5px solid ${isActive ? '#bfdbfe' : 'transparent'}`, background: isActive ? '#eff6ff' : 'transparent', transition: 'background 0.1s' }}
                  data-testid={`sidebar-case-${c.case_id}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '3px' }} />
                    <div style={{ fontSize: '11px', fontWeight: 500, flex: 1, lineHeight: 1.3 }}>{c.title || 'Sans titre'}</div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color, whiteSpace: 'nowrap', marginLeft: 'auto' }}>{c.risk_score || '—'}</div>
                  </div>
                  <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px', marginLeft: '14px' }}>
                    {(c.type || 'Autre').charAt(0).toUpperCase() + (c.type || 'autre').slice(1)} · {c.document_count || 0} document{(c.document_count || 0) !== 1 ? 's' : ''}
                  </div>
                  {dl !== null && dl <= 14 && (
                    <div style={{ fontSize: '9px', fontWeight: 500, marginTop: '2px', marginLeft: '14px', color: dl <= 3 ? '#dc2626' : dl <= 7 ? '#f59e0b' : '#6b7280' }}>
                      {dl <= 0 ? 'D\u00e9lai expir\u00e9' : dl <= 3 ? `\u26A1 \u00c9ch\u00e9ance dans ${dl} jour${dl > 1 ? 's' : ''}` : `R\u00e9ponse dans ${dl} jours`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Spacer + New case button */}
          <div style={{ flex: '0 0 auto' }} />
          <button onClick={() => { setShowOverlay(true); setNewCaseStep('select'); setSelectedSituation(null); setChatMessages([]); }}
            style={{ margin: '10px', padding: '10px', background: '#1a56db', color: '#fff', borderRadius: '9px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', border: 'none', width: 'calc(100% - 20px)' }}
            data-testid="new-case-btn">
            <Plus size={13} strokeWidth={2.5} /> Ouvrir un nouveau dossier
          </button>
        </div>

        {/* ════════ MAIN AREA ════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* James banner */}
          <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '0.5px solid #e2e0db', display: 'flex', alignItems: 'center', gap: '12px' }} data-testid="james-banner">
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0, position: 'relative' }}>
              J
              <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-0.3px' }}>James analyse votre dossier en temps r\u00e9el</div>
              <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '1px' }}>IA juridique · 20 ans d'exp\u00e9rience senior · Jurisprudence live</div>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
              {['847K+ sources', 'Live', '\u26A1 Action requise'].map((cred, i) => (
                <div key={i} style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '20px', fontWeight: 500, whiteSpace: 'nowrap',
                  background: i === 2 ? '#fef3c7' : '#f3f4f6', color: i === 2 ? '#92400e' : '#6b7280', border: i === 2 ? '0.5px solid #fde68a' : '0.5px solid #e5e7eb' }}>
                  {cred}
                </div>
              ))}
            </div>
          </div>

          {/* Case view */}
          {sc ? (
            <div style={{ flex: 1, padding: '18px 20px', overflowY: 'auto' }} data-testid="case-view">
              {/* Type badge */}
              {(() => { const bc = typeBadgeColor(sc.type); return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '9px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', marginBottom: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', background: bc.bg, color: bc.text, border: `0.5px solid ${bc.border}` }}>{typeLabel(sc.type)}</div>
              ); })()}

              {/* Title */}
              <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.8px', marginBottom: '3px' }} data-testid="case-title">{sc.title || 'Sans titre'}</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '14px' }}>
                Ouvert le {new Date(sc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · {docCount} document{docCount !== 1 ? 's' : ''} · Mis \u00e0 jour {sc.updated_at ? 'par James' : 'aujourd\'hui'}
              </div>

              {/* Score row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px', alignItems: 'center', background: '#fff', borderRadius: '12px', padding: '14px 18px', marginBottom: '10px', border: '0.5px solid #e2e0db' }} data-testid="score-row">
                <div>
                  <div style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Score de risque Jasper</div>
                  <div style={{ fontSize: '52px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, color: scColor }} data-testid="risk-score-big">{sc.risk_score || '—'}</div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: scColor, marginTop: '2px' }}>{riskLevel(sc.risk_score || 0)}</div>
                </div>
                <div>
                  <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden', marginBottom: '9px' }}>
                    <div style={{ height: '100%', borderRadius: '3px', background: scColor, width: `${sc.risk_score || 0}%` }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                    {[
                      { v: sc.risk_financial || '—', l: 'Financier' },
                      { v: sc.risk_urgency || '—', l: 'Urgence' },
                      { v: sc.risk_legal_strength || '—', l: 'Juridique' },
                      { v: sc.risk_complexity || '—', l: 'Complexit\u00e9' },
                    ].map((d, i) => (
                      <div key={i} style={{ background: '#f8f7f4', borderRadius: '7px', padding: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: riskColor(typeof d.v === 'number' ? d.v : 50) }}>{d.v}</div>
                        <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '1px' }}>{d.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* James Analysis */}
              {findings.length > 0 && (
                <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 18px', marginBottom: '10px', border: '0.5px solid #e2e0db' }} data-testid="james-analysis">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff' }}>J</div>
                    <div style={{ fontSize: '11px', fontWeight: 600 }}>Analyse de James — Mise \u00e0 jour en temps r\u00e9el</div>
                    <div style={{ fontSize: '9px', color: '#22c55e', fontWeight: 600, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', animation: 'jcPulse 1.5s infinite' }} /> LIVE
                    </div>
                  </div>
                  {findings.slice(0, 3).map((f, i) => {
                    const fText = findingText(f);
                    const impact = typeof f === 'object' ? f.impact : null;
                    const dotColor = impact === 'high' || impact === '\u00e9lev\u00e9' ? '#dc2626' : impact === 'positive' || impact === 'positif' ? '#16a34a' : '#f59e0b';
                    const lawRef = typeof f === 'object' ? (f.legal_reference || f.reference_legale || f.base_legale) : null;
                    const lawName = typeof lawRef === 'object' ? (lawRef.name || lawRef.nom) : lawRef;
                    const lawDesc = typeof lawRef === 'object' ? (lawRef.description || lawRef.implication) : null;
                    return (
                      <div key={i} style={{ padding: '9px 0', borderBottom: i < Math.min(findings.length, 3) - 1 ? '0.5px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '4px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: fText.replace(/\*\*(.*?)\*\*/g, '<b style="color:#1a1a2e;font-weight:600">$1</b>') }} />
                          {lawName && (
                            <div style={{ marginTop: '5px', padding: '5px 9px', background: '#eff6ff', borderLeft: '2px solid #1a56db', borderRadius: '0 5px 5px 0' }}>
                              <div style={{ fontSize: '9px', fontWeight: 600, color: '#1d4ed8' }}>{lawName}</div>
                              {lawDesc && <div style={{ fontSize: '8px', color: '#3b82f6', marginTop: '1px' }}>{lawDesc}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Applicable laws from case data */}
                  {laws.length > 0 && findings.every(f => !f.legal_reference && !f.reference_legale) && (
                    <div style={{ marginTop: '8px' }}>
                      {laws.slice(0, 2).map((law, i) => (
                        <div key={i} style={{ marginTop: '5px', padding: '5px 9px', background: '#eff6ff', borderLeft: '2px solid #1a56db', borderRadius: '0 5px 5px 0' }}>
                          <div style={{ fontSize: '9px', fontWeight: 600, color: '#1d4ed8' }}>{typeof law === 'string' ? law : law.name || law.nom || law.reference}</div>
                          {typeof law === 'object' && (law.description || law.implication) && <div style={{ fontSize: '8px', color: '#3b82f6', marginTop: '1px' }}>{law.description || law.implication}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* James question card */}
              {sc.ai_summary && (
                <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px' }} data-testid="james-question">
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>{'\u{1F4AC}'} James a besoin d'une pr\u00e9cision</div>
                  <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.6, marginBottom: '9px' }}>
                    Pour approfondir votre d\u00e9fense, j'ai besoin de savoir : <b>avez-vous des documents suppl\u00e9mentaires li\u00e9s \u00e0 cette affaire ?</b> Cela pourrait renforcer significativement votre position.
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/upload')} style={{ fontSize: '10px', padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', fontWeight: 500, background: '#1a56db', color: '#fff', border: 'none' }} data-testid="james-q-yes">Oui, j'ai des documents</button>
                    <button style={{ fontSize: '10px', padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', fontWeight: 500, background: '#fff', color: '#374151', border: '0.5px solid #e2e0db' }}>Non, pas pour l'instant</button>
                    <button onClick={() => navigate('/chat')} style={{ fontSize: '10px', padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', fontWeight: 500, background: '#fff', color: '#374151', border: '0.5px solid #e2e0db' }}>Parler \u00e0 James</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{'\u{1F4C2}'}</div>
                Aucun dossier s\u00e9lectionn\u00e9
                <div style={{ marginTop: '8px' }}>
                  <button onClick={() => setShowOverlay(true)} style={{ fontSize: '11px', padding: '8px 16px', borderRadius: '8px', background: '#1a56db', color: '#fff', border: 'none', cursor: 'pointer' }}>Ouvrir un nouveau dossier</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════════ RIGHT PANEL ════════ */}
        <div style={{ background: '#fff', borderLeft: '0.5px solid #e2e0db', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} data-testid="right-panel">
          <div style={{ padding: '14px', borderBottom: '0.5px solid #f0ede8', fontSize: '11px', fontWeight: 600 }}>Vue d'ensemble</div>

          {sc ? (
            <>
              {/* Deadline card */}
              {scDaysLeft !== null && scDaysLeft <= 14 && (
                <div style={{ margin: '10px', padding: '11px', background: scDaysLeft <= 3 ? '#fff5f5' : '#fffbeb', border: `0.5px solid ${scDaysLeft <= 3 ? '#fecaca' : '#fde68a'}`, borderRadius: '9px' }} data-testid="deadline-card">
                  <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: scDaysLeft <= 3 ? '#dc2626' : '#d97706', fontWeight: 700, marginBottom: '3px' }}>{'\u26A1'} \u00c9ch\u00e9ance critique</div>
                  <div style={{ fontSize: '30px', fontWeight: 800, color: scDaysLeft <= 3 ? '#dc2626' : '#d97706', letterSpacing: '-1px', lineHeight: 1 }}>
                    {scDaysLeft <= 0 ? 'Expir\u00e9' : `${scDaysLeft} jour${scDaysLeft > 1 ? 's' : ''}`}
                  </div>
                  <div style={{ fontSize: '9px', color: scDaysLeft <= 3 ? '#991b1b' : '#92400e', marginTop: '2px' }}>
                    {sc.deadline_description || `R\u00e9pondre avant le ${new Date(sc.deadline).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
              )}

              {/* Next actions */}
              {nextSteps.length > 0 && (
                <>
                  <div style={{ padding: '9px 12px 3px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', fontWeight: 600 }}>Prochaines actions</div>
                  {nextSteps.slice(0, 3).map((step, i) => {
                    const stepText = typeof step === 'string' ? step : step.action || step.titre || step.title || JSON.stringify(step);
                    const stepDesc = typeof step === 'object' ? (step.description || step.detail || step.why || step.pourquoi || '') : '';
                    return (
                      <div key={i} style={{ margin: '3px 8px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #e2e0db', cursor: 'pointer' }} data-testid={`action-${i}`}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#1a56db', color: '#fff', fontSize: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>{i + 1}</div>
                        <div style={{ fontSize: '10px', fontWeight: 500 }}>{stepText.length > 80 ? stepText.slice(0, 80) + '...' : stepText}</div>
                        {stepDesc && <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '1px' }}>{stepDesc.length > 60 ? stepDesc.slice(0, 60) + '...' : stepDesc}</div>}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Documents */}
              <div style={{ padding: '9px 12px 3px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', fontWeight: 600 }}>Documents</div>
              {docCount > 0 ? (
                <div onClick={() => navigate(`/cases/${sc.case_id}`)} style={{ margin: '3px 8px', padding: '6px 8px', borderRadius: '7px', border: '0.5px solid #e2e0db', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={11} color="#1a56db" />
                  </div>
                  <div style={{ fontSize: '10px', color: '#374151', flex: 1 }}>{sc.title?.length > 25 ? sc.title.slice(0, 25) + '...' : sc.title}</div>
                  <div style={{ fontSize: '8px', background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>Cl\u00e9</div>
                </div>
              ) : (
                <div style={{ margin: '3px 8px', fontSize: '9px', color: '#9ca3af', padding: '6px' }}>Aucun document</div>
              )}

              {/* Battle Preview */}
              {(userArgs.length > 0 || oppArgs.length > 0) && (
                <>
                  <div style={{ padding: '9px 12px 3px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', fontWeight: 600 }}>Battle Preview</div>
                  <div style={{ margin: '8px', padding: '10px', background: '#f8f7f4', borderRadius: '9px', border: '0.5px solid #e2e0db' }} data-testid="battle-mini">
                    <div style={{ fontSize: '9px', fontWeight: 600, marginBottom: '6px' }}>James vs Avocat adverse</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      {/* Your arguments */}
                      <div style={{ borderRadius: '6px', padding: '6px', background: '#f0fdf4', border: '0.5px solid #86efac' }}>
                        <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#16a34a', marginBottom: '3px' }}>Vos arguments</div>
                        {userArgs.slice(0, 3).map((a, i) => {
                          const argText = typeof a === 'string' ? a : a.argument || a.titre || '';
                          return <div key={i} style={{ fontSize: '9px', color: '#374151', padding: '2px 0', borderBottom: i < 2 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', lineHeight: 1.4 }}>{argText.length > 50 ? argText.slice(0, 50) + '...' : argText}</div>;
                        })}
                      </div>
                      {/* Their arguments */}
                      <div style={{ borderRadius: '6px', padding: '6px', background: '#fff5f5', border: '0.5px solid #fca5a5' }}>
                        <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#dc2626', marginBottom: '3px' }}>Leurs arguments</div>
                        {oppArgs.slice(0, 3).map((a, i) => {
                          const argText = typeof a === 'string' ? a : a.argument || a.titre || '';
                          return <div key={i} style={{ fontSize: '9px', color: '#374151', padding: '2px 0', borderBottom: i < 2 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', lineHeight: 1.4 }}>{argText.length > 50 ? argText.slice(0, 50) + '...' : argText}</div>;
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '10px', color: '#9ca3af' }}>S\u00e9lectionnez un dossier</div>
          )}
        </div>

        {/* ════════ NEW CASE OVERLAY ════════ */}
        {showOverlay && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(248,247,244,0.97)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} data-testid="new-case-overlay">
            <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', maxWidth: '480px', width: '100%', border: '0.5px solid #e2e0db', margin: '16px' }}>
              {newCaseStep === 'select' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>J</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.8px' }}>Quel est votre probl\u00e8me ?</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '16px', marginLeft: '44px' }}>James va prendre votre dossier en charge imm\u00e9diatement.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {SITUATIONS.map((sit, i) => (
                      <div key={i} onClick={() => handleSituationSelect(sit)}
                        style={{ padding: '11px', borderRadius: '10px', border: '0.5px solid #e2e0db', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.background = '#eff6ff'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; e.currentTarget.style.background = 'transparent'; }}
                        data-testid={`situation-${sit.type}`}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px' }}>{sit.icon}</div>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px', lineHeight: 1.3 }}>{sit.title}</div>
                          <div style={{ fontSize: '9px', color: '#6b7280', lineHeight: 1.3 }}>{sit.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowOverlay(false)} style={{ marginTop: '12px', textAlign: 'right', fontSize: '10px', color: '#6b7280', cursor: 'pointer', background: 'none', border: 'none', width: '100%' }} data-testid="overlay-back">
                    {'\u2190'} Retour au dashboard
                  </button>
                </>
              )}

              {(newCaseStep === 'chat' || newCaseStep === 'upload') && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>J</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.5px' }}>{selectedSituation?.title}</div>
                      <div style={{ fontSize: '9px', color: '#6b7280' }}>James prend en charge votre dossier</div>
                    </div>
                  </div>

                  {/* Chat messages */}
                  <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                    {chatMessages.map((m, i) => (
                      <div key={i} style={{ marginBottom: '8px', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: m.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px', fontSize: '11px', lineHeight: 1.5,
                          background: m.role === 'user' ? '#1a56db' : '#f8f7f4', color: m.role === 'user' ? '#fff' : '#374151', border: m.role === 'user' ? 'none' : '0.5px solid #e2e0db' }}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {newCaseStep === 'chat' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleChatSend(); }}
                        placeholder="R\u00e9pondez \u00e0 James..." style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '0.5px solid #e2e0db', fontSize: '11px', outline: 'none' }}
                        data-testid="chat-input-overlay" />
                      <button onClick={handleChatSend} style={{ padding: '8px 14px', borderRadius: '8px', background: '#1a56db', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }} data-testid="chat-send-overlay">Envoyer</button>
                    </div>
                  )}

                  {newCaseStep === 'upload' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={handleUploadAndAnalyze} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#1a56db', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }} data-testid="upload-doc-btn">
                        T\u00e9l\u00e9verser un document
                      </button>
                      <button onClick={handleSkipUpload} style={{ padding: '10px 14px', borderRadius: '8px', background: '#f5f5f5', color: '#555', border: '0.5px solid #e2e0db', fontSize: '11px', cursor: 'pointer' }} data-testid="skip-upload-btn">
                        Passer
                      </button>
                    </div>
                  )}

                  <button onClick={() => { setNewCaseStep('select'); setChatMessages([]); }} style={{ marginTop: '10px', fontSize: '10px', color: '#6b7280', cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'right' }}>
                    {'\u2190'} Changer de situation
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
