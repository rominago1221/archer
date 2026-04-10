import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Search, FileText, Sparkles, Lock, X, Loader2, Download, Send, ChevronRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CAT_COLORS = {
  employment: { bg: '#eff6ff', text: '#1d4ed8', icon: '#3b82f6' },
  housing: { bg: '#f0fdf4', text: '#15803d', icon: '#22c55e' },
  business: { bg: '#fef3c7', text: '#92400e', icon: '#f59e0b' },
  nda: { bg: '#f5f3ff', text: '#6d28d9', icon: '#8b5cf6' },
  contracts: { bg: '#f0f9ff', text: '#075985', icon: '#0ea5e9' },
  consumer: { bg: '#fff5f5', text: '#991b1b', icon: '#ef4444' },
  debt: { bg: '#fef2f2', text: '#991b1b', icon: '#dc2626' },
  family: { bg: '#fdf2f8', text: '#9d174d', icon: '#ec4899' },
  realestate: { bg: '#ecfdf5', text: '#065f46', icon: '#10b981' },
  freelance: { bg: '#eff6ff', text: '#1e40af', icon: '#3b82f6' },
  ip: { bg: '#f5f3ff', text: '#5b21b6', icon: '#7c3aed' },
  court: { bg: '#f8fafc', text: '#334155', icon: '#64748b' },
  immigration: { bg: '#fefce8', text: '#854d0e', icon: '#eab308' },
};

const QUESTIONS = {
  default: [
    { key: 'party1_name', label: 'Your full legal name', placeholder: 'Michael Rodriguez' },
    { key: 'party2_name', label: 'Other party\'s name', placeholder: 'ABC Company Inc.' },
    { key: 'party2_address', label: 'Other party\'s address', placeholder: '123 Main St, City, State ZIP' },
    { key: 'effective_date', label: 'Effective date', placeholder: 'April 15, 2026', type: 'date' },
    { key: 'additional_terms', label: 'Any specific terms to include? (optional)', placeholder: 'E.g., payment terms, special conditions...', optional: true },
  ],
  employment: [
    { key: 'employee_name', label: 'Employee\'s full legal name', placeholder: 'Jane Smith' },
    { key: 'employer_name', label: 'Employer company name', placeholder: 'TechCorp Inc.' },
    { key: 'employer_address', label: 'Employer address', placeholder: '456 Business Ave, City, State ZIP' },
    { key: 'job_title', label: 'Job title', placeholder: 'Senior Software Engineer' },
    { key: 'start_date', label: 'Start date', placeholder: 'May 1, 2026', type: 'date' },
    { key: 'salary', label: 'Salary (annual)', placeholder: '$95,000' },
    { key: 'employment_type', label: 'Employment type', placeholder: 'Full-time / Part-time' },
    { key: 'probation_period', label: 'Probation period (if any)', placeholder: '90 days', optional: true },
  ],
  housing: [
    { key: 'tenant_name', label: 'Tenant\'s full legal name', placeholder: 'John Doe' },
    { key: 'landlord_name', label: 'Landlord\'s name', placeholder: 'Property Management LLC' },
    { key: 'property_address', label: 'Property address', placeholder: '789 Oak Lane, Apt 4, City, State ZIP' },
    { key: 'monthly_rent', label: 'Monthly rent amount', placeholder: '$2,400' },
    { key: 'lease_start', label: 'Lease start date', placeholder: 'June 1, 2026', type: 'date' },
    { key: 'lease_end', label: 'Lease end date', placeholder: 'May 31, 2027', type: 'date' },
    { key: 'deposit_amount', label: 'Security deposit amount', placeholder: '$4,800' },
  ],
  nda: [
    { key: 'discloser_name', label: 'Disclosing party name', placeholder: 'Your Company Inc.' },
    { key: 'recipient_name', label: 'Receiving party name', placeholder: 'Partner Corp.' },
    { key: 'purpose', label: 'Purpose of disclosure', placeholder: 'Evaluating potential business partnership' },
    { key: 'duration', label: 'NDA duration', placeholder: '2 years' },
    { key: 'confidential_info', label: 'Types of confidential information', placeholder: 'Trade secrets, financial data, customer lists', optional: true },
  ],
};

