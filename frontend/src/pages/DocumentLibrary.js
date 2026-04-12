import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { FileText, Search, Send, Download, Pen, ArrowUp, Loader2, Check, Lock, ChevronRight, X, Shield, Briefcase, Home, Code, CreditCard, Users, Info } from 'lucide-react';
import { formatBoldText, safePrintContent } from '../utils/sanitize';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const extractDocument = (text) => { const m = text.match(/<DOCUMENT>([\s\S]*?)<\/DOCUMENT>/); return m ? m[1].trim() : null; };
const stripDocumentTags = (text) => text.replace(/<DOCUMENT>[\s\S]*?<\/DOCUMENT>/g, '').trim();

const JA = ({ s = 26 }) => (
  <div style={{ position: 'relative', flexShrink: 0 }}>
    <div style={{ width: s, height: s, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: s * 0.42 }}>J</div>
    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #fff' }} />
  </div>
);

const CATS = [
  { key: 'employment', name: 'Employment', icon: Briefcase, bg: '#eff6ff', stroke: '#1a56db', count: 22 },
  { key: 'housing', name: 'Housing', icon: Home, bg: '#f0fdf4', stroke: '#16a34a', count: 18 },
  { key: 'nda', name: 'NDA', icon: Shield, bg: '#fdf4ff', stroke: '#7c3aed', count: 8 },
  { key: 'business', name: 'Business', icon: FileText, bg: '#fff7ed', stroke: '#d97706', count: 20 },
  { key: 'debt', name: 'Debt & Finance', icon: CreditCard, bg: '#fff5f5', stroke: '#dc2626', count: 10 },
  { key: 'family', name: 'Family', icon: Users, bg: '#f0fdf4', stroke: '#16a34a', count: 12 },
  { key: 'freelance', name: 'Freelance', icon: Code, bg: '#eff6ff', stroke: '#1a56db', count: 10 },
  { key: 'consumer', name: 'Consumer', icon: Info, bg: '#fdf4ff', stroke: '#7c3aed', count: 12 },
  { key: 'realestate', name: 'Real Estate', icon: Home, bg: '#f0fdf4', stroke: '#16a34a', count: 10 },
  { key: 'ip', name: 'IP', icon: Shield, bg: '#fdf4ff', stroke: '#7c3aed', count: 8 },
  { key: 'court', name: 'Court', icon: FileText, bg: '#fff5f5', stroke: '#dc2626', count: 8 },
  { key: 'immigration', name: 'Immigration', icon: Users, bg: '#eff6ff', stroke: '#1a56db', count: 8 },
  { key: 'government', name: 'Government', icon: Info, bg: '#fff7ed', stroke: '#d97706', count: 7 },
  { key: 'education', name: 'Education', icon: Briefcase, bg: '#eff6ff', stroke: '#1a56db', count: 5 },
];

