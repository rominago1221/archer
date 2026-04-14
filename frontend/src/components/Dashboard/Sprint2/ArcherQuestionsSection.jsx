import React from 'react';
import ArcherQuestionItem from './ArcherQuestionItem';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   questions: array of { id, text, choices }
//   onAnswer: handler called with { question_id, question_text, choice_selected }
//   language: 'fr' | 'en'
export default function ArcherQuestionsSection({ questions = [], onAnswer, language = 'fr' }) {
  const t = useDashboardT(language);
  if (!Array.isArray(questions) || questions.length === 0) return null;

  const titleKey = questions.length === 1 ? 'archer_questions.title_one' : 'archer_questions.title_many';

  return (
    <div
      data-testid="archer-questions"
      style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #fafaf8 100%)',
        border: '0.5px solid #1a56db',
        borderRadius: 14, padding: '22px 26px', marginBottom: 20,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a56db, #1e40af)',
          color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800,
        }}>A</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0f' }}>
            {t(titleKey, { count: questions.length })}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>
            {t('archer_questions.subtitle')}
          </div>
        </div>
        <div style={{
          fontSize: 9, fontWeight: 800, color: '#1a56db',
          background: '#ffffff', padding: '4px 10px', borderRadius: 30,
          border: '0.5px solid #1a56db',
        }}>
          {questions.length}
        </div>
      </div>

      {questions.map((q) => (
        <ArcherQuestionItem key={q.id} question={q} onAnswer={onAnswer} />
      ))}
    </div>
  );
}