const DocumentLibrary = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fields, setFields] = useState({});
  const [jurisdiction, setJurisdiction] = useState('California');
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [signModal, setSignModal] = useState(false);
  const [signers, setSigners] = useState([{ name: '', email: '' }]);
  const [signMessage, setSignMessage] = useState('');
  const [signLoading, setSignLoading] = useState(false);

  const isPro = user?.plan === 'pro';

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/library/templates`, {
        params: { category: activeCat, search },
        withCredentials: true
      });
      setTemplates(res.data.templates);
      if (!categories.length) setCategories(res.data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCat, search, categories.length]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleGenerate = (template) => {
    if (!isPro && !template.free) return;
    setSelectedTemplate(template);
    setFields({});
    setGeneratedDoc(null);
  };

  const getQuestions = () => {
    if (!selectedTemplate) return QUESTIONS.default;
    return QUESTIONS[selectedTemplate.cat] || QUESTIONS.default;
  };

  const handleSubmitGeneration = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/library/generate`, {
        template_id: selectedTemplate.id,
        fields,
        jurisdiction
      }, { withCredentials: true });
      setGeneratedDoc(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedDoc) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${generatedDoc.document_name}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;color:#111}h1,h2,h3{font-family:sans-serif}pre{white-space:pre-wrap}</style></head><body><pre>${generatedDoc.content}</pre></body></html>`);
    win.document.close();
    win.print();
  };

  const handleSendSignature = async () => {
    const validSigners = signers.filter(s => s.name && s.email);
    if (!validSigners.length) return;
    setSignLoading(true);
    try {
      await axios.post(`${API}/library/sign`, {
        doc_id: generatedDoc.doc_id,
        signers: validSigners,
        message: signMessage
      }, { withCredentials: true });
      setSignModal(false);
      alert('Signature request sent! (HelloSign integration requires API key for real emails)');
    } catch (err) {
      alert(err.response?.data?.detail || 'Signature request failed');
    } finally {
      setSignLoading(false);
    }
  };

  const catColors = (cat) => CAT_COLORS[cat] || { bg: '#f5f5f5', text: '#555', icon: '#888' };

  // Show generation form
  if (selectedTemplate && !generatedDoc) {
    return (
      <div data-testid="doc-generate-page">
        <button onClick={() => setSelectedTemplate(null)} className="text-sm text-[#1a56db] hover:underline mb-4 flex items-center gap-1" data-testid="back-to-library">
          <ChevronRight size={14} className="rotate-180" /> Back to library
        </button>
        <div className="max-w-xl mx-auto">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: catColors(selectedTemplate.cat).bg }}>
                <FileText size={16} style={{ color: catColors(selectedTemplate.cat).icon }} />
              </div>
              <div>
                <div className="text-base font-semibold text-[#111827]">Let's create your {selectedTemplate.name}</div>
                <div className="text-xs text-[#6b7280]">Answer a few questions — Jasper fills in the rest</div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {getQuestions().map((q) => (
                <div key={q.key}>
                  <label className="form-label">{q.label}</label>
                  <input
                    type={q.type || 'text'}
                    className="form-input"
                    placeholder={q.placeholder}
                    value={fields[q.key] || ''}
                    onChange={(e) => setFields({ ...fields, [q.key]: e.target.value })}
                    data-testid={`field-${q.key}`}
                  />
                </div>
              ))}
              <div>
                <label className="form-label">Governing jurisdiction (state)</label>
                <input
                  type="text" className="form-input" placeholder="California"
                  value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}
                  data-testid="field-jurisdiction"
                />
              </div>
            </div>

            <button
              onClick={handleSubmitGeneration}
              disabled={generating}
              className="w-full btn-pill btn-blue py-3 mt-6 flex items-center justify-center gap-2"
              data-testid="submit-generate-btn"
            >
              {generating ? (
                <><Loader2 size={16} className="animate-spin" /> Jasper is drafting your document...</>
              ) : (
                <><Sparkles size={16} /> Generate document</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show generated document preview
  if (generatedDoc) {
    return (
      <div data-testid="doc-preview-page">
        <button onClick={() => { setGeneratedDoc(null); setSelectedTemplate(null); }} className="text-sm text-[#1a56db] hover:underline mb-4 flex items-center gap-1" data-testid="back-to-library-2">
          <ChevronRight size={14} className="rotate-180" /> Back to library
        </button>
        <div className="max-w-3xl mx-auto">
          <div className="card overflow-hidden">
            <div className="bg-[#1a56db] px-5 py-4 flex items-center justify-between">
              <div className="text-sm font-medium text-white">{generatedDoc.document_name}</div>
              <div className="text-xs text-white/70">{generatedDoc.jurisdiction}</div>
            </div>
            <div className="p-6 bg-white border-b border-[#ebebeb] max-h-[500px] overflow-y-auto" data-testid="doc-content-preview">
              <div className="prose prose-sm max-w-none text-[#333] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Georgia, serif' }}>
                {generatedDoc.content}
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <button onClick={handleDownloadPdf} className="btn-pill btn-outline flex-1 flex items-center justify-center gap-2" data-testid="download-pdf-btn">
                <Download size={14} /> Download PDF
              </button>
              <button onClick={() => setSignModal(true)} className="btn-pill btn-blue flex-1 flex items-center justify-center gap-2" data-testid="send-signature-btn">
                <Send size={14} /> Send for signature
              </button>
            </div>
          </div>
        </div>

        {/* Signature modal */}
        {signModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6" data-testid="sign-modal">
              <div className="flex items-center justify-between mb-4">
                <div className="text-base font-semibold text-[#111827]">Who needs to sign?</div>
                <button onClick={() => setSignModal(false)}><X size={18} className="text-[#999]" /></button>
              </div>
              <div className="space-y-3 mb-4">
                {signers.map((s, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input
                      className="form-input text-sm" placeholder="Full name"
                      value={s.name} onChange={(e) => { const n = [...signers]; n[i].name = e.target.value; setSigners(n); }}
                      data-testid={`signer-name-${i}`}
                    />
                    <input
                      className="form-input text-sm" placeholder="Email address"
                      value={s.email} onChange={(e) => { const n = [...signers]; n[i].email = e.target.value; setSigners(n); }}
                      data-testid={`signer-email-${i}`}
                    />
                  </div>
                ))}
              </div>
              <button onClick={() => setSigners([...signers, { name: '', email: '' }])} className="text-xs text-[#1a56db] hover:underline mb-4" data-testid="add-signer-btn">
                + Add another signer
              </button>
              <textarea
                className="form-input text-sm mb-4" rows={2} placeholder="Add a message for signers (optional)"
                value={signMessage} onChange={(e) => setSignMessage(e.target.value)}
                data-testid="sign-message"
              />
              <button onClick={handleSendSignature} disabled={signLoading} className="w-full btn-pill btn-blue py-3 flex items-center justify-center gap-2" data-testid="confirm-sign-btn">
                {signLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                Send for signature
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main library view
  return (
    <div data-testid="document-library-page">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="page-title">Document Library</h1>
          <p className="page-sub">Generate any legal document in minutes — pre-filled, lawyer-reviewed templates</p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text" placeholder="Search 158+ templates..."
            className="form-input pl-9 text-sm" value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="library-search"
          />
        </div>
      </div>

      <div className="text-xs text-[#6b7280] mb-5 flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1"><Sparkles size={12} className="text-[#f59e0b]" /> 158+ templates</span>
        <span>AI-powered</span>
        <span>HelloSign e-signature</span>
        <span>Valid in all 50 states</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide" data-testid="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCat === cat.id
                ? 'bg-[#1a56db] text-white'
                : 'bg-[#f5f5f5] text-[#555] hover:bg-[#eee]'
            }`}
            data-testid={`cat-tab-${cat.id}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Document grid */}
      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="mx-auto animate-spin text-[#1a56db]" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#999]" data-testid="no-results">No templates found for "{search}"</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="template-grid">
          {templates.map((t) => {
            const colors = catColors(t.cat);
            const locked = !isPro && !t.free;
            return (
              <div
                key={t.id}
                className={`card p-4 transition-all group ${locked ? 'opacity-75' : 'hover:shadow-md cursor-pointer'}`}
                onClick={() => !locked && handleGenerate(t)}
                data-testid={`template-card-${t.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.bg }}>
                    <FileText size={16} style={{ color: colors.icon }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-[13px] font-medium text-[#111827] truncate">{t.name}</div>
                      {locked && <Lock size={10} className="text-[#d4a017] flex-shrink-0" />}
                    </div>
                    <div className="text-[11px] text-[#777] mt-0.5">{t.desc}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ backgroundColor: colors.bg, color: colors.text }}>
                        {categories.find(c => c.id === t.cat)?.label || t.cat}
                      </span>
                      {t.popular && <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#fef3c7] text-[#92400e]">Popular</span>}
                      {t.free && <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#f0fdf4] text-[#15803d]">Free</span>}
                      {locked && <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#fefce8] text-[#854d0e]">PRO</span>}
                    </div>
                  </div>
                </div>
                <button
                  className={`w-full mt-3 text-xs py-2 rounded-full font-medium transition-colors ${
                    locked
                      ? 'bg-[#f5f5f5] text-[#aaa] cursor-not-allowed'
                      : 'bg-[#1a56db] text-white hover:bg-[#1e40af]'
                  }`}
                  disabled={locked}
                  data-testid={`generate-btn-${t.id}`}
                >
                  {locked ? 'Upgrade to Pro' : 'Generate'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;
