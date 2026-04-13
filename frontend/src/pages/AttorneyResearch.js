import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, ArrowUp, Loader2, Shield, Scale } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AttorneyResearch = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const [convs, setConvs] = useState([]);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  useEffect(() => {
    axios.get(`${API}/attorney/research/conversations`, { withCredentials: true }).then(r => setConvs(r.data)).catch(() => {});
  }, [convId]);

  const send = async (text) => {
    if (!text.trim() || sending) return;
    setMessages(p => [...p, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const res = await axios.post(`${API}/attorney/research/send`, { message: text, conversation_id: convId }, { withCredentials: true });
      setConvId(res.data.conversation_id);
      setMessages(p => [...p, { role: 'assistant', content: res.data.response }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: 'Research assistant temporarily unavailable.' }]);
    }
    setSending(false);
  };

  const startNew = () => { setMessages([]); setConvId(null); };

  return (
    <div data-testid="attorney-research-page">
      <div className="flex gap-4" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Sidebar */}
        <div className="w-[180px] flex-shrink-0">
          <button onClick={startNew} className="w-full text-[10px] font-medium text-[#1a56db] hover:underline mb-3" data-testid="new-research">+ New research</button>
          <div className="space-y-1">
            {convs.map(c => (
              <div key={c.conversation_id} onClick={() => setConvId(c.conversation_id)}
                className={`px-2 py-1.5 rounded-lg text-[10px] truncate cursor-pointer transition-colors ${convId === c.conversation_id ? 'bg-[#eff6ff] text-[#1a56db]' : 'text-[#6b7280] hover:bg-[#f5f5f5]'}`}>
                {c.title || 'Untitled'}
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 bg-white border border-[#ebebeb] rounded-xl flex flex-col overflow-hidden">
          {/* Badge */}
          <div className="px-4 py-2.5 border-b border-[#ebebeb] bg-[#fafafa] flex items-center gap-2" data-testid="research-badge">
            <Scale size={12} className="text-[#1a56db]" />
            <span className="text-[11px] font-medium text-[#1a56db]">Attorney Research Mode</span>
            <span className="text-[10px] text-[#6b7280]">— Technical responses enabled</span>
            <div className="ml-auto flex items-center gap-1">
              <Shield size={10} className="text-[#16a34a]" />
              <span className="text-[9px] text-[#6b7280]">Unlimited usage</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" data-testid="research-messages">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Scale size={28} className="mx-auto text-[#ccc] mb-3" />
                <h3 className="text-[13px] font-semibold text-[#111827] mb-1">Legal Research Assistant</h3>
                <p className="text-[11px] text-[#6b7280] max-w-sm mx-auto">Ask any legal question. James will provide detailed, technical analysis with case citations, statutory references, and procedural nuances.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 ${m.role === 'user' ? 'flex justify-end' : ''}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#1a56db] text-white rounded-tr-sm' : 'bg-[#fafafa] border border-[#ebebeb] text-[#333] rounded-tl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2 mb-3">
                <div className="px-3.5 py-2.5 rounded-xl rounded-tl-sm bg-[#fafafa] border border-[#ebebeb] text-[11px] text-[#6b7280]">
                  Researching<span className="inline-flex gap-[3px] ml-1">{[0,1,2].map(i => <span key={i} className="w-[4px] h-[4px] rounded-full bg-[#6b7280]" style={{ animation: `archer-blink 1.4s ease-in-out ${i*0.2}s infinite` }} />)}</span>
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#ebebeb] bg-[#fafafa]">
            <div className="flex gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                disabled={sending} placeholder="Ask a legal research question..."
                className="flex-1 bg-white border border-[#ebebeb] rounded-lg px-3 py-2 text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-[#1a56db]"
                rows={1} data-testid="research-input" />
              <button onClick={() => send(input)} disabled={!input.trim() || sending}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a56db] text-white hover:bg-[#1546b3] disabled:opacity-40 flex-shrink-0" data-testid="research-send">
                <ArrowUp size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttorneyResearch;