const ALL_TEMPLATES = [
  // Employment (22)
  ...[['Employment Contract Full-Time','Standard full-time employment agreement'],['Employment Contract Part-Time','Part-time employment terms'],['Independent Contractor Agreement','IC agreement with scope of work'],['Freelance Services Agreement','Freelance project agreement'],['Offer Letter','Formal job offer'],['Termination Letter (With Cause)','Dismissal for cause'],['Termination Letter (Without Cause)','Termination without cause'],['Resignation Letter','Formal resignation notice'],['NDA Employee','Employee confidentiality agreement'],['Non-Compete Agreement','Post-employment non-compete'],['Non-Solicitation Agreement','Client/employee non-solicitation'],['Employee Handbook','Company policies and procedures'],['Remote Work Agreement','Remote/hybrid work terms'],['Confidentiality Agreement','General confidentiality terms'],['Performance Improvement Plan','PIP documentation'],['Warning Letter First','First written warning'],['Warning Letter Final','Final warning before termination'],['Severance Agreement','Severance terms and release'],['Reference Letter','Professional reference'],['Promotion Letter','Formal promotion notice'],['Pay Raise Letter','Salary increase confirmation'],['COBRA Notice','Health insurance continuation']].map(([n,d])=>({name:n,desc:d,cat:'employment'})),
  // Housing (18)
  ...[['Residential Lease Agreement','Standard residential lease'],['Commercial Lease','Commercial property lease'],['Month-to-Month Lease','Flexible monthly rental'],['Lease Renewal','Lease extension agreement'],['Lease Termination','Formal lease termination'],['Eviction Notice','Legal eviction notice'],['Security Deposit Demand','Deposit return demand'],['Roommate Agreement','Co-tenant living terms'],['Sublease Agreement','Subletting arrangement'],['Notice to Vacate','Tenant departure notice'],['Move-In Checklist','Property condition report'],['Property Management Agreement','PM services contract'],['Short-Term Rental Agreement','Airbnb/short-term lease'],['Rent Increase Notice','Formal rent increase'],['Repair Request Letter','Maintenance demand'],['Habitability Complaint','Living conditions complaint'],['Tenant Rights Letter','Tenant rights assertion'],['HOA Dispute','Homeowner association dispute']].map(([n,d])=>({name:n,desc:d,cat:'housing'})),
  // NDA (8)
  ...[['Mutual NDA','Two-way confidentiality'],['One-Way NDA','Unilateral disclosure'],['Employee NDA','Employer-employee NDA'],['Contractor NDA','Independent contractor NDA'],['Partnership NDA','Business partner NDA'],['Investor NDA','Investment discussions NDA'],['Technology NDA','Tech/IP disclosure NDA'],['Trade Secret Agreement','Trade secret protection']].map(([n,d])=>({name:n,desc:d,cat:'nda'})),
  // Business (20)
  ...[['Partnership Agreement','Business partnership terms'],['Operating Agreement LLC','LLC operating agreement'],['Shareholder Agreement','Shareholder rights & duties'],['Business Sale Agreement','Sale of business terms'],['Asset Purchase Agreement','Asset acquisition terms'],['Letter of Intent','Preliminary deal terms'],['MOU','Memorandum of Understanding'],['Consulting Agreement','Consulting engagement terms'],['Services Agreement','Professional services contract'],['Software License Agreement','Software licensing terms'],['SaaS Agreement','SaaS subscription terms'],['Terms of Service','Website/app ToS'],['Privacy Policy','Data privacy policy'],['Vendor Agreement','Vendor supply contract'],['Distribution Agreement','Product distribution terms'],['Joint Venture Agreement','JV partnership terms'],['Franchise Agreement','Franchise operations terms'],['Non-Solicitation Business','Business non-solicitation'],['Buy-Sell Agreement','Business buyout terms'],['IP Assignment','IP ownership transfer']].map(([n,d])=>({name:n,desc:d,cat:'business'})),
  // Freelance (10)
  ...[['Freelance Contract','General freelance agreement'],['Project Proposal','Formal project proposal'],['Statement of Work','Detailed scope of work'],['Creative Brief','Creative project brief'],['Photography Contract','Photography services'],['Web Design Contract','Web development terms'],['Content Creation Agreement','Content production terms'],['Social Media Contract','Social media management'],['Video Production Agreement','Video production terms'],['Coaching Agreement','Professional coaching terms']].map(([n,d])=>({name:n,desc:d,cat:'freelance'})),
  // Consumer (12)
  ...[['Demand Letter General','General legal demand'],['Demand Letter Payment','Payment demand notice'],['Consumer Complaint','Formal consumer complaint'],['Insurance Appeal Letter','Insurance claim appeal'],['Insurance Bad Faith Letter','Bad faith claim notice'],['Warranty Claim','Product warranty claim'],['Refund Demand','Refund request letter'],['Product Liability Letter','Product defect claim'],['Service Complaint','Service quality complaint'],['FDCPA Dispute','Debt collection dispute'],['Credit Dispute Letter','Credit report dispute'],['Identity Theft Affidavit','Identity theft report']].map(([n,d])=>({name:n,desc:d,cat:'consumer'})),
  // Debt (10)
  ...[['Debt Validation Letter','Debt verification request'],['Cease and Desist Debt','Stop collection demand'],['Payment Plan Agreement','Structured payment terms'],['Promissory Note','Formal promise to pay'],['Loan Agreement','Personal/business loan'],['Bill of Sale','Property sale receipt'],['Invoice Dispute','Invoice challenge letter'],['Debt Settlement Agreement','Reduced payment agreement'],['Bankruptcy Exemption Letter','Exemption claim letter'],['Judgment Satisfaction','Judgment paid confirmation']].map(([n,d])=>({name:n,desc:d,cat:'debt'})),
  // Family (12)
  ...[['Divorce Agreement','Divorce settlement terms'],['Child Custody Agreement','Custody arrangement'],['Child Support Agreement','Support payment terms'],['Prenuptial Agreement','Pre-marriage agreement'],['Cohabitation Agreement','Living together terms'],['Power of Attorney','Legal authority delegation'],['Healthcare Proxy','Medical decision authority'],['Living Will','End-of-life directives'],['Last Will and Testament','Estate distribution'],['Trust Agreement','Trust creation document'],['Guardianship Agreement','Guardian designation'],['Adoption Agreement','Adoption terms and consent']].map(([n,d])=>({name:n,desc:d,cat:'family'})),
  // Real Estate (10)
  ...[['Real Estate Purchase Agreement','Property purchase contract'],['Counter Offer Letter','Purchase counter-offer'],['Seller Disclosure','Property condition disclosure'],['Home Inspection Contingency','Inspection condition clause'],['Earnest Money Agreement','Good faith deposit terms'],['Title Dispute','Title ownership dispute'],['Boundary Dispute Letter','Property boundary claim'],['Easement Agreement','Property access rights'],['Quitclaim Deed','Property interest transfer'],['Mortgage Dispute','Mortgage issue complaint']].map(([n,d])=>({name:n,desc:d,cat:'realestate'})),
  // IP (8)
  ...[['Copyright Assignment','Copyright transfer'],['Trademark License','Trademark usage license'],['Patent License','Patent usage agreement'],['Work-for-Hire Agreement','IP ownership for hire'],['Open Source License','Open source terms'],['Domain Transfer Agreement','Domain name transfer'],['IP Indemnification','IP liability protection'],['Trade Secret IP','Trade secret assignment']].map(([n,d])=>({name:n,desc:d,cat:'ip'})),
  // Court (8)
  ...[['Cease and Desist','General C&D letter'],['Demand for Jury Trial','Jury trial request'],['Small Claims Statement','Small claims filing'],['Witness Statement','Formal witness account'],['Affidavit','Sworn statement'],['Subpoena Response','Subpoena reply letter'],['Court Complaint Letter','Formal court complaint'],['Motion to Dismiss Request','Dismissal request']].map(([n,d])=>({name:n,desc:d,cat:'court'})),
  // Immigration (5+3=8)
  ...[['Employment Sponsorship Letter','Visa sponsorship support'],['Support Letter','Immigration support'],['Invitation Letter','Visitor invitation'],['Character Reference Letter','Character reference'],['Naturalization Support Letter','Citizenship support'],['Asylum Support Letter','Asylum case support'],['Visa Extension Request','Visa renewal request'],['Travel Authorization Letter','Travel permission document']].map(([n,d])=>({name:n,desc:d,cat:'immigration'})),
  // Government & Tax (7)
  ...[['Tax Dispute Letter','IRS/tax authority dispute'],['FOIA Request','Freedom of Information request'],['Zoning Variance Request','Zoning exception request'],['Building Permit Appeal','Permit denial appeal'],['Government Complaint','Government agency complaint'],['Whistleblower Statement','Protected disclosure'],['Public Records Request','Public records demand']].map(([n,d])=>({name:n,desc:d,cat:'government'})),
  // Education (5)
  ...[['Student Accommodation Letter','Disability accommodation request'],['Academic Appeal Letter','Grade/disciplinary appeal'],['School Transfer Request','Transfer documentation'],['Tuition Dispute Letter','Tuition/fee dispute'],['Internship Agreement','Student internship terms']].map(([n,d])=>({name:n,desc:d,cat:'education'})),
];

