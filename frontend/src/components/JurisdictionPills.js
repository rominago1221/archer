import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LANGS = [
  { key: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'English', short: 'EN' },
  { key: 'fr', flag: '\u{1F1EB}\u{1F1F7}', label: 'Fran\u00e7ais', short: 'FR' },
  { key: 'nl', flag: '\u{1F1F3}\u{1F1F1}', label: 'Nederlands', short: 'NL' },
  { key: 'de', flag: '\u{1F1E9}\u{1F1EA}', label: 'Deutsch', short: 'DE' },
  { key: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'Espa\u00f1ol', short: 'ES' },
];

const JurisdictionPills = ({ jurisdiction, language, onSwitch, onLanguageChange }) => {
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { key: 'US', flag: '\u{1F1FA}\u{1F1F8}', label: 'United States' },
    { key: 'BE', flag: '\u{1F1E7}\u{1F1EA}', label: 'Belgium' },
  ];

  const currentLang = LANGS.find(l => l.key === (language || 'en').replace(/-.*/, '')) || LANGS[0];

  return (
    <div data-testid="jurisdiction-language-bar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Jurisdiction pills */}
      <div data-testid="jurisdiction-pills" style={{ display: 'flex', gap: 6 }}>
        {items.map(item => {
          const active = (jurisdiction || 'US') === item.key;
          return (
            <button
              key={item.key}
              data-testid={`jurisdiction-pill-${item.key}`}
              onClick={() => onSwitch(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 20, border: 'none',
                background: active ? '#1a56db' : '#f4f4f1',
                color: active ? '#fff' : '#374151',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>&#x2696;&#xFE0F;</span>
              <span style={{ fontSize: 13 }}>{item.flag}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Language selector */}
      <div ref={langRef} style={{ position: 'relative' }}>
        <button onClick={() => setLangOpen(!langOpen)} data-testid="language-selector-btn"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 12px', borderRadius: 20, border: 'none',
            background: '#f3f4f6', color: '#374151',
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}>
          <span style={{ fontSize: 12 }}>{currentLang.flag}</span>
          <span>{currentLang.short}</span>
          <ChevronDown size={10} color="#9ca3af" />
        </button>
        {langOpen && (
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #e2e0db', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 200, minWidth: 150, overflow: 'hidden' }}>
            {LANGS.map(l => (
              <button key={l.key} onClick={() => { onLanguageChange?.(l.key); setLangOpen(false); }} data-testid={`lang-option-${l.key}`}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none', background: l.key === currentLang.key ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 12, color: '#374151', textAlign: 'left' }}>
                <span>{l.flag}</span><span>{l.label}</span>
                {l.key === currentLang.key && <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#1a56db' }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JurisdictionPills;
