import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const T = {
  en: {
    title: 'Chat with James',
    subtitle: 'About your case',
    placeholder: 'Ask James about your case...',
    send: 'Send',
    typing: 'James is thinking...',
    close: 'Close',
  },
  fr: {
    title: 'Discuter avec James',
    subtitle: 'À propos de votre dossier',
    placeholder: 'Posez une question à James sur votre dossier...',
    send: 'Envoyer',
    typing: 'James réfléchit...',
    close: 'Fermer',
  },
  nl: {
    title: 'Chat met James',
    subtitle: 'Over uw dossier',
    placeholder: 'Stel James een vraag over uw dossier...',
    send: 'Versturen',
    typing: 'James denkt na...',
    close: 'Sluiten',
  },
};

const CaseChatDrawer = ({ caseId, caseTitle, lang, onClose, initialMessage }) => {
  const t = T[lang] || T.en;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send initial context message when drawer opens
  useEffect(() => {
    if (initialMessage && !convId) {
      const init = async () => {
        setSending(true);
        const introMsg = initialMessage;
        setMessages([{ role: 'user', content: introMsg, ts: Date.now() }]);
        try {
          const res = await axios.post(`${API}/chat/send`, {
            message: introMsg,
            case_id: caseId,
          }, { withCredentials: true });
          setConvId(res.data.conversation_id);
          setMessages(prev => [...prev, { role: 'assistant', content: res.data.response, ts: Date.now() }]);
        } catch (e) {
          setMessages(prev => [...prev, { role: 'assistant', content: lang === 'fr' ? 'James est temporairement indisponible.' : 'James is temporarily unavailable.', ts: Date.now() }]);
        }
        setSending(false);
      };
      init();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, ts: Date.now() }]);
    setSending(true);
    try {
      const res = await axios.post(`${API}/chat/send`, {
        message: text,
        conversation_id: convId,
        case_id: caseId,
      }, { withCredentials: true });
      if (!convId) setConvId(res.data.conversation_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response, ts: Date.now() }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: lang === 'fr' ? 'James est temporairement indisponible.' : 'James is temporarily unavailable.', ts: Date.now() }]);
    }
    setSending(false);
  };

  return (
    <div data-testid="case-chat-drawer" style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 400, zIndex: 300,
      background: '#fff', borderLeft: '1px solid #e2e0db',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
      animation: 'slideIn 0.25s ease-out',
    }}>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e2e0db', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>J</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{t.title}</div>
          <div style={{ fontSize: 9, color: '#6b7280' }}>{caseTitle || t.subtitle}</div>
        </div>
        <button onClick={onClose} data-testid="close-chat-drawer" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {messages.length === 0 && !sending && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9ca3af' }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{t.placeholder}</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 8,
          }}>
            {m.role === 'assistant' && (
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0, marginRight: 6, marginTop: 2 }}>J</div>
            )}
            <div style={{
              maxWidth: '80%', padding: '8px 12px', borderRadius: 10,
              background: m.role === 'user' ? '#1a56db' : '#f3f4f6',
              color: m.role === 'user' ? '#fff' : '#374151',
              fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>{m.content}</div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>J</div>
            <div style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Loader2 size={12} className="animate-spin" />{t.typing}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '0.5px solid #e2e0db', display: 'flex', gap: 6 }}>
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t.placeholder}
          disabled={sending}
          style={{
            flex: 1, padding: '8px 12px', fontSize: 11, border: '0.5px solid #e2e0db',
            borderRadius: 8, outline: 'none', background: '#fafafa', color: '#374151',
          }}
        />
        <button
          data-testid="chat-send-btn"
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            padding: '8px 12px', background: !input.trim() || sending ? '#93b4f0' : '#1a56db',
            color: '#fff', border: 'none', borderRadius: 8, cursor: !input.trim() || sending ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        ><Send size={14} /></button>
      </div>
    </div>
  );
};

export default CaseChatDrawer;
