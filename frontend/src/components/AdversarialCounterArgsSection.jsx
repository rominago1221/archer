import React from 'react';

function copyFor(language) {
  const isFr = String(language || '').toLowerCase().startsWith('fr');
  const isNl = String(language || '').toLowerCase().startsWith('nl');
  if (isFr) {
    return {
      label: 'ANTICIPATION ADVERSE',
      title: 'Les 5 attaques les plus probables de la partie adverse',
      subtitle: (persona) => persona
        ? `Simulation des contre-arguments que ${persona} utiliserait en cour — et votre réponse préparée pour chacun.`
        : 'Simulation des contre-arguments les plus probables — et votre réponse préparée pour chacun.',
      threatLabel: 'Niveau de menace global',
      threatLow: 'Faible',
      threatMedium: 'Moyen',
      threatHigh: 'Élevé',
      threatUnknown: 'Non évalué',
      strengthLabel: 'Force',
      counterLabel: 'Contre-argument adverse',
      legalBasisLabel: 'Base légale invoquée',
      vulnerabilityLabel: 'Point faible du dossier',
      responseLabel: 'Votre réponse préparée',
    };
  }
  if (isNl) {
    return {
      label: 'ANTICIPATIE TEGENPARTIJ',
      title: 'De 5 meest waarschijnlijke aanvallen van de tegenpartij',
      subtitle: (persona) => persona
        ? `Simulatie van de tegenargumenten die ${persona} in de rechtbank zou gebruiken — en uw voorbereide antwoord op elk.`
        : 'Simulatie van de meest waarschijnlijke tegenargumenten — en uw voorbereide antwoord op elk.',
      threatLabel: 'Algemeen bedreigingsniveau',
      threatLow: 'Laag',
      threatMedium: 'Gemiddeld',
      threatHigh: 'Hoog',
      threatUnknown: 'Niet beoordeeld',
      strengthLabel: 'Sterkte',
      counterLabel: 'Tegenargument',
      legalBasisLabel: 'Juridische basis',
      vulnerabilityLabel: 'Kwetsbaarheid van het dossier',
      responseLabel: 'Uw voorbereide antwoord',
    };
  }
  return {
    label: 'ADVERSARIAL PREVIEW',
    title: 'The 5 most likely attacks from the opposing side',
    subtitle: (persona) => persona
      ? `Simulation of the counter-arguments ${persona} would use in court — and your prepared response to each.`
      : 'Simulation of the most likely counter-arguments — and your prepared response to each.',
    threatLabel: 'Overall threat level',
    threatLow: 'Low',
    threatMedium: 'Medium',
    threatHigh: 'High',
    threatUnknown: 'Not assessed',
    strengthLabel: 'Strength',
    counterLabel: 'Opposing argument',
    legalBasisLabel: 'Legal basis invoked',
    vulnerabilityLabel: 'Case vulnerability',
    responseLabel: 'Your prepared response',
  };
}

function threatStyles(level) {
  switch ((level || '').toLowerCase()) {
    case 'low':    return { bg: '#dcfce7', color: '#15803d', border: '#86efac' };
    case 'medium': return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
    case 'high':   return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
    default:       return { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' };
  }
}

function strengthBarColor(s) {
  const n = Number(s) || 0;
  if (n >= 8) return '#b91c1c';
  if (n >= 5) return '#d97706';
  return '#059669';
}

function ShieldIcon({ color = '#1a56db', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default function AdversarialCounterArgsSection({ adversarial, language = 'en' }) {
  if (!adversarial || !Array.isArray(adversarial.counter_arguments) || adversarial.counter_arguments.length === 0) {
    return null;
  }
  const c = copyFor(language);
  const persona = adversarial.opposing_persona || '';
  const level = (adversarial.overall_threat_level || 'unknown').toLowerCase();
  const threat = threatStyles(level);
  const threatWord = level === 'low' ? c.threatLow
    : level === 'medium' ? c.threatMedium
    : level === 'high' ? c.threatHigh
    : c.threatUnknown;

  return (
    <div data-testid="adversarial-section" style={{ marginBottom: 28 }}>
      {/* Header band */}
      <div style={{
        background: '#0a0a0f', color: '#ffffff',
        borderRadius: '14px 14px 0 0', padding: '18px 24px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <ShieldIcon color="#ffffff" size={24} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, color: '#9ca3af', marginBottom: 4 }}>
            {c.label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>
            {c.title}
          </div>
        </div>
        <div style={{
          background: threat.bg, color: threat.color,
          border: `1px solid ${threat.border}`,
          padding: '6px 12px', borderRadius: 999,
          fontSize: 11, fontWeight: 800, letterSpacing: 0.3, whiteSpace: 'nowrap',
        }}>
          {c.threatLabel}: {threatWord.toUpperCase()}
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        background: '#ffffff', border: '1px solid #e2e0db', borderTop: 'none',
        padding: '14px 24px', fontSize: 12, color: '#6b7280', lineHeight: 1.55,
      }}>
        {c.subtitle(persona)}
        {adversarial.summary && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#374151', fontStyle: 'italic' }}>
            &ldquo;{adversarial.summary}&rdquo;
          </div>
        )}
      </div>

      {/* Counter-argument cards */}
      <div style={{
        background: '#faf8f4', borderRadius: '0 0 14px 14px',
        border: '1px solid #e2e0db', borderTop: 'none',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {adversarial.counter_arguments.slice(0, 5).map((ca, idx) => {
          const strength = Math.max(1, Math.min(Number(ca.strength) || 5, 10));
          return (
            <div
              key={idx}
              data-testid={`adversarial-card-${idx}`}
              style={{
                background: '#ffffff', border: '1px solid #e2e0db', borderRadius: 12,
                padding: 18, display: 'grid', gridTemplateColumns: '44px 1fr', gap: 16,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: '#fef3c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #f59e0b', flexShrink: 0,
              }}>
                <ShieldIcon color="#b45309" size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                {/* Top row: opposing argument + strength gauge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#b91c1c', letterSpacing: 0.8, marginBottom: 4 }}>
                      {c.counterLabel.toUpperCase()} #{idx + 1}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0f', lineHeight: 1.4 }}>
                      {ca.argument || '—'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginBottom: 3 }}>
                      {c.strengthLabel.toUpperCase()}
                    </div>
                    <div style={{
                      fontSize: 14, fontWeight: 900,
                      color: strengthBarColor(strength),
                    }}>
                      {strength}/10
                    </div>
                  </div>
                </div>

                {/* Legal basis */}
                {ca.legal_basis && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginBottom: 2 }}>
                      {c.legalBasisLabel.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', fontFamily: '"Courier New", monospace' }}>
                      {ca.legal_basis}
                    </div>
                  </div>
                )}

                {/* Client vulnerability */}
                {ca.client_vulnerability && (
                  <div style={{ marginBottom: 10, padding: '10px 12px', background: '#fef2f2', borderLeft: '3px solid #fca5a5', borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#b91c1c', letterSpacing: 0.5, marginBottom: 3 }}>
                      {c.vulnerabilityLabel.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>
                      {ca.client_vulnerability}
                    </div>
                  </div>
                )}

                {/* User response */}
                {ca.user_response && (
                  <div style={{ padding: '10px 12px', background: '#eff6ff', borderLeft: '3px solid #1a56db', borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#1a56db', letterSpacing: 0.5, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldIcon color="#1a56db" size={11} />
                      {c.responseLabel.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.5 }}>
                      {ca.user_response}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
