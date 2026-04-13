import React, { useEffect, useState, useRef } from 'react';

function AnimBar({ target, color, delay, duration = 600 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(target), delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return (
    <div style={{ height: 10, background: '#f4f4f1', borderRadius: 5, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 5, transition: `width ${duration}ms ease-out` }} />
    </div>
  );
}

function BigPercent({ target, delay }) {
  const [val, setVal] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      const animate = (now) => {
        const p = Math.min((now - start) / 1000, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(eased * target));
        if (p < 1) ref.current = requestAnimationFrame(animate);
      };
      ref.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(ref.current); };
  }, [target, delay]);
  return <span style={{ color: '#1a56db', fontSize: 36, fontWeight: 900 }}>{val}%</span>;
}

export default function Scene06_Strategy({ data, language }) {
  const strat = data?.strategy_ready;
  const isFr = language?.startsWith('fr');
  const steps = strat?.next_steps || [];
  const sp = strat?.success_probability || {};

  const favorable = sp.full_resolution_in_favor || sp.resolution_favorable || 10;
  const negotiated = sp.negotiated_settlement || sp.compromis_negocie || 35;
  const partial = sp.partial_loss || sp.perte_partielle || 35;
  const unfavorable = sp.full_loss || sp.perte_totale || 20;
  const successPercent = favorable + negotiated + partial;

  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // steps
      setTimeout(() => setPhase(2), 1500),  // prediction
      setTimeout(() => setPhase(3), 3500),  // punch
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const stepColors = ['#b91c1c', '#b45309', '#15803d'];
  const stepLabels = isFr
    ? ['DANS LES 24H', 'DANS LES 7 JOURS', 'AVANT LA DEADLINE']
    : ['WITHIN 24H', 'WITHIN 7 DAYS', 'BEFORE DEADLINE'];

  const bars = [
    { label: isFr ? 'Résolution favorable (annulation totale)' : 'Favorable resolution (full annulment)', pct: favorable, color: '#16a34a', textColor: '#15803d' },
    { label: isFr ? 'Accord négocié (réduction substantielle)' : 'Negotiated agreement (substantial reduction)', pct: negotiated, color: '#1a56db', textColor: '#1a56db' },
    { label: isFr ? 'Résolution partielle (réduction modérée)' : 'Partial resolution (moderate reduction)', pct: partial, color: '#f59e0b', textColor: '#b45309' },
    { label: isFr ? 'Issue défavorable (paiement intégral)' : 'Unfavorable outcome (full payment)', pct: unfavorable, color: '#ef4444', textColor: '#b91c1c' },
  ];

  return (
    <div data-testid="scene-06" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', padding: '36px 24px',
    }}>
      <div style={{ maxWidth: 820, width: '100%' }}>
        {/* Roadmap */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: '#1a56db', letterSpacing: '1.2px', marginBottom: 16,
            opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.3s',
          }}>
            {isFr ? '— TON PLAN D\'ACTION —' : '— YOUR ACTION PLAN —'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {steps.slice(0, 3).map((step, i) => (
              <div key={i} style={{
                background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 14,
                padding: '20px 18px', position: 'relative',
                opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? 'translateY(0)' : 'translateY(12px)',
                transition: `all 0.4s ${i * 0.15}s cubic-bezier(0.16, 1, 0.3, 1)`,
              }}>
                <div style={{
                  position: 'absolute', top: -10, left: 18, width: 24, height: 24,
                  borderRadius: '50%', background: stepColors[i] || '#1a56db', color: '#fff',
                  fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: stepColors[i] || '#1a56db', letterSpacing: '0.6px', marginTop: 8, marginBottom: 6 }}>
                  {stepLabels[i] || ''}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0f', lineHeight: 1.3, marginBottom: 6 }}>
                  {step.title || ''}
                </div>
                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.45 }}>
                  {step.description || ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prediction */}
        <div style={{
          background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 18, padding: '28px 32px', marginBottom: 24,
          opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '0.5px solid #e2e0db' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#1a56db', letterSpacing: '1.2px', marginBottom: 4 }}>
                {isFr ? 'PRÉDICTION D\'ISSUE' : 'OUTCOME PREDICTION'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.5 }}>
                {isFr ? 'Si tu suis la stratégie recommandée' : 'If you follow the recommended strategy'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 800, letterSpacing: '0.5px' }}>
                {isFr ? 'CALCUL BASÉ SUR' : 'CALCULATED BASED ON'}
              </div>
              <div style={{ fontSize: 11, color: '#555' }}>
                {isFr ? '2 475 cas similaires (Belgique 2022–2026)' : '2,475 similar cases (2022-2026)'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bars.map((b, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: b.textColor }}>{b.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: b.textColor, fontFamily: '"SF Mono", Monaco, monospace' }}>{b.pct}%</span>
                </div>
                <AnimBar target={b.pct} color={b.color} delay={2000 + i * 300} />
              </div>
            ))}
          </div>
        </div>

        {/* Punch final */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dcfce7 100%)',
          border: '2px solid #1a56db', borderRadius: 18, padding: '28px 32px', textAlign: 'center',
          boxShadow: '0 16px 40px rgba(26,86,219,0.12)',
          opacity: phase >= 3 ? 1 : 0, transform: phase >= 3 ? 'scale(1)' : 'scale(0.95)',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#1a56db', letterSpacing: '1.2px', marginBottom: 10 }}>
            {isFr ? '— LA PHRASE D\'ARCHER —' : '— THE ARCHER PHRASE —'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.8, lineHeight: 1.2 }}>
            {isFr
              ? <>Avec la stratégie recommandée, tes chances<br />de réduire ou annuler sont de {phase >= 3 && <BigPercent target={successPercent} delay={500} />}.</>
              : <>With the recommended strategy, your chances<br />of reducing or canceling are {phase >= 3 && <BigPercent target={successPercent} delay={500} />}.</>}
          </div>
        </div>
      </div>
    </div>
  );
}
