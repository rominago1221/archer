import React, { useState } from 'react';
import { MessageSquareMore, Check, Loader2 } from 'lucide-react';

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
    sending: 'Envoi…',
    confirmed: 'Réponse enregistrée ✓',
    allAnswered: 'Archer réanalyse ton dossier…',
  },
  en: {
    title: 'REFINE YOUR CASE',
    progressHeadStrong: (n) => `${n} questions.`,
    progressHead: ' Each answer sharpens your score.',
    questionFmt: (n, total) => `QUESTION ${n} / ${total}`,
    none: 'No pending questions.',
    sending: 'Saving…',
    confirmed: 'Answer saved ✓',
    allAnswered: 'Archer is re-analysing your case…',
  },
  nl: {
    title: 'VERFIJN JE DOSSIER',
    progressHeadStrong: (n) => `${n} vragen.`,
    progressHead: ' Elke antwoord scherpt je score aan.',
    questionFmt: (n, total) => `VRAAG ${n} / ${total}`,
    none: 'Geen openstaande vragen.',
    sending: 'Versturen…',
    confirmed: 'Antwoord opgeslagen ✓',
    allAnswered: 'Archer analyseert je dossier opnieuw…',
  },
};

// Clean whitespace only — truncation is handled by CSS (-webkit-line-clamp
// to 2 lines) so long questions get an ellipsis and the full text stays
// available via the title="..." hover tooltip. Lets the IA ship longer
// prompts without breaking the rail layout.
function cleanQuestion(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/\s+/g, ' ');
}

export default function V3RailQuestions({ questions = [], onAnswer, onAllAnswered, language }) {
  const copy = COPY[resolveLang(language)];
  const open = questions.filter((q) => !q.answered);
  const visible = open.slice(0, 3);

  // Local state for click feedback. Keys by question id; value =
  // { choice, phase }. phase: 'pending' (POST in-flight), 'saved', 'error'.
  const [clicks, setClicks] = useState({});

  const handleClick = (q, value) => {
    const qid = q.id || q.question_id || q.question_text || String(value);
    // INSTANT visual feedback — flip to `saved` (green + check) on the
    // very next paint, BEFORE awaiting the API. Previously the user
    // stared at an unresponsive button for ~10 s while the backend
    // processed the answer; the button now commits locally first.
    const nextClicks = { ...clicks, [qid]: { choice: value, phase: 'saved' } };
    setClicks(nextClicks);
    // Fire-and-forget the API call. Errors flip to 'error' state but
    // never block the UI.
    Promise.resolve()
      .then(() => onAnswer?.({
        question_id: q.id,
        question_text: q.question_text || q.text,
        choice_selected: value,
      }))
      .catch(() => {
        setClicks((prev) => ({ ...prev, [qid]: { choice: value, phase: 'error' } }));
      });
    // If ALL visible questions are now answered locally, ping the
    // parent so it can trigger a re-analyse (handled in CaseDetailV7).
    const allSaved = visible.every((vq) => {
      const vqid = vq.id || vq.question_id || vq.question_text;
      return nextClicks[vqid]?.phase === 'saved';
    });
    if (allSaved && typeof onAllAnswered === 'function') {
      onAllAnswered();
    }
  };

  return (
    <div className="rail-card" data-testid="rail-questions">
      <div className="rail-head">
        <div className="rail-head-icon"><MessageSquareMore size={13} aria-hidden /></div>
        <div className="rail-head-title">{copy.title}</div>
      </div>

      {visible.length === 0 ? (
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', padding: '4px 0' }}>{copy.none}</div>
      ) : (
        <>
          <div className="q-progress">
            <strong>{copy.progressHeadStrong(visible.length)}</strong>{copy.progressHead}
          </div>
          {visible.map((q, idx) => {
            const qid = q.id || q.question_id || q.question_text || String(idx);
            const state = clicks[qid];
            return (
              <div key={qid} className="q-card" data-testid={`rail-question-${q.id || idx}`}>
                <div className="q-num">{copy.questionFmt(idx + 1, visible.length)}</div>
                <div
                  className="q-text"
                  data-fulltext={cleanQuestion(q.question_text || q.text || q.question)}
                  title={cleanQuestion(q.question_text || q.text || q.question)}
                >
                  {cleanQuestion(q.question_text || q.text || q.question)}
                </div>
                <div className="q-btns">
                  {(q.choices || q.options || []).slice(0, 5).map((c, j) => {
                    const label = typeof c === 'string' ? c : (c?.label || c?.value || '');
                    const value = typeof c === 'string' ? c : (c?.value || c?.label || label);
                    const isSelected = state?.choice === value;
                    const isPending = isSelected && state?.phase === 'pending';
                    const isSaved = isSelected && state?.phase === 'saved';
                    const cls = `q-btn${isSaved ? ' confirmed' : isSelected ? ' selected' : ''}`;
                    return (
                      <button
                        key={j}
                        type="button"
                        className={cls}
                        data-testid={`rail-question-choice-${idx}-${j}`}
                        disabled={isPending}
                        onClick={() => handleClick(q, value)}
                      >
                        {isPending && <Loader2 size={10} className="animate-spin" style={{ marginRight: 4, verticalAlign: 'middle' }} aria-hidden />}
                        {isSaved && <Check size={11} strokeWidth={3} style={{ marginRight: 4, verticalAlign: 'middle' }} aria-hidden />}
                        {label}
                      </button>
                    );
                  })}
                </div>
                {state?.phase === 'saved' && (
                  <div style={{ fontSize: 10.5, color: 'var(--green)', marginTop: 6, fontWeight: 600 }}>
                    {copy.confirmed}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
