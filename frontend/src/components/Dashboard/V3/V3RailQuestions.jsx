import React from 'react';

// Mirrors the mockup's Contexte card: header with "X/Y répondues" progress
// strip, then one .q-card per open question (numbered Q.01, text, choice pills).
// Questions fire onAnswer(payload) exactly like the legacy ArcherQuestionsSection.
function resolveLang(lang) {
  const l = String(lang || 'en').slice(0, 2).toLowerCase();
  return l === 'fr' || l === 'nl' ? l : 'en';
}

const COPY = {
  fr: {
    title: 'CONTEXTE',
    progressFmt: (answered, total) => `${answered}/${total} répondues`,
    none: 'Aucune question en attente.',
  },
  en: {
    title: 'CONTEXT',
    progressFmt: (answered, total) => `${answered}/${total} answered`,
    none: 'No pending questions.',
  },
  nl: {
    title: 'CONTEXT',
    progressFmt: (answered, total) => `${answered}/${total} beantwoord`,
    none: 'Geen openstaande vragen.',
  },
};

export default function V3RailQuestions({ questions = [], onAnswer, language }) {
  const copy = COPY[resolveLang(language)];
  const open = questions.filter((q) => !q.answered);
  const total = questions.length;
  const answered = total - open.length;

  return (
    <div className="rail-card" data-testid="rail-questions">
      <div className="rail-card-head-row">
        <span className="rail-card-h blue">{copy.title}</span>
        {total > 0 && (
          <span className="rail-card-count">{copy.progressFmt(answered, total)}</span>
        )}
      </div>

      {open.length === 0 ? (
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', padding: '4px 0' }}>{copy.none}</div>
      ) : (
        open.slice(0, 3).map((q, idx) => (
          <div key={q.id || idx} className="q-card" data-testid={`rail-question-${q.id || idx}`}>
            <div className="q-num">Q.{String(idx + 1).padStart(2, '0')}</div>
            <div className="q-text">{q.question_text || q.text || q.question}</div>
            <div className="q-btns">
              {(q.choices || q.options || []).slice(0, 5).map((c, j) => {
                const label = typeof c === 'string' ? c : (c?.label || c?.value || '');
                const value = typeof c === 'string' ? c : (c?.value || c?.label || label);
                return (
                  <button
                    key={j}
                    type="button"
                    className="q-btn"
                    data-testid={`rail-question-choice-${idx}-${j}`}
                    onClick={() => onAnswer && onAnswer({
                      question_id: q.id,
                      question_text: q.question_text || q.text,
                      choice_selected: value,
                    })}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
