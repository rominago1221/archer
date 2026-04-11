import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { FileText, Search, Send, Download, Pen, ArrowUp, Loader2, Check, Lock, Sparkles, ChevronRight, X, Shield } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ─── helpers ─── */
const extractDocument = (text) => {
  const match = text.match(/<DOCUMENT>([\s\S]*?)<\/DOCUMENT>/);
  return match ? match[1].trim() : null;
};

const stripDocumentTags = (text) => {
  return text.replace(/<DOCUMENT>[\s\S]*?<\/DOCUMENT>/g, '').trim();
};

/* ─── Template data (reused from existing) ─── */
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

/* ─── Typing dots animation ─── */
const TypingDots = () => (
  <span className="inline-flex gap-[3px] ml-1">
    {[0, 1, 2].map(i => (
      <span key={i} className="w-[5px] h-[5px] rounded-full bg-[#6b7280]"
        style={{ animation: `jasper-blink 1.4s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </span>
);

/* ─── James Avatar ─── */
const JamesAvatar = ({ size = 24 }) => (
  <div className="flex-shrink-0 rounded-full bg-[#1a56db] flex items-center justify-center text-white font-medium"
    style={{ width: size, height: size, fontSize: size * 0.45 }}>
    J
  </div>
);

/* ─── Question Card ─── */
const QuestionCard = ({ number, text, answer }) => {
  const answered = !!answer;
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${answered ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-white border-[#ebebeb]'}`}
      data-testid={`question-card-${number}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5 ${answered ? 'bg-[#16a34a] text-white' : 'bg-[#1a56db] text-white'}`}>
        {answered ? <Check size={10} /> : number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-[#333]">{text}</div>
        {answered && <div className="text-[10px] font-medium text-[#16a34a] mt-0.5">{answer}</div>}
        {!answered && <div className="text-[10px] text-[#9ca3af] mt-0.5">Pending...</div>}
      </div>
    </div>
  );
};

/* ─── Document Preview Card ─── */
const DocumentPreviewCard = ({ content, docId, onEdit, onDownload, onSign }) => {
  const lines = content.split('\n').filter(l => l.trim());
  const title = lines.find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || 'Legal Document';
  const clauses = lines.filter(l => /^\d+[\.\)]|^##\s|^Article|^Section|^Clause/i.test(l.trim()));
  const previewClauses = clauses.slice(0, 3);
  const remaining = clauses.length > 3 ? clauses.slice(3) : [];

  return (
    <div className="bg-white border border-[#ebebeb] rounded-xl p-3.5 mt-2" data-testid="document-preview-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
            <FileText size={14} className="text-[#1a56db]" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#111827] leading-tight">{title}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">Draft</div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#f0fdf4] text-[#16a34a] border border-[#86efac] flex-shrink-0">
          Ready to sign
        </span>
      </div>

      {/* Body preview */}
      <div className="text-[11px] text-[#555] leading-[1.7] mb-3 pl-0.5">
        {previewClauses.map((c, i) => (
          <div key={i} className="truncate">{c.replace(/^#+\s*/, '')}</div>
        ))}
        {remaining.length > 0 && (
          <div className="text-[11px] text-[#9ca3af] italic mt-1">
            + {remaining.length} more clauses: {remaining.slice(0, 4).map(c => c.replace(/^#+\s*|^\d+[\.\)]\s*/g, '').slice(0, 30)).join(', ')}...
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-2.5">
        <button onClick={onSign} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium bg-[#1a56db] text-white hover:bg-[#1546b3] transition-colors" data-testid="doc-send-signature">
          <Send size={11} /> Send for signature
        </button>
        <button onClick={onDownload} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium border border-[#1a56db] text-[#1a56db] hover:bg-[#eff6ff] transition-colors" data-testid="doc-download-pdf">
          <Download size={11} /> Download PDF
        </button>
        <button onClick={onEdit} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium text-[#6b7280] hover:bg-[#f5f5f5] transition-colors" data-testid="doc-edit-james">
          <Pen size={11} /> Edit with James
        </button>
      </div>

      {/* HelloSign badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f0fdf4] border border-[#86efac]">
        <Shield size={11} className="text-[#16a34a]" />
        <span className="text-[10px] text-[#16a34a] font-medium">HelloSign e-signature &middot; Legally binding &middot; Both parties notified</span>
      </div>
    </div>
  );
};

/* ─── Sign Modal ─── */
const SignModal = ({ onClose, onSend, loading }) => {
  const [signers, setSigners] = useState([{ name: '', email: '' }]);
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" data-testid="sign-modal-overlay">
      <div className="bg-white rounded-2xl max-w-md w-full p-5" data-testid="sign-modal">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-[#111827]">Who needs to sign this document?</div>
          <button onClick={onClose}><X size={16} className="text-[#999]" /></button>
        </div>
        <div className="space-y-2.5 mb-3">
          {signers.map((s, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input className="form-input text-xs py-2" placeholder="Full name" value={s.name}
                onChange={(e) => { const n = [...signers]; n[i].name = e.target.value; setSigners(n); }}
                data-testid={`signer-name-${i}`} />
              <input className="form-input text-xs py-2" placeholder="Email address" value={s.email}
                onChange={(e) => { const n = [...signers]; n[i].email = e.target.value; setSigners(n); }}
                data-testid={`signer-email-${i}`} />
            </div>
          ))}
        </div>
        <button onClick={() => setSigners([...signers, { name: '', email: '' }])} className="text-[11px] text-[#1a56db] hover:underline mb-3" data-testid="add-signer-btn">
          + Add another signer
        </button>
        <textarea className="form-input text-xs py-2 mb-3" rows={2} placeholder="Add a message for signers (optional)"
          value={message} onChange={(e) => setMessage(e.target.value)} data-testid="sign-message" />
        <button onClick={() => onSend(signers.filter(s => s.name && s.email), message)} disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium bg-[#1a56db] text-white hover:bg-[#1546b3] transition-colors disabled:opacity-60"
          data-testid="confirm-sign-btn">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={12} />}
          Send for signature
        </button>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const DocumentLibrary = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState('generate'); // 'generate' | 'browse'
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
  const [suggestions, setSuggestions] = useState([
    'I need an NDA', 'Create a lease agreement', 'Draft a freelance contract', 'Write a demand letter'
  ]);

  // Browse mode state
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [browseLoading, setBrowseLoading] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const isPro = user?.plan === 'pro';

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, sending]);

  // Fetch recent docs
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await axios.get(`${API}/documents/james/recent`, { withCredentials: true });
        setRecentDocs(res.data);
      } catch (e) { /* ok */ }
    };
    fetchRecent();
  }, [latestDocId]);

  // Fetch templates when switching to browse mode
  const fetchTemplates = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const res = await axios.get(`${API}/library/templates`, {
        params: { category: activeCat, search },
        withCredentials: true
      });
      setTemplates(res.data.templates);
      if (!categories.length) setCategories(res.data.categories);
    } catch (e) { /* ok */ }
    setBrowseLoading(false);
  }, [activeCat, search, categories.length]);

  useEffect(() => {
    if (mode === 'browse') fetchTemplates();
  }, [mode, fetchTemplates]);

  const sendMessage = async (text) => {
    if (!text.trim() || sending || limitReached) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await axios.post(`${API}/documents/james/send`, {
        message: text,
        conversation_id: convId
      }, { withCredentials: true });

      if (res.data.limit_reached) {
        setLimitReached(true);
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.response, limit: true }]);
        setSending(false);
        return;
      }

      setConvId(res.data.conversation_id);

      const aiContent = res.data.response;
      const docContent = res.data.document_content;
      const aiMsg = { role: 'assistant', content: aiContent, document: docContent, docId: res.data.doc_id };
      setMessages(prev => [...prev, aiMsg]);

      if (docContent) {
        setLatestDocContent(docContent);
        setLatestDocId(res.data.doc_id);
        setSuggestions(['Make the term longer', 'Add a penalty clause', 'Make it one-way', 'Translate to French']);
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleDownloadPdf = () => {
    if (!latestDocContent) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Legal Document</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;color:#111}h1,h2,h3{font-family:-apple-system,sans-serif}pre{white-space:pre-wrap}</style></head><body><pre>${latestDocContent}</pre></body></html>`);
    win.document.close();
    win.print();
  };

  const handleSendSignature = async (signers, message) => {
    if (!signers.length || !latestDocId) return;
    setSignLoading(true);
    try {
      await axios.post(`${API}/library/sign`, {
        doc_id: latestDocId, signers, message
      }, { withCredentials: true });
      setSignModal(false);
      setMessages(prev => [...prev, { role: 'system', content: 'Signature request sent successfully.' }]);
    } catch (err) {
      alert(err.response?.data?.detail || 'Signature request failed');
    }
    setSignLoading(false);
  };

  const handleEditWithJames = () => {
    inputRef.current?.focus();
  };

  const switchToGenerateWithTemplate = (templateName) => {
    setMode('generate');
    setInput(`I need a ${templateName}`);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const startNewConversation = () => {
    setMessages([]);
    setConvId(null);
    setLatestDocContent(null);
    setLatestDocId(null);
    setLimitReached(false);
    setSuggestions(['I need an NDA', 'Create a lease agreement', 'Draft a freelance contract', 'Write a demand letter']);
  };

  // Parse question cards from James messages (multilingual: EN/FR/NL/DE/ES)
  const parseQuestions = (allMessages) => {
    const questions = [];
    // Match: "Question 1 of 4:", "Question 1 sur 4 :", "Vraag 1 van 4:", "Frage 1 von 4:", "Pregunta 1 de 4:"
    const qRegex = /(?:Question|Vraag|Frage|Pregunta)\s+(\d+)\s+(?:of|sur|van|von|de)\s+(\d+)\s*[:\-–—]\s*(.+?)(?:\n|$)/i;
    for (const msg of allMessages) {
      if (msg.role === 'assistant') {
        const qMatch = msg.content.match(qRegex);
        if (qMatch) {
          questions.push({ number: parseInt(qMatch[1]), total: parseInt(qMatch[2]), text: qMatch[3].trim(), answer: null });
        }
      }
      if (msg.role === 'user' && questions.length > 0) {
        const lastUnanswered = questions.findLast(q => !q.answer);
        if (lastUnanswered) lastUnanswered.answer = msg.content;
      }
    }
    return questions;
  };

  const questions = parseQuestions(messages);

  /* ─── RENDER ─── */
  return (
    <div data-testid="document-creator-page" className="-m-7">
      <div className="border border-[#ebebeb] rounded-2xl bg-white flex overflow-hidden" style={{ minHeight: '620px' }}>

        {/* ─── LEFT SIDEBAR ─── */}
        <div className="w-[200px] flex-shrink-0 border-r border-[#ebebeb] bg-[#fafafa] flex flex-col" data-testid="doc-sidebar">
          <div className="p-4 pb-3">
            <div className="text-[13px] font-semibold text-[#111827] mb-3">Document Creator</div>

            {/* Mode buttons */}
            <button onClick={() => { setMode('generate'); }} data-testid="mode-generate"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium mb-1.5 transition-all ${mode === 'generate' ? 'bg-white border border-[#ebebeb] text-[#1a56db] shadow-sm' : 'text-[#6b7280] hover:bg-white'}`}>
              <Sparkles size={12} className={mode === 'generate' ? 'text-[#1a56db]' : 'text-[#9ca3af]'} />
              Generate any document
            </button>
            <button onClick={() => setMode('browse')} data-testid="mode-browse"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${mode === 'browse' ? 'bg-white border border-[#ebebeb] text-[#1a56db] shadow-sm' : 'text-[#6b7280] hover:bg-white'}`}>
              <Search size={12} className={mode === 'browse' ? 'text-[#1a56db]' : 'text-[#9ca3af]'} />
              Browse 158 templates
            </button>
          </div>

          <div className="border-t border-[#ebebeb] mx-3" />

          {/* Recent documents */}
          <div className="p-4 pt-3 flex-1 overflow-y-auto">
            <div className="text-[10px] font-medium text-[#9ca3af] uppercase tracking-wider mb-2">Recent documents</div>
            {recentDocs.length === 0 && (
              <div className="text-[10px] text-[#bbb] italic">No documents yet</div>
            )}
            {recentDocs.map((doc) => (
              <div key={doc.doc_id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-white rounded px-1 -mx-1 transition-colors" data-testid={`recent-doc-${doc.doc_id}`}>
                <FileText size={11} className="text-[#9ca3af] flex-shrink-0" />
                <span className="text-[10px] text-[#555] truncate">{doc.document_title || 'Untitled'}</span>
              </div>
            ))}
          </div>

          {/* New conversation button */}
          {mode === 'generate' && messages.length > 0 && (
            <div className="p-3 border-t border-[#ebebeb]">
              <button onClick={startNewConversation} className="w-full text-[10px] font-medium text-[#1a56db] hover:underline" data-testid="new-conversation-btn">
                + New document
              </button>
            </div>
          )}
        </div>

        {/* ─── MAIN AREA ─── */}
        <div className="flex-1 flex flex-col min-w-0">

          {mode === 'generate' ? (
            <>
              {/* ── Page Title ── */}
              <div className="px-6 pt-5 pb-0">
                <h1 className="text-[22px] font-medium tracking-tight leading-[1.15] text-[#111827]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.8px' }}>
                  Generate any document —<br />
                  just describe <em className="not-italic text-[#1a56db]">what you need.</em>
                </h1>
                <p className="text-[13px] text-[#6b7280] mt-1.5">James drafts it in seconds. Ready to sign.</p>
              </div>

              {/* ── James Identity Bar ── */}
              <div className="mx-6 mt-3 mb-3 px-3.5 py-2.5 rounded-xl bg-[#fafafa] border border-[#ebebeb] flex items-center gap-3" data-testid="james-identity-bar">
                <JamesAvatar size={30} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[#111827]">James</div>
                  <div className="text-[10px] text-[#6b7280]">Senior Legal Advisor &middot; 20 years experience</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[9px] text-[#6b7280] bg-[#f0f0f0] border border-[#e5e5e5]">847K+ legal sources</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] text-[#6b7280] bg-[#f0f0f0] border border-[#e5e5e5]">US + Belgium</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                    <span className="text-[10px] text-[#6b7280]">Available now</span>
                  </div>
                </div>
              </div>

              {/* ── Chat Messages ── */}
              <div className="flex-1 overflow-y-auto px-6 pb-2" data-testid="chat-messages-area">
                {/* Opening message if no messages yet */}
                {messages.length === 0 && (
                  <div className="flex gap-2.5 mb-4" data-testid="james-opening-message">
                    <JamesAvatar />
                    <div className="max-w-[85%] px-3.5 py-2.5 rounded-[2px_12px_12px_12px] bg-[#fafafa] border border-[#ebebeb] text-[13px] text-[#333] leading-relaxed">
                      Tell me what document you need — in plain English. I'll ask you a few questions and generate a complete, legally sound document adapted to your situation.
                      <div className="mt-2 text-[12px] text-[#6b7280]">
                        Examples: <span className="text-[#333]">'I need an NDA for a new business partner'</span> &middot; <span className="text-[#333]">'Create a lease for my apartment in New York'</span> &middot; <span className="text-[#333]">'I want a freelance contract for a web project'</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg, idx) => {
                  if (msg.role === 'system') {
                    return (
                      <div key={idx} className="text-center text-[11px] text-[#16a34a] my-2 font-medium" data-testid={`system-msg-${idx}`}>
                        {msg.content}
                      </div>
                    );
                  }

                  if (msg.role === 'user') {
                    return (
                      <div key={idx} className="flex justify-end mb-3" data-testid={`user-msg-${idx}`}>
                        <div className="max-w-[70%] px-3.5 py-2.5 rounded-[12px_2px_12px_12px] bg-[#1a56db] text-white text-[13px] leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  // Assistant message
                  const displayText = stripDocumentTags(msg.content);
                  return (
                    <div key={idx} className="mb-3" data-testid={`james-msg-${idx}`}>
                      <div className="flex gap-2.5">
                        <JamesAvatar />
                        <div className="max-w-[85%]">
                          <div className="px-3.5 py-2.5 rounded-[2px_12px_12px_12px] bg-[#fafafa] border border-[#ebebeb] text-[13px] text-[#333] leading-relaxed whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: displayText
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1a56db]">$1</strong>')
                                .replace(/\n/g, '<br/>')
                            }}
                          />

                          {/* Document Preview Card */}
                          {msg.document && (
                            <DocumentPreviewCard
                              content={msg.document}
                              docId={msg.docId}
                              onEdit={handleEditWithJames}
                              onDownload={handleDownloadPdf}
                              onSign={() => setSignModal(true)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Question cards */}
                {questions.length > 0 && (
                  <div className="ml-9 space-y-1.5 mb-3" data-testid="question-cards">
                    {questions.map((q) => (
                      <QuestionCard key={q.number} number={q.number} text={q.text} answer={q.answer} />
                    ))}
                  </div>
                )}

                {/* Typing indicator */}
                {sending && (
                  <div className="flex gap-2.5 mb-3" data-testid="typing-indicator">
                    <JamesAvatar />
                    <div className="px-3.5 py-2.5 rounded-[2px_12px_12px_12px] bg-[#fafafa] border border-[#ebebeb] text-[12px] text-[#6b7280]">
                      {latestDocContent ? 'James is updating the document' : messages.length > 2 ? 'James is drafting your document' : 'James is thinking'}
                      <TypingDots />
                    </div>
                  </div>
                )}

                {/* Free plan limit */}
                {limitReached && (
                  <div className="text-center py-4" data-testid="limit-reached">
                    <div className="inline-block px-5 py-3 rounded-xl bg-[#fefce8] border border-[#fde68a] text-sm text-[#854d0e]">
                      <Lock size={14} className="inline mr-1.5" />
                      You've created your 3 free documents.
                      <a href="/settings" className="text-[#1a56db] font-medium ml-1 hover:underline">Upgrade to Pro</a>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* ── Input Area ── */}
              <div className="px-6 pb-4 pt-2 bg-[#fafafa] border-t border-[#ebebeb]" data-testid="input-area">
                {/* Suggestion chips */}
                {!limitReached && (
                  <div className="flex gap-1.5 mb-2.5 overflow-x-auto scrollbar-hide" data-testid="suggestion-chips">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white border border-[#ebebeb] text-[#555] hover:border-[#1a56db] hover:text-[#1a56db] transition-colors"
                        data-testid={`suggestion-${i}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input box */}
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending || limitReached}
                    placeholder="Describe the document you need or request modifications..."
                    className="flex-1 bg-white border border-[#ebebeb] rounded-xl px-3.5 py-2.5 text-[12px] resize-none focus:outline-none focus:ring-1 focus:ring-[#1a56db] focus:border-transparent transition-all"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                    data-testid="chat-input"
                  />
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending || limitReached}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a56db] text-white hover:bg-[#1546b3] transition-colors disabled:opacity-40 flex-shrink-0"
                    data-testid="send-btn">
                    <ArrowUp size={16} />
                  </button>
                </div>

                {/* Disclaimer */}
                <p className="text-[9px] text-[#9ca3af] text-center mt-2 opacity-60">
                  James generates documents for informational purposes &middot; Not a substitute for legal advice &middot; 158 document types available
                </p>
              </div>
            </>
          ) : (
            /* ─── BROWSE TEMPLATES MODE ─── */
            <div className="flex-1 overflow-y-auto p-6" data-testid="browse-templates-area">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="page-title">Document Library</h1>
                  <p className="page-sub">Generate any legal document in minutes — pre-filled, lawyer-reviewed templates</p>
                </div>
                <div className="relative w-56">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  <input type="text" placeholder="Search 158+ templates..." className="form-input pl-8 text-xs py-2"
                    value={search} onChange={(e) => setSearch(e.target.value)} data-testid="library-search" />
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-hide" data-testid="category-tabs">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${activeCat === cat.id ? 'bg-[#1a56db] text-white' : 'bg-[#f5f5f5] text-[#555] hover:bg-[#eee]'}`}
                    data-testid={`cat-tab-${cat.id}`}>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Template grid */}
              {browseLoading ? (
                <div className="text-center py-12"><Loader2 size={20} className="mx-auto animate-spin text-[#1a56db]" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#999]">No templates found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5" data-testid="template-grid">
                  {templates.map((t) => {
                    const colors = CAT_COLORS[t.cat] || { bg: '#f5f5f5', text: '#555', icon: '#888' };
                    const locked = !isPro && !t.free;
                    return (
                      <div key={t.id} className={`bg-white border border-[#ebebeb] rounded-xl p-3.5 transition-all ${locked ? 'opacity-75' : 'hover:shadow-sm'}`}
                        data-testid={`template-card-${t.id}`}>
                        <div className="flex items-start gap-2.5 mb-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.bg }}>
                            <FileText size={14} style={{ color: colors.icon }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <div className="text-[12px] font-medium text-[#111827] truncate">{t.name}</div>
                              {locked && <Lock size={9} className="text-[#d4a017] flex-shrink-0" />}
                            </div>
                            <div className="text-[10px] text-[#777] mt-0.5">{t.desc}</div>
                          </div>
                        </div>
                        <button onClick={() => !locked && switchToGenerateWithTemplate(t.name)} disabled={locked}
                          className={`w-full text-[11px] py-2 rounded-full font-medium transition-colors ${locked ? 'bg-[#f5f5f5] text-[#aaa] cursor-not-allowed' : 'bg-[#1a56db] text-white hover:bg-[#1546b3]'}`}
                          data-testid={`generate-btn-${t.id}`}>
                          {locked ? 'Upgrade to Pro' : 'Generate with James'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sign Modal */}
      {signModal && <SignModal onClose={() => setSignModal(false)} onSend={handleSendSignature} loading={signLoading} />}
    </div>
  );
};

export default DocumentLibrary;
