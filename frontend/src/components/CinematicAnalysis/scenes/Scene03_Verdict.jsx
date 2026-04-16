import React, { useEffect, useState, useRef } from 'react';
import { useCinematicT } from '../hooks/useCinematicT';

function AnimatedCounter({ target, duration = 1500, fontSize = 200, color = '#ef4444' }) {
  const [value, setValue] = useState(0);
  const ref = useRef();
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const animate = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return <span style={{ fontSize, fontWeight: 900, color, letterSpacing: -10, lineHeight: 0.85, textShadow: `0 8px 40px ${color}40` }}>{value}</span>;
}

function SubScoreCard({ label, value, desc, delay }) {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  const ref = useRef();

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!show || !value) return;
    const start = performance.now();
    const animate = (now) => {
      const p = Math.min((now - start) / 800, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * value));
      if (p < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [show, value]);

  const color = value > 70 ? '#ef4444' : value > 40 ? '#f59e0b' : '#16a34a';

  return (
    <div style={{
      background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 12,
      padding: '18px 12px', textAlign: 'center', boxShadow: '0 4px 16px rgba(10,10,15,0.04)',
      opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(12px)',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 800, letterSpacing: '0.8px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 900, color, letterSpacing: -1.5, lineHeight: 1 }}>{count}</div>
      {desc && <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 6 }}>{desc}</div>}
    </div>
  );
}

export default function Scene03_Verdict({ data, language }) {
  const t = useCinematicT(language);
  const scoreData = data?.score_ready;

  const rawScore = scoreData?.score;
  const score = (rawScore && typeof rawScore === 'object') ? rawScore : {};
  const total = Number(score.total) || 0;
  const level = scoreData?.level || score.level || (total > 85 ? 'critical' : total > 70 ? 'high' : total > 40 ? 'moderate' : 'low');
  const tagline = scoreData?.tagline || score.tagline || '';
  const financial = Number(score.financial) || 0;
  const urgency = Number(score.urgency) || 0;
  const legalStrength = Number(score.legal_strength) || 0;
  const complexity = Number(score.complexity) || 0;

  // Timings (relative to scene start)
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // halo appears
      setTimeout(() => setPhase(2), 500),   // badge
      setTimeout(() => setPhase(3), 5000),  // big score
      setTimeout(() => setPhase(4), 5500),  // underline
      setTimeout(() => setPhase(5), 6000),  // risk pill
      setTimeout(() => setPhase(6), 6500),  // tagline
      setTimeout(() => setPhase(7), 7000),  // sub-text
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const riskLabel = {
    low: t('scene03.risk_low'),
    moderate: t('scene03.risk_moderate'),
    high: t('scene03.risk_high'),
    critical: t('scene03.risk_critical'),
  }[level] || t('scene03.risk_moderate');

  const scoreColor = total > 70 ? '#ef4444' : total > 40 ? '#f59e0b' : '#16a34a';
  const pillBg = total > 70 ? '#b91c1c' : total > 40 ? '#b45309' : '#15803d';

  return (
    <div data-testid="scene-03" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #fef2f2 0%, #fef2f2 30%, #fafaf8 70%)',
      position: 'relative', overflow: 'hidden', padding: '0 24px',
    }}>
      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: `radial-gradient(circle, ${scoreColor}2E 0%, ${scoreColor}0F 30%, transparent 60%)`,
        borderRadius: '50%', pointerEvents: 'none',
        opacity: phase >= 1 ? 0.18 : 0,
        transition: 'opacity 0.6s ease',
        animation: phase >= 5 ? 'livepulse 2s ease-in-out 2' : 'none',
      }} />

      <div style={{ textAlign: 'center', maxWidth: 760, width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 18px',
          background: '#fff', border: '0.5px solid #fecaca', borderRadius: 30,
          marginBottom: 36, boxShadow: '0 4px 16px rgba(239,68,68,0.08)',
          opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? 'scale(1)' : 'scale(0.9)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#ef4444',
            animation: 'livepulse 1.8s ease-in-out infinite', display: 'inline-block',
          }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', letterSpacing: '1.4px', fontFamily: '"SF Mono", Monaco, monospace' }}>
            {t('scene03.score_badge')}
          </span>
        </div>

        {/* Sub-scores first */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          maxWidth: 640, margin: '0 auto 32px',
        }}>
          <SubScoreCard label={t('scene03.subscore_financial')} value={financial} delay={1000} />
          <SubScoreCard label={t('scene03.subscore_urgency')} value={urgency} delay={2000} />
          <SubScoreCard label={t('scene03.subscore_legal')} value={legalStrength} delay={3000} />
          <SubScoreCard label={t('scene03.subscore_complexity')} value={complexity} delay={4000} />
        </div>

        {/* BIG score number */}
        <div style={{
          position: 'relative', display: 'inline-block', marginBottom: 28,
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'scale(1)' : 'scale(0.5)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
            {phase >= 3 && <AnimatedCounter target={total} duration={1500} fontSize={200} color={scoreColor} />}
            <span style={{ fontSize: 32, fontWeight: 700, color: `${scoreColor}80`, letterSpacing: -1 }}>/100</span>
          </div>
          {/* Underline */}
          <div style={{
            height: 4, width: phase >= 4 ? '80%' : '0%', margin: '8px auto 0',
            background: `linear-gradient(90deg, transparent, ${scoreColor}, transparent)`,
            borderRadius: 2, transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Risk level pill */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px',
            background: pillBg, color: '#fff', borderRadius: 30,
            boxShadow: `0 8px 24px ${pillBg}40`,
            opacity: phase >= 5 ? 1 : 0, transform: phase >= 5 ? 'scale(1)' : 'scale(0.9)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="m10.29 3.86-8.47 14a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px' }}>{riskLabel}</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 28, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.8, marginBottom: 8,
          opacity: phase >= 6 ? 1 : 0, transform: phase >= 6 ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {tagline || riskLabel}
        </div>

        {/* Sub-text */}
        <div style={{
          fontSize: 14, color: '#555', maxWidth: 540, margin: '0 auto', lineHeight: 1.6,
          opacity: phase >= 7 ? 1 : 0, transition: 'opacity 0.5s ease',
        }}>
          {t('scene03.subtext_default')}
        </div>
      </div>
    </div>
  );
}
