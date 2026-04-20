import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

// Mirrors the mockup's "Pose ta question" rail card:
// blue card-h + right "RÉPONSE 30S" pill, rounded input + arrow button,
// 3 pre-filled suggestion chips that submit on click.
function resolveLang(lang) {
  const l = String(lang || 'en').slice(0, 2).toLowerCase();
  return l === 'fr' || l === 'nl' ? l : 'en';
}

const COPY = {
  fr: {
    title: 'POSE TA QUESTION',
    badge: 'RÉPONSE 30S',
    placeholder: 'Une question sur ton dossier ?',
    send: 'Envoyer',
    suggestions: [
      'Si je refuse de payer ?',
      'Délai de réponse ?',
      'Justice de paix ?',
    ],
  },
  en: {
    title: 'ASK A QUESTION',
    badge: 'ANSWER IN 30S',
    placeholder: 'Question about your case?',
    send: 'Send',
    suggestions: [
      'What if I refuse to pay?',
      'Response deadline?',
      'Small-claims court?',
    ],
  },
  nl: {
    title: 'STEL EEN VRAAG',
    badge: 'ANTWOORD 30S',
    placeholder: 'Vraag over je dossier?',
    send: 'Verzenden',
    suggestions: [
      'Als ik weiger te betalen?',
      'Responstermijn?',
      'Vredegerecht?',
    ],
  },
};

export default function V3RailChat({ onSubmit, language }) {
  const copy = COPY[resolveLang(language)];
  const [value, setValue] = useState('');

  const submit = (q) => {
    const text = String(q || value).trim();
    if (!text) return;
    onSubmit && onSubmit(text);
    setValue('');
  };

  return (
    <div className="rail-card" data-testid="rail-chat">
      <div className="rail-card-head-row">
        <span className="rail-card-h blue">{copy.title}</span>
        <span className="chat-badge">{copy.badge}</span>
      </div>

      <form
        className="chat-input-row"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <input
          type="text"
          className="chat-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          data-testid="rail-chat-input"
        />
        <button
          type="submit"
          className="chat-send"
          aria-label={copy.send}
          data-testid="rail-chat-send"
          disabled={!value.trim()}
        >
          <ArrowRight size={14} aria-hidden />
        </button>
      </form>

      <div className="chat-suggestions">
        {copy.suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            className="chat-sug"
            onClick={() => submit(s)}
            data-testid={`rail-chat-sug-${i}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
