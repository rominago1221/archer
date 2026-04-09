import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { MessageCircle, Plus, Trash2, Send, Loader2, Lock, ArrowRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SUGGESTED = [
  "Can my landlord enter my apartment without notice?",
  "What are my rights if I'm fired without cause?",
  "How do I respond to a debt collector?"
];

const LegalChat = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('case') || null;

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [questionCount, setQuestionCount] = useState({ count: 0, limit: null });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/chat/conversations`, { withCredentials: true });
      setConversations(res.data);
    } catch {}
  }, []);

  const fetchQuestionCount = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/chat/question-count`, { withCredentials: true });
      setQuestionCount(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchQuestionCount();
  }, [fetchConversations, fetchQuestionCount]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (convId) => {
    setActiveConvId(convId);
    try {
      const res = await axios.get(`${API}/chat/conversations/${convId}/messages`, { withCredentials: true });
      setMessages(res.data);
    } catch {
      setMessages([]);
    }
  };

  const createConversation = async () => {
    try {
      const res = await axios.post(`${API}/chat/conversations`, { case_id: caseId }, { withCredentials: true });
      setActiveConvId(res.data.conversation_id);
      setMessages([]);
      fetchConversations();
    } catch {}
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/chat/conversations/${convId}`, { withCredentials: true });
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      fetchConversations();
    } catch {}
  };

  const sendMessage = async (text) => {
    if (!text.trim() || sending) return;
    if (questionCount.limit && questionCount.count >= questionCount.limit) {
      setShowUpgrade(true);
      return;
    }

    let convId = activeConvId;
    if (!convId) {
      try {
        const res = await axios.post(`${API}/chat/conversations`, { case_id: caseId }, { withCredentials: true });
        convId = res.data.conversation_id;
        setActiveConvId(convId);
        fetchConversations();
      } catch { return; }
    }

    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await axios.post(`${API}/chat/conversations/${convId}/messages`, {
        content: text,
        case_id: caseId
      }, { withCredentials: true });
      setMessages(prev => [...prev.filter(m => m !== userMsg), res.data.user_message, res.data.ai_message]);
      fetchQuestionCount();
      fetchConversations();
    } catch (err) {
      if (err.response?.status === 403) {
        setShowUpgrade(true);
        setMessages(prev => prev.filter(m => m !== userMsg));
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble processing your question. Please try again.', created_at: new Date().toISOString() }]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const groupByDate = (convs) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups = { Today: [], Yesterday: [], 'This week': [], Older: [] };
    convs.forEach(c => {
      const d = new Date(c.created_at).toDateString();
      if (d === today) groups.Today.push(c);
      else if (d === yesterday) groups.Yesterday.push(c);
      else if (Date.now() - new Date(c.created_at) < 7 * 86400000) groups['This week'].push(c);
      else groups.Older.push(c);
    });
    return groups;
  };

  const groups = groupByDate(conversations);

  return (
    <div className="flex h-[calc(100vh-0px)] -m-7 -mt-5" data-testid="legal-chat-page">
      {/* Conversations sidebar */}
      <div className="w-[260px] bg-white border-r border-[#ebebeb] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[#ebebeb]">
          <div className="text-sm font-medium text-[#111827] mb-2">Legal Chat</div>
          <button onClick={createConversation} className="w-full btn-pill btn-blue text-xs flex items-center justify-center gap-1.5 py-2" data-testid="new-chat-btn">
            <Plus size={14} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(groups).map(([label, convs]) => convs.length > 0 && (
            <div key={label} className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-[#9ca3af] px-2 mb-1">{label}</div>
              {convs.map(c => (
                <div
                  key={c.conversation_id}
                  onClick={() => loadConversation(c.conversation_id)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${activeConvId === c.conversation_id ? 'bg-[#eff6ff] text-[#1a56db]' : 'text-[#555] hover:bg-[#f8f8f8]'}`}
                  data-testid={`conv-${c.conversation_id}`}
                >
                  <MessageCircle size={13} className="flex-shrink-0" />
                  <span className="truncate flex-1">{c.title}</span>
                  <button onClick={(e) => deleteConversation(c.conversation_id, e)} className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-[#dc2626] transition-opacity" data-testid={`delete-conv-${c.conversation_id}`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[#ebebeb]">
          <div className="text-[10px] text-center">
            {user?.plan === 'pro' ? (
              <span className="text-[#1a56db] font-medium">Pro plan — Unlimited questions</span>
            ) : (
              <span className="text-[#9ca3af]">{questionCount.count} of 3 free questions used</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-[#fafafa]">
        {/* Header */}
        <div className="px-6 py-3 border-b border-[#ebebeb] bg-white flex items-center gap-2">
          <MessageCircle size={16} className="text-[#1a56db]" />
          <span className="text-sm font-medium text-[#111827]">Jasper Legal Chat</span>
          <span className="badge badge-blue text-[10px]">US Law</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && !activeConvId ? (
            <div className="flex flex-col items-center justify-center h-full text-center" data-testid="chat-empty-state">
              <div className="w-16 h-16 rounded-full bg-[#eff6ff] flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-[#1a56db]" />
              </div>
              <div className="text-lg font-medium text-[#111827] mb-1">Ask any legal question</div>
              <div className="text-xs text-[#9ca3af] mb-6">Get an answer in seconds — based on US law</div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="px-4 py-2 bg-white border border-[#ebebeb] rounded-full text-xs text-[#555] hover:border-[#1a56db] hover:text-[#1a56db] transition-colors"
                    data-testid={`suggested-q-${i}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[#1a56db] text-white text-[10px] font-bold flex items-center justify-center mr-2 flex-shrink-0 mt-1">J</div>
                  )}
                  <div className={`max-w-[80%] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#1a56db] text-white rounded-[18px_18px_4px_18px]'
                      : 'bg-white border border-[#ebebeb] text-[#333] rounded-[18px_18px_18px_4px]'
                  }`} data-testid={`chat-msg-${msg.role}-${i}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-[#1a56db] text-white text-[10px] font-bold flex items-center justify-center mr-2 flex-shrink-0 mt-1">J</div>
                  <div className="bg-white border border-[#ebebeb] rounded-[18px_18px_18px_4px] px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#1a56db] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-[#1a56db] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-[#1a56db] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-3 border-t border-[#ebebeb] bg-white">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a legal question..."
              className="flex-1 px-4 py-2.5 bg-[#f8f8f8] border border-[#ebebeb] rounded-full text-sm focus:outline-none focus:border-[#1a56db] transition-colors"
              disabled={sending}
              data-testid="chat-input"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full bg-[#1a56db] text-white flex items-center justify-center hover:bg-[#1648c4] disabled:opacity-40 transition-colors"
              data-testid="chat-send-btn"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-[10px] text-[#9ca3af] text-center mt-1.5">Based on US law · Not legal advice · {user?.plan === 'pro' ? 'Pro plan' : `${questionCount.count}/3 free questions`}</div>
        </div>
      </div>

      {/* Upgrade modal */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowUpgrade(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl" onClick={e => e.stopPropagation()} data-testid="chat-upgrade-modal">
            <div className="w-14 h-14 rounded-full bg-[#eff6ff] flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-[#1a56db]" />
            </div>
            <div className="text-lg font-semibold text-[#111827] mb-2">You've used your 3 free questions</div>
            <div className="text-sm text-[#6b7280] mb-6">Upgrade to Pro for unlimited legal questions — 24/7, any topic.</div>
            <a href="/settings" className="btn-pill btn-blue w-full block py-3 text-center">Upgrade to Pro — $69/month</a>
            <a href="/lawyers" className="block text-sm text-[#1a56db] mt-3 hover:underline">Or book a lawyer call — $149</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalChat;
