import React from 'react';
import { Mail, Phone, Clock, Bell } from 'lucide-react';

const classifyAction = (step) => {
  const title = (typeof step === 'string' ? step : (step.title || '')).toLowerCase();
  const type = (step.action_type || '').toLowerCase();
  if (type === 'send_letter' || type === 'draft_response') return 'letter';
  if (type === 'book_lawyer') return 'call';
  if (type === 'wait' || type === 'no_action') return 'passive';
  if (title.includes('letter') || title.includes('lettre') || title.includes('brief') || title.includes('file') || title.includes('motion') || title.includes('challenge') || title.includes('demand') || title.includes('formal') || title.includes('submit') || title.includes('respond') || title.includes('contest') || title.includes('claim') || title.includes('prepare') || title.includes('draft') || title.includes('counterclaim')) return 'letter';
  if (title.includes('attorney') || title.includes('lawyer') || title.includes('avocat') || title.includes('advocaat') || title.includes('consult') || title.includes('call') || title.includes('book') || title.includes('schedule') || title.includes('engage')) return 'call';
  if (title.includes('wait') || title.includes('keep') || title.includes('monitor') || title.includes('document') || title.includes('gather') || title.includes('collect') || title.includes('save') || title.includes('arrange') || title.includes('avoid') || title.includes('transport')) return 'passive';
  return 'letter';
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
    <div style={{ borderLeft: '3px solid #1a56db', background: '#f0f7ff', margin: '0 0 8px', borderRadius: '0 8px 8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px 6px' }}>
        <Bell size={14} color="#1a56db" />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0f', letterSpacing: '-0.2px' }}>{t.nextActions}</span>
      </div>
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
              margin: '0 8px 6px', padding: 14, background: '#fff',
              border: '1px solid #d1d5db', borderRadius: 8,
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (isClickable) { e.currentTarget.style.background = cfg.bg; e.currentTarget.style.borderColor = cfg.color; } }}
            onMouseLeave={e => { if (isClickable) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#d1d5db'; } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: cfg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={cfg.color} />
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0a0a0f', lineHeight: 1.4, marginBottom: 4 }}>{sTitle}</div>
            {sDesc && <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: isClickable ? 8 : 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sDesc}</div>}
            {actionType === 'letter' && (
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a56db', textAlign: 'right' }}>{t.genLetter} →</div>
            )}
            {actionType === 'call' && (
              <div style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', textAlign: 'right' }}>{t.bookCall} →</div>
            )}
          </div>
        );
      })}
      <div style={{ height: 8 }} />
    </div>
  );
};

export default NextActionsPanel;
