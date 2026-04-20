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
    title: 'AFFINE TON DOSSIER',
    progressHeadStrong: (n) => `${n} questions.`,
    progressHead: ' Chaque réponse affine ton score.',
    questionFmt: (n, total) => `QUESTION ${n} / ${total}`,
    none: 'Aucune question en attente.',
  },
  en: {
    title: 'REFINE YOUR CASE',
    progressHeadStrong: (n) => `${n} questions.`,
    progressHead: ' Each answer sharpens your score.',
    questionFmt: (n, total) => `QUESTION ${n} / ${total}`,
    none: 'No pending questions.',
  },
  nl: {
    title: 'VERFIJN JE DOSSIER',
    progressHeadStrong: (n) => `${n} vragen.`,
    progressHead: ' Elke antwoord scherpt je score aan.',
    questionFmt: (n, total) => `VRAAG ${n} / ${total}`,
    none: 'Geen openstaande vragen.',
  },
};

// Keep question text on one line. If it's too wordy, cut at the first
// question mark or sentence break, never truncate mid-word.
function shortenQuestion(raw) {
  if (!raw) return '';
  const clean = String(raw).trim().replace(/\s+/g, ' ');
  if (clean.length <= 80) return clean;
  const firstQ = clean.indexOf('?');
  if (firstQ > 20 && firstQ < 100) return clean.slice(0, firstQ + 1);
  const firstStop = clean.search(/[.!]\s/);
  if (firstStop > 20 && firstStop < 100) return clean.slice(0, firstStop + 1);
  return clean;
}

export default function V3RailQuestions({ questions = [], onAnswer, language }) {
  const copy = COPY[resolveLang(language)];
  const open = questions.filter((q) => !q.answered);
  const visible = open.slice(0, 3);
  return (
    <div className="rail-card" data-testid="rail-questions">
      <div className="rail-card-head-row">
        <span className="rail-card-h blue">{copy.title}</span>
      </div>

      {visible.length === 0 ? (
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', padding: '4px 0' }}>{copy.none}</div>
      ) : (
        <>
          <div className="q-progress">
            <strong>{copy.progressHeadStrong(visible.length)}</strong>{copy.progressHead}
          </div>
          {visible.map((q, idx) => (
            <div key={q.id || idx} className="q-card" data-testid={`rail-question-${q.id || idx}`}>
              <div className="q-num">{copy.questionFmt(idx + 1, visible.length)}</div>
              <div className="q-text">{shortenQuestion(q.question_text || q.text || q.question)}</div>
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
          ))}
        </>
      )}
    </div>
  );
}
