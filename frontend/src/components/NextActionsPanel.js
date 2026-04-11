import React from 'react';
import { Mail, Phone, Clock, Info } from 'lucide-react';

const classifyAction = (step) => {
  const title = (typeof step === 'string' ? step : (step.title || '')).toLowerCase();
  const type = (step.action_type || '').toLowerCase();
  // Explicit action_type from AI
  if (type === 'send_letter' || type === 'draft_response') return 'letter';
  if (type === 'book_lawyer') return 'call';
  if (type === 'wait' || type === 'no_action') return 'passive';
  // Heuristic from title keywords
  if (title.includes('letter') || title.includes('lettre') || title.includes('brief') || title.includes('file') || title.includes('motion') || title.includes('challenge') || title.includes('demand') || title.includes('formal') || title.includes('submit') || title.includes('respond') || title.includes('contest') || title.includes('claim') || title.includes('prepare') || title.includes('draft') || title.includes('counterclaim')) return 'letter';
  if (title.includes('attorney') || title.includes('lawyer') || title.includes('avocat') || title.includes('advocaat') || title.includes('consult') || title.includes('call') || title.includes('book') || title.includes('schedule') || title.includes('engage')) return 'call';
  if (title.includes('wait') || title.includes('keep') || title.includes('monitor') || title.includes('document') || title.includes('gather') || title.includes('collect') || title.includes('save') || title.includes('arrange') || title.includes('avoid') || title.includes('transport')) return 'passive';
  return 'letter'; // Default: actionable letter
};

const typeConfig = {
  letter: { icon: Mail, color: '#1a56db', bg: '#eff6ff', border: '#bfdbfe' },
  call: { icon: Phone, color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  passive: { icon: Clock, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
};

const T = {
  en: { genLetter: 'Generate letter', bookCall: 'Book a call', nextActions: 'Next actions' },
  fr: { genLetter: 'Générer la lettre', bookCall: 'Réserver un appel', nextActions: 'Prochaines actions' },
  nl: { genLetter: 'Brief genereren', bookCall: 'Bel reserveren', nextActions: 'Volgende acties' },
};

const NextActionsPanel = ({ steps, lang, onLetterClick, onCallClick }) => {
  const t = T[lang] || T.en;
  if (!steps || steps.length === 0) return null;

  return (
    <>
      <div style={{ padding: '10px 14px 6px', fontSize: 9, fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.nextActions}</div>
      {steps.map((s, i) => {
        const sTitle = typeof s === 'string' ? s : (s.title || s.titre || '');
        const sDesc = typeof s === 'string' ? '' : (s.description || '');
        const actionType = classifyAction(s);
        const cfg = typeConfig[actionType];
        const Icon = cfg.icon;
        const isClickable = actionType !== 'passive';

        return (
          <div key={i} data-testid={`action-item-${i}`}
            onClick={() => {
              if (actionType === 'letter') onLetterClick?.(s);
              else if (actionType === 'call') onCallClick?.();
            }}
            style={{
              margin: '0 8px 0', padding: 16,
              borderBottom: i < steps.length - 1 ? '0.5px solid #f0ede8' : 'none',
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (isClickable) e.currentTarget.style.background = cfg.bg; }}
            onMouseLeave={e => { if (isClickable) e.currentTarget.style.background = 'transparent'; }}>
            {/* Top row: number + icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: cfg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: cfg.bg, border: `0.5px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={cfg.color} />
              </div>
            </div>
            {/* Title */}
            <div style={{ fontSize: 13, fontWeight: 500, color: cfg.color === '#6b7280' ? '#374151' : cfg.color, lineHeight: 1.4, marginBottom: 4 }}>{sTitle}</div>
            {/* Description */}
            {sDesc && <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, marginBottom: isClickable ? 8 : 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sDesc}</div>}
            {/* Action link */}
            {actionType === 'letter' && (
              <div style={{ fontSize: 10, fontWeight: 600, color: '#1a56db', textAlign: 'right' }}>{t.genLetter} →</div>
            )}
            {actionType === 'call' && (
              <div style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', textAlign: 'right' }}>{t.bookCall} →</div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default NextActionsPanel;