const FILTER_PILLS = ['all','employment','housing','nda','business','freelance','consumer','debt','family','realestate','ip','court','immigration','government','education'];
const FILTER_LABELS = {all:'All',employment:'Employment',housing:'Housing',nda:'NDA',business:'Business',freelance:'Freelance',consumer:'Consumer',debt:'Debt',family:'Family',realestate:'Real Estate',ip:'IP',court:'Court',immigration:'Immigration',government:'Government',education:'Education'};

const SUGGESTIONS = {
  en: ['I need an NDA', 'Create a lease agreement', 'Draft a freelance contract', 'Write a demand letter'],
  fr: ["J'ai besoin d'un CDI", 'Créer un bail', 'Rédiger une lettre de licenciement', 'Contrat freelance'],
  nl: ['Ik heb een NDA nodig', 'Huurovereenkomst maken', 'Freelance contract opstellen', 'Aanmaningsbrief schrijven'],
};

const DocumentPreviewCard = ({ content, onEdit, onDownload, onSign }) => {
  const lines = content.split('\n').filter(l => l.trim());
  const title = lines.find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || 'Legal Document';
  const clauses = lines.filter(l => /^\d+[\.\)]|^##\s|^Article|^Section|^Clause/i.test(l.trim())).slice(0, 3);
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e0db', borderRadius: 10, padding: 14, marginTop: 8 }} data-testid="document-preview-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={13} color="#1a56db" /></div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{title}</div>
        </div>
        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 600, background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #86efac' }}>Ready to sign</span>
      </div>
      <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.6, marginBottom: 10 }}>{clauses.map((c, ci) => <div key={`clause-${ci}-${c.slice(0, 20)}`}>{c.replace(/^#+\s*/, '')}</div>)}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button onClick={onSign} data-testid="doc-send-signature" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 0', borderRadius: 20, fontSize: 10, fontWeight: 600, background: '#1a56db', color: '#fff', border: 'none', cursor: 'pointer' }}><Send size={10} />Send for signature</button>
        <button onClick={onDownload} data-testid="doc-download-pdf" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 0', borderRadius: 20, fontSize: 10, fontWeight: 500, background: '#fff', color: '#1a56db', border: '1px solid #1a56db', cursor: 'pointer' }}><Download size={10} />Download PDF</button>
        <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 20, fontSize: 10, fontWeight: 500, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}><Pen size={10} />Edit</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 7, background: '#f0fdf4', border: '0.5px solid #86efac' }}>
        <Shield size={10} color="#16a34a" /><span style={{ fontSize: 9, color: '#16a34a', fontWeight: 500 }}>HelloSign · Legally binding · Both parties notified</span>
      </div>
    </div>
  );
};

