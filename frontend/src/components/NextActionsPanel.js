import React from 'react';
import { Mail, Phone, Clock, FileText, Check } from 'lucide-react';

const classifyAction = (step) => {
  const title = (typeof step === 'string' ? step : (step.title || '')).toLowerCase();
  const type = (step.action_type || '').toLowerCase();
  if (type === 'send_letter' || type === 'draft_response' || type === 'rediger_reponse' || type === 'ajouter_document') return 'letter';
  if (type === 'book_lawyer' || type === 'contacter_avocat' || type === 'contacter_syndicat') return 'call';
  if (type === 'wait' || type === 'no_action' || type === 'aucune_action') return 'passive';
  if (title.includes('letter') || title.includes('lettre') || title.includes('brief') || title.includes('contest') || title.includes('demand') || title.includes('formal') || title.includes('submit') || title.includes('respond') || title.includes('file') || title.includes('motion') || title.includes('challenge') || title.includes('claim') || title.includes('prepare') || title.includes('draft') || title.includes('counterclaim') || title.includes('exiger') || title.includes('envoyer') || title.includes('communic')) return 'letter';
  if (title.includes('attorney') || title.includes('lawyer') || title.includes('avocat') || title.includes('advocaat') || title.includes('consult') || title.includes('call') || title.includes('book') || title.includes('schedule') || title.includes('syndicat') || title.includes('barreau')) return 'call';
  if (title.includes('wait') || title.includes('keep') || title.includes('monitor') || title.includes('document') || title.includes('gather') || title.includes('collect') || title.includes('save') || title.includes('rassembler') || title.includes('avoid') || title.includes('transport') || title.includes('photo') || title.includes('preuve') || title.includes('noter')) return 'passive';
  return 'letter';
};

function classifyFinding(f) {
  const text = ((f.text || '') + ' ' + (f.legal_ref || '') + ' ' + (f.risk_if_ignored || '')).toLowerCase();
  const impact = (f.impact || '').toLowerCase();
  const type = (f.type || '').toLowerCase();
  const criticalSignals = ['deadline', 'délai', 'void', 'invalid', 'nulle', 'nul', 'illegal', 'violation', 'perte', 'loss', 'impératif', 'critical', 'critique', 'immediately', 'immédiatement', 'urgent', 'days', 'jours'];
  if (type === 'deadline' || impact === 'high' || type === 'risk') {
    if (criticalSignals.some(s => text.includes(s)) || impact === 'high') return 'CRITICAL';
  }
  const importantSignals = ['strengthen', 'renforce', 'calcul', 'formula', 'formule', 'claeys', 'presumption', 'présomption', 'error', 'erreur', 'advantage', 'avantage', 'levier', 'leverage', 'incorrect', 'favorable', 'marge', 'technique', 'contestable'];
  if (importantSignals.some(s => text.includes(s)) || impact === 'medium') return 'IMPORTANT';
  return 'ATTENTION';
}

function extractLetterArguments(findings) {
  if (!findings || findings.length === 0) return [];
  return findings
    .filter(f => {
      const cat = classifyFinding(f);
      return cat === 'CRITICAL' || cat === 'IMPORTANT';
    })
    .map(f => ({
      title: f.text || '',
      legal_ref: f.legal_ref || '',
    }));
}

const T = {
  en: {
    nextActions: 'Next actions',
    genLetter: 'Generate complete letter',
    bookCall: 'Book a call',
    noAction: 'No action required',
    containsArgs: (n) => `Contains ${n} argument${n > 1 ? 's' : ''}`,
    oneLetterTo: (name) => `James drafted a single letter containing all your arguments. Send once to ${name}.`,
  },
  fr: {
    nextActions: 'Prochaines actions',
    genLetter: 'Générer la lettre complète',
    bookCall: 'Réserver un appel',
    noAction: 'Aucune action requise',
    containsArgs: (n) => `Contient ${n} argument${n > 1 ? 's' : ''}`,
    oneLetterTo: (name) => `James a rédigé une lettre unique contenant tous vos arguments. À envoyer une seule fois${name ? ` au ${name}` : ''}.`,
  },
  nl: {
    nextActions: 'Volgende acties',
    genLetter: 'Volledige brief genereren',
    bookCall: 'Bel reserveren',
    noAction: 'Geen actie vereist',
    containsArgs: (n) => `Bevat ${n} argument${n > 1 ? 'en' : ''}`,
    oneLetterTo: (name) => `James heeft één brief opgesteld met al uw argumenten. Eenmaal verzenden naar ${name}.`,
  },
  de: {
    nextActions: 'Nächste Schritte',
    genLetter: 'Vollständigen Brief erstellen',
    bookCall: 'Anruf buchen',
    noAction: 'Keine Aktion erforderlich',
    containsArgs: (n) => `Enthält ${n} Argument${n > 1 ? 'e' : ''}`,
    oneLetterTo: (name) => `James hat einen einzigen Brief mit allen Argumenten verfasst. Einmal an ${name} senden.`,
  },
  es: {
    nextActions: 'Próximas acciones',
    genLetter: 'Generar carta completa',
    bookCall: 'Reservar llamada',
    noAction: 'No se requiere acción',
    containsArgs: (n) => `Contiene ${n} argumento${n > 1 ? 's' : ''}`,
    oneLetterTo: (name) => `James redactó una carta única con todos sus argumentos. Enviar una sola vez a ${name}.`,
  },
};

