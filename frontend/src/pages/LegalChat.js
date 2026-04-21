import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Send, Loader2, Phone, Lock, FileText, Shield, Zap, BookOpen } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const suggestedQuestions = {
  US: {
    en: [
      'Can my landlord evict me without notice?',
      'What are my rights if I was fired without cause?',
      'How do I respond to a debt collector?',
      'Is my non-compete enforceable?',
    ],
    es: [
      'Puede mi propietario desalojarme sin aviso?',
      'Cuales son mis derechos si me despidieron sin causa?',
      'Como respondo a un cobrador de deudas?',
      'Es ejecutable mi clausula de no competencia?',
    ],
  },
  BE: {
    fr: [
      'Quel est mon preavis si je suis licencie?',
      'Mon proprietaire peut-il augmenter mon loyer?',
      'Comment contester mon C4?',
      'Ma clause de non-concurrence est-elle valide?',
    ],
    nl: [
      'Wat is mijn opzegtermijn als ik ontslagen word?',
      'Mag mijn verhuurder de huur verhogen?',
      'Hoe betwist ik mijn C4?',
      'Is mijn concurrentiebeding geldig?',
    ],
    de: [
      'Was ist meine Kundigungsfrist bei Entlassung?',
      'Darf mein Vermieter die Miete erhohen?',
      'Wie fechte ich mein C4 an?',
      'Ist mein Wettbewerbsverbot gultig?',
    ],
    en: [
      'What is my notice period if I am dismissed?',
      'Can my landlord increase my rent?',
      'How do I contest my C4 dismissal form?',
      'Is my non-compete clause valid under Belgian law?',
    ],
    es: [
      'Cual es mi preaviso si me despiden en Belgica?',
      'Puede mi propietario aumentar el alquiler?',
      'Como impugno mi formulario C4?',
      'Es valida mi clausula de no competencia en derecho belga?',
    ],
  },
};

const uiLabels = {
  en: { typing: 'Archer is researching your question...', placeholder: 'Ask Archer a legal question...', send: 'Send', sources: 'Based on legal sources', bookCall: 'Need more certainty? Talk to a licensed attorney — pre-briefed by Archer.', bookBtn: 'Book a call', freeLimit: 'Archer has answered your 3 free questions. Upgrade to Pro for unlimited access to Archer.', upgrade: 'Upgrade to Pro', newChat: 'New conversation', credential: 'Senior Legal Advisor', exp: '20 years experience', analyzing: 'Analyzing from 847,000+ legal articles and court decisions', available: 'Available now', trust1: 'Instant response · No appointment needed', trust2: '847,000+ legal sources analyzed in real time', trust3: '100% confidential · Not legal advice' },
  fr: { typing: 'Archer recherche la reponse a votre question...', placeholder: 'Posez une question juridique a Archer...', send: 'Envoyer', sources: 'Base sur des sources juridiques', bookCall: 'Besoin de plus de certitude ? Parlez a un avocat licencie — informe par Archer.', bookBtn: 'Reserver un appel', freeLimit: 'Archer a repondu a vos 3 questions gratuites. Passez a Pro pour un acces illimite a Archer.', upgrade: 'Passer a Pro', newChat: 'Nouvelle conversation', credential: 'Conseiller Juridique Senior', exp: '20 ans d\'experience', analyzing: 'Analyse de 847 000+ articles juridiques et decisions de justice', available: 'Disponible maintenant', trust1: 'Reponse instantanee · Sans rendez-vous', trust2: '847 000+ sources juridiques analysees en temps reel', trust3: '100% confidentiel · Pas un avis juridique' },
  nl: { typing: 'Archer onderzoekt uw vraag...', placeholder: 'Stel Archer een juridische vraag...', send: 'Versturen', sources: 'Gebaseerd op juridische bronnen', bookCall: 'Meer zekerheid nodig? Spreek een advocaat — gebrieft door Archer.', bookBtn: 'Bel reserveren', freeLimit: 'Archer heeft uw 3 gratis vragen beantwoord. Upgrade naar Pro.', upgrade: 'Upgrade naar Pro', newChat: 'Nieuw gesprek', credential: 'Senior Juridisch Adviseur', exp: '20 jaar ervaring', analyzing: 'Analyse van 847.000+ juridische bronnen', available: 'Nu beschikbaar', trust1: 'Direct antwoord · Geen afspraak nodig', trust2: '847.000+ juridische bronnen', trust3: '100% vertrouwelijk' },
  de: { typing: 'Archer recherchiert Ihre Frage...', placeholder: 'Stellen Sie Archer eine Rechtsfrage...', send: 'Senden', sources: 'Basierend auf Rechtsquellen', bookCall: 'Mehr Sicherheit? Sprechen Sie mit einem Anwalt.', bookBtn: 'Anruf buchen', freeLimit: 'Archer hat Ihre 3 kostenlosen Fragen beantwortet. Upgrade auf Pro.', upgrade: 'Upgrade auf Pro', newChat: 'Neues Gesprach', credential: 'Senior Rechtsberater', exp: '20 Jahre Erfahrung', analyzing: 'Analyse von 847.000+ Rechtsquellen', available: 'Jetzt verfugbar', trust1: 'Sofortige Antwort', trust2: '847.000+ Rechtsquellen', trust3: '100% vertraulich' },
  es: { typing: 'Archer esta investigando su pregunta...', placeholder: 'Haga una pregunta legal a Archer...', send: 'Enviar', sources: 'Basado en fuentes legales', bookCall: 'Necesita mas certeza? Hable con un abogado licenciado.', bookBtn: 'Reservar llamada', freeLimit: 'Archer ha respondido sus 3 preguntas gratuitas. Actualice a Pro.', upgrade: 'Actualizar a Pro', newChat: 'Nueva conversacion', credential: 'Asesor Legal Senior', exp: '20 anos de experiencia', analyzing: 'Analizando 847,000+ articulos legales', available: 'Disponible ahora', trust1: 'Respuesta instantanea', trust2: '847,000+ fuentes legales', trust3: '100% confidencial' },
};

