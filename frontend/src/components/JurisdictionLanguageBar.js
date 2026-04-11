import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertTriangle, Scale, Globe } from 'lucide-react';

const JURISDICTIONS = [
  { key: 'US', flag: '\u{1F1FA}\u{1F1F8}', label: 'United States', sublabel: 'US Federal + State Law' },
  { key: 'BE', flag: '\u{1F1E7}\u{1F1EA}', label: 'Belgium', sublabel: 'Belgian Federal + Regional Law' },
];

const LANGUAGES = [
  { key: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'English' },
  { key: 'fr', flag: '\u{1F1EB}\u{1F1F7}', label: 'Fran\u00e7ais' },
  { key: 'nl', flag: '\u{1F1F3}\u{1F1F1}', label: 'Nederlands' },
  { key: 'de', flag: '\u{1F1E9}\u{1F1EA}', label: 'Deutsch' },
  { key: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'Espa\u00f1ol' },
];

const warningText = {
  en: (j) => `Switching jurisdiction will apply ${j === 'US' ? 'US' : 'Belgian'} law to all your analyses.`,
  fr: (j) => `Changer de juridiction appliquera le droit ${j === 'US' ? 'americain' : 'belge'} a toutes vos analyses.`,
  nl: (j) => `Jurisdictie wijzigen past ${j === 'US' ? 'Amerikaans' : 'Belgisch'} recht toe op al uw analyses.`,
  de: (j) => `Zustandigkeit andern wendet ${j === 'US' ? 'US' : 'belgisches'} Recht auf alle Analysen an.`,
  es: (j) => `Cambiar la jurisdiccion aplicara la ley ${j === 'US' ? 'estadounidense' : 'belga'} a todos sus analisis.`,
};

const Dropdown = ({ items, current, onSelect, icon: Icon, testIdPrefix }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = items.find(i => i.key === current) || items[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-xs font-medium text-[#374151] hover:border-[#1a56db] hover:text-[#1a56db] transition-all cursor-pointer"
        data-testid={`${testIdPrefix}-btn`}
      >
        {Icon && <Icon size={12} className="text-[#6b7280]" />}
        <span>{selected.flag}</span>
        <span className="hidden sm:inline">{selected.label}</span>
        <ChevronDown size={11} className={`text-[#9ca3af] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-[200] overflow-hidden bg-white border border-[#e5e7eb] rounded-xl shadow-lg"
          style={{ minWidth: '200px' }}
          data-testid={`${testIdPrefix}-dropdown`}
        >
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => { onSelect(item.key); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[#f8f8f8] ${item.key === current ? 'bg-[#eff6ff]' : ''}`}
              data-testid={`${testIdPrefix}-option-${item.key}`}
            >
              <span className="text-base">{item.flag}</span>
              <div className="flex-1">
                <div className="text-xs font-medium text-[#111827]">{item.label}</div>
                {item.sublabel && <div className="text-[10px] text-[#9ca3af]">{item.sublabel}</div>}
              </div>
              {item.key === current && <div className="w-1.5 h-1.5 rounded-full bg-[#1a56db]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const JurisdictionLanguageBar = ({ jurisdiction, language, onJurisdictionChange, onLanguageChange, compact = false }) => {
  const [showWarning, setShowWarning] = useState(null);

  const handleJurisdictionChange = (newJ) => {
    if (newJ !== jurisdiction) {
      setShowWarning(newJ);
      setTimeout(() => setShowWarning(null), 4000);
    }
    onJurisdictionChange(newJ);
  };

  const lang = language?.replace(/-.*/, '') || 'en';
  const getWarning = warningText[lang] || warningText.en;

  return (
    <div className="flex items-center gap-2" data-testid="jurisdiction-language-bar">
      <Dropdown
        items={JURISDICTIONS}
        current={jurisdiction || 'US'}
        onSelect={handleJurisdictionChange}
        icon={Scale}
        testIdPrefix="jurisdiction"
      />
      <Dropdown
        items={LANGUAGES}
        current={lang}
        onSelect={onLanguageChange}
        icon={Globe}
        testIdPrefix="language"
      />
      {showWarning && (
        <div className="fixed top-16 right-4 z-[300] flex items-center gap-2 px-4 py-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2" data-testid="jurisdiction-warning">
          <AlertTriangle size={14} className="text-[#d97706] flex-shrink-0" />
          <span className="text-xs text-[#92400e] font-medium">{getWarning(showWarning)}</span>
        </div>
      )}
    </div>
  );
};

export { JURISDICTIONS, LANGUAGES };
export default JurisdictionLanguageBar;