const SignModal = ({ onClose, onSend, loading }) => {
  const [signers, setSigners] = useState([{ name: '', email: '' }]);
  const [message, setMessage] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div data-testid="sign-modal" style={{ background: '#fff', borderRadius: 16, maxWidth: 420, width: '100%', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><div style={{ fontSize: 13, fontWeight: 600 }}>Who needs to sign?</div><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#999" /></button></div>
        {signers.map((s, si) => (<div key={`signer-${si}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}><input placeholder="Full name" value={s.name} onChange={e => { const n = [...signers]; n[si].name = e.target.value; setSigners(n); }} style={{ padding: '7px 10px', fontSize: 11, border: '0.5px solid #e2e0db', borderRadius: 7 }} data-testid={`signer-name-${si}`} /><input placeholder="Email" value={s.email} onChange={e => { const n = [...signers]; n[si].email = e.target.value; setSigners(n); }} style={{ padding: '7px 10px', fontSize: 11, border: '0.5px solid #e2e0db', borderRadius: 7 }} data-testid={`signer-email-${si}`} /></div>))}
        <button onClick={() => setSigners([...signers, { name: '', email: '' }])} style={{ fontSize: 10, color: '#1a56db', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>+ Add signer</button>
        <textarea placeholder="Message for signers (optional)" value={message} onChange={e => setMessage(e.target.value)} style={{ width: '100%', padding: '7px 10px', fontSize: 11, border: '0.5px solid #e2e0db', borderRadius: 7, resize: 'vertical', minHeight: 50, marginBottom: 10 }} data-testid="sign-message" />
        <button onClick={() => onSend(signers.filter(s => s.name && s.email), message)} disabled={loading} data-testid="confirm-sign-btn" style={{ width: '100%', padding: '10px 0', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#1a56db', color: '#fff', border: 'none', cursor: 'pointer' }}>{loading ? 'Sending...' : 'Send for signature'}</button>
      </div>
    </div>
  );
};

/* ═══ MAIN COMPONENT ═══ */
const DocumentLibrary = () => {
  const { user } = useAuth();
  const lang = (user?.language || 'en').replace(/-.*/, '');
  const [mode, setMode] = useState(() => localStorage.getItem('jasper_doc_mode') || 'generate');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [latestDocContent, setLatestDocContent] = useState(null);
  const [latestDocId, setLatestDocId] = useState(null);
  const [signModal, setSignModal] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [browseFilter, setBrowseFilter] = useState('all');
  const [browseSearch, setBrowseSearch] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const isPro = user?.plan === 'pro';
  const suggestions = SUGGESTIONS[lang] || SUGGESTIONS.en;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);
  useEffect(() => { localStorage.setItem('jasper_doc_mode', mode); }, [mode]);
  useEffect(() => {
    (async () => { try { const r = await axios.get(`${API}/documents/james/recent`, { withCredentials: true }); setRecentDocs(r.data); } catch (e) { console.error('Failed to load recent docs:', e); } })();
  }, [latestDocId]);

  const sendMessage = async (text) => {
    if (!text.trim() || sending || limitReached) return;
    setMessages(p => [...p, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const r = await axios.post(`${API}/documents/james/send`, { message: text, conversation_id: convId }, { withCredentials: true });
      if (r.data.limit_reached) { setLimitReached(true); setMessages(p => [...p, { role: 'assistant', content: r.data.response, limit: true }]); setSending(false); return; }
      setConvId(r.data.conversation_id);
      const doc = r.data.document_content;
      setMessages(p => [...p, { role: 'assistant', content: r.data.response, document: doc, docId: r.data.doc_id }]);
      if (doc) { setLatestDocContent(doc); setLatestDocId(r.data.doc_id); }
    } catch (e) { setMessages(p => [...p, { role: 'assistant', content: e.response?.data?.detail || 'Something went wrong.' }]); }
    setSending(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };
  const handleDownloadPdf = () => { if (!latestDocContent) return; safePrintContent(latestDocContent, 'Document'); };
  const handleSign = async (signers, msg) => { if (!signers.length || !latestDocId) return; setSignLoading(true); try { await axios.post(`${API}/library/sign`, { doc_id: latestDocId, signers, message: msg }, { withCredentials: true }); setSignModal(false); setMessages(p => [...p, { role: 'system', content: 'Signature request sent.' }]); } catch (e) { alert(e.response?.data?.detail || 'Failed'); } setSignLoading(false); };
  const startNew = () => { setMessages([]); setConvId(null); setLatestDocContent(null); setLatestDocId(null); setLimitReached(false); };
  const switchToGenerate = (name) => { setMode('generate'); setInput(`I need a ${name}`); setTimeout(() => inputRef.current?.focus(), 100); };

  const filteredTemplates = ALL_TEMPLATES.filter(t => {
    if (browseFilter !== 'all' && t.cat !== browseFilter) return false;
    if (browseSearch && !t.name.toLowerCase().includes(browseSearch.toLowerCase()) && !t.desc.toLowerCase().includes(browseSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div data-testid="document-library-page" style={{ position: 'fixed', inset: 0, display: 'grid', gridTemplateColumns: '220px 1fr', background: '#f4f4f1', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* ═══ LEFT SIDEBAR ═══ */}
      <div style={{ background: '#fafaf8', borderRight: '1px solid #e2e0db', display: 'flex', flexDirection: 'column' }} data-testid="doc-sidebar">
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #e2e0db' }}>
          <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.5px', color: '#1a1a2e', marginBottom: 14, cursor: 'pointer' }} onClick={() => window.location.href = '/'}>Jas<span style={{ color: '#1a56db' }}>per</span></div>
          <button onClick={() => { setMode('generate'); }} data-testid="mode-generate"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, fontSize: 12, border: mode === 'generate' ? '1px solid #e2e0db' : '1px solid transparent', background: mode === 'generate' ? '#fff' : 'transparent', color: mode === 'generate' ? '#1a56db' : '#6b7280', fontWeight: mode === 'generate' ? 500 : 400, cursor: 'pointer', marginBottom: 4 }}>
            <Pen size={13} color={mode === 'generate' ? '#1a56db' : '#9ca3af'} />Generate any document
          </button>
          <button onClick={() => setMode('browse')} data-testid="mode-browse"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, fontSize: 12, border: mode === 'browse' ? '1px solid #e2e0db' : '1px solid transparent', background: mode === 'browse' ? '#fff' : 'transparent', color: mode === 'browse' ? '#1a56db' : '#6b7280', fontWeight: mode === 'browse' ? 500 : 400, cursor: 'pointer', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Search size={13} color={mode === 'browse' ? '#1a56db' : '#9ca3af'} />Browse templates</span>
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: '#f3f4f6', color: '#9ca3af' }}>158</span>
          </button>
        </div>
        <div style={{ padding: '12px 14px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>Recent documents</div>
          {recentDocs.length === 0 && <div style={{ fontSize: 10, color: '#bbb', fontStyle: 'italic' }}>No documents yet</div>}
          {recentDocs.slice(0, 3).map(doc => (
            <div key={doc.doc_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 4px', cursor: 'pointer', borderRadius: 5 }} data-testid={`recent-doc-${doc.doc_id}`}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: '#fff', border: '1px solid #e2e0db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={9} color="#9ca3af" /></div>
              <span style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.document_title || 'Untitled'}</span>
            </div>
          ))}
        </div>
        {mode === 'generate' && messages.length > 0 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e0db' }}>
            <button onClick={startNew} data-testid="new-conversation-btn" style={{ width: '100%', fontSize: 10, fontWeight: 600, color: '#1a56db', background: 'none', border: 'none', cursor: 'pointer' }}>+ New document</button>
          </div>
        )}
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {mode === 'generate' ? (
          <>
            {/* Header */}
            <div style={{ padding: '28px 32px 0' }}>
              <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.7px', lineHeight: 1.1, color: '#1a1a2e', margin: 0 }}>
                Generate any document —<br />just describe <em style={{ fontStyle: 'normal', color: '#1a56db' }}>what you need.</em>
              </h1>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 18px' }}>James drafts it in seconds. Ready to sign.</p>
              {/* James strip */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e0db', borderLeft: '3px solid #1a56db', borderRadius: 9, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }} data-testid="james-identity-bar">
                <JA />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1a2e' }}>James · Senior Legal Advisor</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>20 years experience · 847K+ legal sources</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 500 }}>Available now</span>
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 32px' }} data-testid="chat-messages-area">
              {messages.length === 0 && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }} data-testid="james-opening-message">
                    <JA />
                    <div style={{ maxWidth: '85%', padding: '11px 14px', borderRadius: '3px 12px 12px 12px', background: '#ffffff', border: '1px solid #d1d5db', fontSize: 12, color: '#374151', lineHeight: 1.65 }}>
                      Tell me what document you need — in plain English. I'll ask a few questions and generate a complete, legally sound document.
                      <div style={{ marginTop: 6 }}><span style={{ color: '#1a56db', fontWeight: 500 }}>Examples:</span> 'I need an NDA for a new partner' · 'Create a lease in New York' · 'Write a freelance contract'</div>
                    </div>
                  </div>
                  {/* Category grid */}
                  <div style={{ paddingLeft: 34 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Or pick a category</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 7 }}>
                      {CATS.map(c => (
                        <div key={c.key} onClick={() => sendMessage(`I need a ${c.name.toLowerCase()} document`)} data-testid={`cat-card-${c.key}`}
                          style={{ padding: '11px 10px', border: '1px solid #e2e0db', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                          onMouseEnter={e => { e.currentTarget.style.border = '1.5px solid #1a56db'; e.currentTarget.style.background = '#eff6ff'; }}
                          onMouseLeave={e => { e.currentTarget.style.border = '1px solid #e2e0db'; e.currentTarget.style.background = '#ffffff'; }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                            <c.icon size={13} color={c.stroke} />
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 500, color: '#1a1a2e', lineHeight: 1.3 }}>{c.name}</div>
                          <div style={{ fontSize: 9, color: '#9ca3af' }}>{c.count} templates</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {messages.map((msg, i) => {
                const msgKey = msg.ts || `msg-${i}-${(msg.content || '').slice(0, 15)}`;
                if (msg.role === 'system') return <div key={msgKey} style={{ textAlign: 'center', fontSize: 11, color: '#16a34a', margin: '8px 0', fontWeight: 500 }}>{msg.content}</div>;
                if (msg.role === 'user') return (
                  <div key={msgKey} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    <div style={{ maxWidth: '70%', padding: '11px 14px', borderRadius: '12px 3px 12px 12px', background: '#1a56db', color: '#fff', fontSize: 12, lineHeight: 1.65 }}>{msg.content}</div>
                  </div>
                );
                const dt = stripDocumentTags(msg.content);
                return (
                  <div key={msgKey} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <JA />
                    <div style={{ maxWidth: '85%' }}>
                      <div style={{ padding: '11px 14px', borderRadius: '3px 12px 12px 12px', background: '#ffffff', border: '1px solid #d1d5db', fontSize: 12, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: formatBoldText(dt) }} />
                      {msg.document && <DocumentPreviewCard content={msg.document} onEdit={() => inputRef.current?.focus()} onDownload={handleDownloadPdf} onSign={() => setSignModal(true)} />}
                    </div>
                  </div>
                );
              })}
              {sending && <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}><JA /><div style={{ padding: '11px 14px', borderRadius: '3px 12px 12px 12px', background: '#ffffff', border: '1px solid #d1d5db', fontSize: 12, color: '#6b7280' }}>{latestDocContent ? 'James is updating the document' : messages.length > 2 ? 'James is drafting your document' : 'James is thinking'}...</div></div>}
              {limitReached && <div style={{ textAlign: 'center', padding: 16 }}><div style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 10, background: '#fefce8', border: '0.5px solid #fde68a', fontSize: 12, color: '#854d0e' }}><Lock size={12} style={{ display: 'inline', marginRight: 4 }} />3 free documents used. <a href="/settings" style={{ color: '#1a56db', fontWeight: 600 }}>Upgrade to Pro</a></div></div>}
              <div ref={chatEndRef} />
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e2e0db', background: '#f4f4f1', padding: '13px 32px' }} data-testid="input-area">
              {!limitReached && (
                <div style={{ display: 'flex', gap: 5, marginBottom: 9, overflowX: 'auto' }} data-testid="suggestion-chips">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => sendMessage(s)} data-testid={`suggestion-${s.slice(0, 15)}`}
                      style={{ flexShrink: 0, padding: '4px 11px', borderRadius: 16, fontSize: 11, border: '1px solid #e2e0db', color: '#6b7280', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.color = '#1a56db'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; e.currentTarget.style.color = '#6b7280'; }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={sending || limitReached}
                  placeholder="Describe the document you need..." data-testid="chat-input"
                  style={{ flex: 1, background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 9, padding: '10px 13px', fontSize: 12, outline: 'none' }} />
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending || limitReached} data-testid="send-btn"
                  style={{ width: 34, height: 34, borderRadius: 8, background: '#1a56db', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !input.trim() || sending ? 0.4 : 1 }}>
                  <ArrowUp size={15} color="#fff" />
                </button>
              </div>
              <p style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center', marginTop: 8, opacity: 0.55 }}>James generates documents for informational purposes · Not a substitute for legal advice · 158 document types</p>
            </div>
          </>
        ) : (
          /* ═══ BROWSE MODE ═══ */
          <>
            <div style={{ padding: '22px 28px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.5px', color: '#1a1a2e' }}>158 document templates</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, marginBottom: 14 }}>Pre-filled by James · Jurisdiction-specific · Ready to sign</div>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: 8, background: '#ffffff', padding: '0 10px' }}>
                <Search size={13} color="#9ca3af" style={{ opacity: 0.4 }} />
                <input value={browseSearch} onChange={e => setBrowseSearch(e.target.value)} placeholder="Search templates..."
                  style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 8px', fontSize: 12, color: '#374151', outline: 'none' }} data-testid="browse-search" />
              </div>
            </div>
            {/* Filter pills — max 6 visible + More */}
            <div style={{ display: 'flex', gap: 4, padding: '10px 28px', borderTop: '1px solid #e2e0db', borderBottom: '1px solid #e2e0db', alignItems: 'center' }} data-testid="browse-filter-pills">
              {FILTER_PILLS.slice(0, 6).map(f => (
                <button key={f} onClick={() => setBrowseFilter(f)} data-testid={`filter-pill-${f}`}
                  style={{ padding: '4px 12px', borderRadius: 16, fontSize: 11, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: browseFilter === f ? '#1a56db' : 'transparent', color: browseFilter === f ? '#fff' : '#6b7280', fontWeight: browseFilter === f ? 600 : 400 }}>
                  {FILTER_LABELS[f]}
                </button>
              ))}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowMoreFilters(!showMoreFilters)} data-testid="more-filters-btn"
                  style={{ padding: '4px 12px', borderRadius: 16, fontSize: 11, border: '1px solid #e2e0db', cursor: 'pointer', whiteSpace: 'nowrap', background: FILTER_PILLS.slice(6).includes(browseFilter) ? '#1a56db' : '#fff', color: FILTER_PILLS.slice(6).includes(browseFilter) ? '#fff' : '#6b7280' }}>
                  More +
                </button>
                {showMoreFilters && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #e2e0db', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, padding: 4, minWidth: 140 }}>
                    {FILTER_PILLS.slice(6).map(f => (
                      <button key={f} onClick={() => { setBrowseFilter(f); setShowMoreFilters(false); }} data-testid={`filter-pill-${f}`}
                        style={{ display: 'block', width: '100%', padding: '6px 12px', borderRadius: 8, fontSize: 11, border: 'none', cursor: 'pointer', textAlign: 'left', background: browseFilter === f ? '#eff6ff' : 'transparent', color: browseFilter === f ? '#1a56db' : '#374151', fontWeight: browseFilter === f ? 600 : 400 }}>
                        {FILTER_LABELS[f]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Template grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }} data-testid="template-grid">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {filteredTemplates.map((t) => {
                  const cat = CATS.find(c => c.key === t.cat) || CATS[0];
                  return (
                    <div key={t.name} onClick={() => switchToGenerate(t.name)} data-testid={`template-card-${t.name}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #e2e0db', borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s', background: '#ffffff' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.background = '#f8faff'; e.currentTarget.querySelector('.gen-link').style.opacity = 1; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.querySelector('.gen-link').style.opacity = 0; }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <cat.icon size={14} color={cat.stroke} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e' }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{t.desc}</div>
                      </div>
                      <span className="gen-link" style={{ fontSize: 11, color: '#1a56db', fontWeight: 600, opacity: 0, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}>Generate →</span>
                    </div>
                  );
                })}
              </div>
              {filteredTemplates.length === 0 && <div style={{ textAlign: 'center', padding: 40, fontSize: 12, color: '#9ca3af' }}>No templates found</div>}
            </div>
          </>
        )}
      </div>
      {signModal && <SignModal onClose={() => setSignModal(false)} onSend={handleSign} loading={signLoading} />}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
};

export default DocumentLibrary;