const LegalChat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef(null);

  const lang = (user?.language || 'en').replace(/-.*/, '');
  const jurisdiction = user?.jurisdiction || user?.country || 'US';
  const isPro = user?.plan === 'pro';
  const ui = uiLabels[lang] || uiLabels.en;
  const questions = (suggestedQuestions[jurisdiction] || suggestedQuestions.US)[lang] || suggestedQuestions.US.en;
  const FREE_LIMIT = 3;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await axios.get(`${API}/chat/conversations`, { withCredentials: true });
        setConversations(res.data || []);
      } catch (e) { console.error(e); }
    };
    loadConversations();
  }, []);

  const loadMessages = async (convId) => {
    setActiveConvId(convId);
    try {
      const res = await axios.get(`${API}/chat/conversations/${convId}/messages`, { withCredentials: true });
      const msgs = res.data || [];
      setMessages(msgs);
      setMessageCount(msgs.filter(m => m.role === 'user').length);
    } catch (e) { console.error(e); }
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setMessageCount(0);
  };

  const sendMessage = async (text) => {
    if (!text?.trim() || sending) return;
    if (!isPro && messageCount >= FREE_LIMIT) return;

    const userMsg = { role: 'user', content: text.trim(), created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    // Add a placeholder AI message that we'll stream into
    const aiPlaceholder = { role: 'assistant', content: '', created_at: new Date().toISOString(), streaming: true };
    setMessages(prev => [...prev, aiPlaceholder]);

    try {
      const res = await fetch(`${API}/chat/send-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: activeConvId,
        }),
      });

      if (!res.ok) {
        throw new Error(res.statusText);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'meta' && event.conversation_id) {
              if (!activeConvId) {
                setActiveConvId(event.conversation_id);
                setConversations(prev => [
                  { conversation_id: event.conversation_id, title: text.trim().substring(0, 50), created_at: new Date().toISOString() },
                  ...prev,
                ]);
              }
            } else if (event.type === 'token') {
              fullText += event.text;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.streaming) {
                  updated[updated.length - 1] = { ...last, content: fullText };
                }
                return updated;
              });
            } else if (event.type === 'done') {
              // Finalize the message
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.streaming) {
                  updated[updated.length - 1] = { ...last, streaming: false };
                }
                return updated;
              });
            }
          } catch { /* skip malformed lines */ }
        }
      }

      setMessageCount(prev => prev + 1);
    } catch (e) {
      // Remove placeholder and show error
      setMessages(prev => {
        const updated = prev.filter(m => !m.streaming);
        return [...updated, {
          role: 'assistant',
          content: lang === 'fr' ? 'Archer est temporairement indisponible — veuillez reessayer dans un moment.' : 'Archer is temporarily unavailable — please try again in a moment.',
          created_at: new Date().toISOString(),
        }];
      });
    } finally {
      setSending(false);
    }
  };

  const isLocked = !isPro && messageCount >= FREE_LIMIT;

  return (
    <div className="flex h-[calc(100vh-52px)]" data-testid="legal-chat-page">
      {/* Sidebar - conversations */}
      <div className="w-64 bg-white border-r border-[#ebebeb] flex flex-col">
        <div className="p-3 border-b border-[#ebebeb]">
          <button onClick={startNewConversation} className="w-full px-3 py-2 bg-[#1a56db] text-white text-xs font-medium rounded-lg hover:bg-[#1e40af] transition-colors" data-testid="new-chat-btn">
            + {ui.newChat}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <button key={c.conversation_id} onClick={() => loadMessages(c.conversation_id)}
              className={`w-full text-left px-3 py-2.5 text-xs border-b border-[#f3f4f6] hover:bg-[#f8f8f8] transition-colors ${activeConvId === c.conversation_id ? 'bg-[#eff6ff] border-l-2 border-l-[#1a56db]' : ''}`}
              data-testid={`conv-${c.conversation_id}`}>
              <div className="font-medium text-[#111827] truncate">{c.title || 'New conversation'}</div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">{new Date(c.created_at).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[#fafafa]">
        {/* Archer header */}
        <div className="bg-white border-b border-[#ebebeb] px-6 py-4" data-testid="archer-header">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0" data-testid="archer-avatar">
              <span className="text-white text-lg font-bold">A</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#111827]" data-testid="archer-name">Archer</span>
                <span className="flex items-center gap-1 text-[10px] text-[#16a34a] font-medium bg-[#f0fdf4] px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-[#16a34a] rounded-full" /> {ui.available}
                </span>
              </div>
              <div className="text-xs text-[#6b7280]">{ui.credential} · {ui.exp}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280] mb-2" data-testid="archer-credential-bar">
            <BookOpen size={11} className="text-[#1a56db]" />
            <span>{ui.analyzing}</span>
            <span className="mx-1">·</span>
            <span>US Federal Law + All 50 States + Belgian Law</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[#9ca3af]" data-testid="trust-badges">
            <span className="flex items-center gap-1"><Zap size={10} className="text-[#f59e0b]" /> {ui.trust1}</span>
            <span className="flex items-center gap-1"><BookOpen size={10} className="text-[#1a56db]" /> {ui.trust2}</span>
            <span className="flex items-center gap-1"><Shield size={10} className="text-[#16a34a]" /> {ui.trust3}</span>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center h-full" data-testid="empty-state">
              <div className="w-16 h-16 rounded-full bg-[#1e3a5f] flex items-center justify-center mb-4">
                <span className="text-white text-2xl font-bold">A</span>
              </div>
              <h3 className="text-base font-semibold text-[#111827] mb-1">Archer</h3>
              <p className="text-xs text-[#6b7280] mb-6">{ui.credential} · {ui.exp}</p>
              <div className="grid grid-cols-2 gap-2 max-w-md" data-testid="suggested-questions">
                {questions.map((q, qIdx) => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-left px-3 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-xs text-[#374151] hover:border-[#1a56db] hover:bg-[#eff6ff] transition-all"
                    data-testid={`suggested-q-${qIdx}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, msgIdx) => (
            <div key={msg.created_at || `msg-${msgIdx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`msg-${msgIdx}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
              )}
              <div className={`max-w-[70%] ${msg.role === 'user'
                ? 'bg-[#1a56db] text-white rounded-2xl rounded-br-md px-4 py-2.5'
                : 'bg-white border border-[#e5e7eb] rounded-2xl rounded-bl-md px-4 py-3'}`}>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? '' : 'text-[#111827]'}`}>{msg.content}</div>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-[#9ca3af]">
                    <BookOpen size={9} /> {ui.sources}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex items-start gap-2" data-testid="typing-indicator">
              <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <div className="bg-white border border-[#e5e7eb] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <Loader2 size={12} className="animate-spin text-[#1a56db]" />
                  {ui.typing}
                </div>
              </div>
            </div>
          )}

          {/* Book a call CTA — after every 3rd response */}
          {messages.filter(m => m.role === 'assistant').length > 0 && messages.filter(m => m.role === 'assistant').length % 3 === 0 && !sending && (
            <div className="mx-auto max-w-sm bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3 text-center" data-testid="book-call-cta">
              <div className="text-xs text-[#92400e] mb-2">{ui.bookCall}</div>
              <button className="px-4 py-1.5 bg-[#f59e0b] text-white text-xs font-medium rounded-lg hover:bg-[#d97706] transition-colors" data-testid="book-call-btn">
                <Phone size={11} className="inline mr-1" /> {ui.bookBtn} — $149
              </button>
            </div>
          )}

          {/* Free plan limit */}
          {isLocked && (
            <div className="mx-auto max-w-sm bg-[#f5f3ff] border border-[#ddd6fe] rounded-xl p-4 text-center" data-testid="free-limit-banner">
              <Lock size={20} className="text-[#7c3aed] mx-auto mb-2" />
              <div className="text-xs text-[#5b21b6] mb-3">{ui.freeLimit}</div>
              <button onClick={() => window.location.href = '/settings'} className="px-5 py-2 bg-[#7c3aed] text-white text-xs font-medium rounded-lg hover:bg-[#6d28d9] transition-colors" data-testid="upgrade-btn">
                {ui.upgrade}
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-[#ebebeb] px-6 py-3" data-testid="chat-input-area">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLocked ? '' : ui.placeholder}
              disabled={sending || isLocked}
              className="flex-1 px-4 py-2.5 bg-[#f8f8f8] border border-[#e5e7eb] rounded-xl text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#1a56db] focus:ring-1 focus:ring-[#1a56db] disabled:opacity-50"
              data-testid="chat-input"
            />
            <button type="submit" disabled={!input.trim() || sending || isLocked}
              className="p-2.5 bg-[#1a56db] text-white rounded-xl hover:bg-[#1e40af] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="chat-send-btn">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LegalChat;