function consolidateSteps(steps, findings) {
  const letters = [];
  let callAction = null;
  let passiveAction = null;

  steps.forEach(s => {
    const type = classifyAction(s);
    if (type === 'letter') {
      letters.push(s);
    } else if (type === 'call' && !callAction) {
      callAction = s;
    } else if (type === 'passive' && !passiveAction) {
      passiveAction = s;
    } else if (type === 'call' && callAction) {
      if (!passiveAction) passiveAction = s;
    }
  });

  let consolidated = null;
  if (letters.length > 0) {
    const mainTitle = typeof letters[0] === 'string' ? letters[0] : (letters[0].title || letters[0].titre || '');
    // Use CRITICAL + IMPORTANT findings as letter arguments
    const findingArgs = extractLetterArguments(findings);
    // Fallback to letter step titles if no findings available
    const arguments_ = findingArgs.length > 0
      ? findingArgs
      : letters.map(l => ({ title: typeof l === 'string' ? l : (l.title || l.titre || ''), legal_ref: '' }));

    consolidated = {
      title: mainTitle,
      arguments: arguments_,
      originalStep: letters[0],
      allSteps: letters,
    };
  }

  return { consolidated, callAction, passiveAction };
}

const NextActionsPanel = ({ steps, lang, onLetterClick, onCallClick, opposingPartyName, findings }) => {
  const t = T[lang] || T.en;
  if (!steps || steps.length === 0) return null;

  const { consolidated, callAction, passiveAction } = consolidateSteps(steps, findings);
  // Use recipient from step data (stage-aware) or fallback to opposingPartyName
  const letterRecipient = consolidated?.originalStep?.recipient || opposingPartyName || '';
  let actionNum = 0;

  return (
    <div data-testid="next-actions-panel">
      {/* Consolidated Letter — TYPE A */}
      {consolidated && (() => {
        actionNum++;
        const num = actionNum;
        return (
          <div data-testid="action-consolidated-letter" style={{
            border: '1.5px solid #1a56db', borderRadius: 10, background: '#f8faff',
            margin: '0 10px 8px', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a56db', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</div>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#0c3275', lineHeight: 1.3 }}>{consolidated.title}</div>
              <Mail size={16} color="#1a56db" />
            </div>

            {/* Description */}
            <div style={{ padding: '0 12px 8px 40px', fontSize: 10, color: '#1e40af', lineHeight: 1.5 }}>
              {t.oneLetterTo(letterRecipient)}
            </div>

            {/* Arguments list */}
            {consolidated.arguments.length > 0 && (
              <div style={{ background: '#eff6ff', borderTop: '0.5px solid #bfdbfe', padding: '6px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 500, color: '#3b82f6', textTransform: 'uppercase', marginBottom: 4 }}>
                  {t.containsArgs(consolidated.arguments.length)}
                </div>
                {consolidated.arguments.map((arg, aIdx) => (
                  <div key={`arg-${aIdx}-${arg.title.slice(0, 15)}`} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 3 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Check size={7} color="#1a56db" strokeWidth={3} />
                    </div>
                    <div style={{ fontSize: 10, color: '#1e40af', lineHeight: 1.4 }}>
                      {arg.title}
                      {arg.legal_ref && <span style={{ color: '#3b82f6', fontWeight: 500 }}> — {arg.legal_ref}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generate button */}
            <div style={{ padding: '8px 12px 10px' }}>
              <button
                data-testid="generate-consolidated-letter"
                onClick={() => onLetterClick?.(consolidated.originalStep)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#1a56db', color: '#fff', border: 'none', borderRadius: 7,
                  padding: '8px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1548b8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1a56db'; }}
              >
                <FileText size={13} />
                {t.genLetter}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Call Action — TYPE B */}
      {callAction && (() => {
        actionNum++;
        const num = actionNum;
        const sTitle = typeof callAction === 'string' ? callAction : (callAction.title || callAction.titre || '');
        const sDesc = typeof callAction === 'string' ? '' : (callAction.description || '');
        return (
          <div data-testid="action-call" style={{
            border: '0.5px solid #e2e0db', borderRadius: 10, background: '#fff',
            margin: '0 10px 8px', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</div>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#0a0a0f', lineHeight: 1.3 }}>{sTitle}</div>
              <Phone size={16} color="#7c3aed" />
            </div>
            {sDesc && <div style={{ padding: '0 12px 8px 40px', fontSize: 10, color: '#6b7280', lineHeight: 1.5 }}>{sDesc}</div>}
            <div style={{ padding: '0 12px 10px' }}>
              <button
                data-testid="action-book-call"
                onClick={() => onCallClick?.()}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#f5f3ff', color: '#7c3aed', border: '0.5px solid #c4b5fd', borderRadius: 7,
                  padding: '7px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff'; }}
              >
                <Phone size={12} />
                {t.bookCall}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Passive Action — TYPE C */}
      {passiveAction && (() => {
        actionNum++;
        const num = actionNum;
        const sTitle = typeof passiveAction === 'string' ? passiveAction : (passiveAction.title || passiveAction.titre || '');
        const sDesc = typeof passiveAction === 'string' ? '' : (passiveAction.description || '');
        return (
          <div data-testid="action-passive" style={{
            border: '0.5px solid #e2e0db', borderRadius: 10, background: '#f9fafb',
            margin: '0 10px 8px', cursor: 'default',
          }}>
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#9ca3af', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</div>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#6b7280', lineHeight: 1.3 }}>{sTitle}</div>
              <span style={{ fontSize: 9, color: '#9ca3af', padding: '2px 8px', background: '#f3f4f6', borderRadius: 10, border: '0.5px solid #e5e7eb', whiteSpace: 'nowrap' }}>{t.noAction}</span>
            </div>
            {sDesc && <div style={{ padding: '0 12px 10px 40px', fontSize: 10, color: '#6b7280', lineHeight: 1.5, opacity: 0.8 }}>{sDesc}</div>}
          </div>
        );
      })()}
    </div>
  );
};

export default NextActionsPanel;
