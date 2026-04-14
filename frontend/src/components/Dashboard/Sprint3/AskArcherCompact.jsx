import React, { useState } from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   onSubmit   → (question: string) => void
//   language   → 'fr' | 'en'
export default function AskArcherCompact({ onSubmit, language = 'fr' }) {
  const t = useDashboardT(language);
  const [value, setValue] = useState('');

  const submit = () => {
    const q = value.trim();
    if (!q) return;
    onSubmit?.(q);
    setValue('');
  };

  return (
    <div
      data-testid="ask-archer-compact"
      style={{
        background: '#ffffff', border: '0.5px solid #e2e0db',
        borderRadius: 12, padding: '20px 24px', marginBottom: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a56db, #1e40af)',
          color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>A</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0f' }}>
            {t('ask_archer.title')}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>
            {t('ask_archer.subtitle')}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fafaf8', border: '0.5px solid #e2e0db',
        borderRadius: 10, padding: '12px 16px',
      }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder={t('ask_archer.placeholder')}
          data-testid="ask-archer-input"
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 13, color: '#0a0a0f', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={submit}
          data-testid="ask-archer-send"
          style={{
            padding: '6px 12px', background: '#1a56db',
            color: '#ffffff', border: 'none', borderRadius: 6,
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('ask_archer.send_btn')}
        </button>
      </div>
    </div>
  );
}
