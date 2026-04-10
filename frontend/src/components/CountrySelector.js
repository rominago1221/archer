import React, { useState, useRef, useEffect } from 'react';
import { LOCALE_OPTIONS } from '../data/landingTranslations';
import { ChevronDown } from 'lucide-react';

const CountrySelector = ({ currentLocale, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LOCALE_OPTIONS.find(o => o.key === currentLocale) || LOCALE_OPTIONS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 transition-colors hover:border-[#ccc]"
        style={{ background: '#fff', border: '0.5px solid #ebebeb', borderRadius: '20px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}
        data-testid="country-selector-btn"
      >
        <span>{current.flag}</span>
        <span className="text-[#333] font-medium">{current.label}</span>
        <ChevronDown size={13} className={`text-[#999] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-[100] overflow-hidden"
          style={{ background: '#fff', border: '0.5px solid #ebebeb', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', minWidth: '260px' }}
          data-testid="country-selector-dropdown"
        >
          {LOCALE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onSelect(opt.key); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8f8f8] ${opt.key === currentLocale ? 'bg-[#eff6ff]' : ''}`}
              data-testid={`locale-option-${opt.key}`}
            >
              <span className="text-lg">{opt.flag}</span>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-[#111]">{opt.label}</div>
                <div className="text-[11px] text-[#999]">{opt.sublabel}</div>
              </div>
              {opt.key === currentLocale && (
                <div className="w-2 h-2 rounded-full bg-[#1a56db]"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountrySelector;
