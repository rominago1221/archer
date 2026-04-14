import React, { useState } from 'react';

// Props:
//   question: { id, text, choices }
//   onAnswer: (payload) => void
export default function ArcherQuestionItem({ question, onAnswer }) {
  const [selected, setSelected] = useState(null);
  if (!question) return null;

  const handleClick = (choice) => {
    setSelected(choice);
    onAnswer?.({ question_id: question.id, question_text: question.text, choice_selected: choice });
  };

  return (
    <div
      data-testid={`archer-question-${question.id}`}
      style={{ marginBottom: 16 }}
    >
      <div style={{
        fontSize: 13, color: '#0a0a0f', fontWeight: 600,
        marginBottom: 10, lineHeight: 1.4,
      }}>
        {question.text}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(question.choices || []).map((choice, i) => {
          const active = selected === choice;
          return (
            <button
              key={i}
              type="button"
              data-testid={`archer-choice-${question.id}-${i}`}
              onClick={() => handleClick(choice)}
              style={{
                padding: '7px 14px',
                background: active ? '#1a56db' : '#ffffff',
                color: active ? '#ffffff' : '#0a0a0f',
                border: active ? '0.5px solid #1a56db' : '0.5px solid #e2e0db',
                borderRadius: 30,
                fontSize: 11, cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (active) return;
                e.currentTarget.style.background = '#1a56db';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#1a56db';
              }}
              onMouseLeave={(e) => {
                if (active) return;
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#0a0a0f';
                e.currentTarget.style.borderColor = '#e2e0db';
              }}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}
