import React, { useEffect, useState, useRef } from 'react';
import { useCinematicT } from '../hooks/useCinematicT';

function ArgCard({ num, text, strength, isUser, delay, t }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const tm = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(tm);
  }, [delay]);
  if (!show) return null;

  const color = isUser ? '#1a56db' : '#b91c1c';
  const bgBadge = isUser ? '#eff6ff' : '#fee2e2';
  const isWeak = strength === 'weak' || strength === 'faible';
  const forceColor = strength === 'strong' || strength === 'fort' ? '#15803d' : isWeak ? '#b91c1c' : '#b45309';
  const forceLabel = strength === 'strong' || strength === 'fort'
    ? t('scene05.force_strong')
    : isWeak
      ? t('scene05.force_weak')
      : t('scene05.force_medium');

  return (
    <div style={{
      background: '#fff', border: '0.5px solid #e2e0db',
      borderLeft: `2px solid ${isWeak ? '#d1d5db' : color}`,
      borderRadius: 8, padding: '12px 14px',
      opacity: isWeak ? 0.6 : 1,
      animation: isUser ? 'slideInLeft 0.4s ease forwards' : 'slideInRight 0.4s ease forwards',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          fontFamily: '"SF Mono", Monaco, monospace', fontSize: 9, fontWeight: 800,
          color: isWeak ? '#9ca3af' : color, background: isWeak ? '#f4f4f1' : bgBadge,
          padding: '2px 6px', borderRadius: 3, flexShrink: 0, marginTop: 1,
        }}>#{num}</span>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, lineHeight: 1.35,
            color: isWeak ? '#555' : '#0a0a0f',
            fontStyle: isWeak ? 'italic' : 'normal',
          }}>{text}</div>
          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>
            Force : <strong style={{ color: forceColor }}>{forceLabel}</strong>
            {isWeak && ' — facilement réfutable'}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimScore({ target, color, delay }) {
  const [val, setVal] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const t = setTimeout(() => {
      setVal(target);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return <span style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: -1, transition: 'all 0.3s ease', fontFamily: '"SF Mono", Monaco, monospace' }}>{val}</span>;
}

export default function Scene05_Battle({ data, language }) {
  const t = useCinematicT(language);
  const battleData = data?.battle_ready;
  const userArgs = battleData?.user_side?.strongest_arguments || battleData?.user_side?.strong_arguments || [];
  const oppArgs = battleData?.opposing_side?.opposing_arguments || [];

  // Contextual opponent label based on case type (PARQUET / BAILLEUR / EMPLOYEUR / ...).
  const KNOWN_CASE_TYPES = ['traffic', 'court', 'housing', 'consumer', 'debt', 'demand', 'employment', 'immigration'];
  const caseType = (data?.facts_extracted?.facts?.type_document
    || data?.facts_extracted?.inferred_case_type
    || '').toLowerCase();
  const opponentLabel = KNOWN_CASE_TYPES.includes(caseType)
    ? t(`scene05.opponent.${caseType}`)
    : t('scene05.opponent.default');

  // Calculate scores
  const calcScore = (args) => args.reduce((s, a) => {
    const str = (a.strength || a.force || '').toLowerCase();
    return s + (str === 'strong' || str === 'fort' ? 1 : str === 'weak' || str === 'faible' ? 0 : 0.5);
  }, 0);
  const userScore = Math.round(calcScore(userArgs));
  const oppScore = Math.round(calcScore(oppArgs));

  const [showVerdict, setShowVerdict] = useState(false);
  useEffect(() => {
    const totalArgs = Math.max(userArgs.length, oppArgs.length);
    setTimeout(() => setShowVerdict(true), 500 + totalArgs * 600 + 1000);
  }, [userArgs.length, oppArgs.length]);

  // Interleave timing: user arg, then opp arg, alternating
  const maxLen = Math.max(userArgs.length, oppArgs.length);
  const totalCount = userArgs.length + oppArgs.length;

  return (
    <div data-testid="scene-05" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', padding: '32px 24px',
    }}>
      <div style={{ maxWidth: 880, width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 28, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1a56db, #1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800 }}>A</div>
            <div><div style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0f' }}>{t('scene05.battle_title_left')}</div><div style={{ fontSize: 9, color: '#9ca3af' }}>{t('scene05.your_side')}</div></div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 16, padding: '12px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 800, letterSpacing: '0.8px', marginBottom: 4 }}>
              {t('scene05.solid_arguments')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <AnimScore target={userScore} color="#1a56db" delay={userArgs.length * 500 + 500} />
              <span style={{ fontSize: 18, color: '#d1d5db' }}>vs</span>
              <AnimScore target={oppScore} color="#b91c1c" delay={oppArgs.length * 500 + 500} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0f' }}>{opponentLabel}</div><div style={{ fontSize: 9, color: '#9ca3af' }}>{t('scene05.their_side')}</div></div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800 }}>P</div>
          </div>
        </div>

        {/* 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#1a56db', letterSpacing: '1px', marginBottom: 10, paddingLeft: 14 }}>
              {t('scene05.your_arguments')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {userArgs.map((a, i) => (
                <ArgCard key={i} num={i + 1} text={a.argument} strength={a.strength || a.force} isUser delay={500 + i * 500} t={t} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#b91c1c', letterSpacing: '1px', marginBottom: 10, paddingLeft: 14 }}>
              {t('scene05.their_arguments')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {oppArgs.map((a, i) => (
                <ArgCard key={i} num={i + 1} text={a.argument} strength={a.strength || a.force} isUser={false} delay={750 + i * 500} t={t} />
              ))}
            </div>
          </div>
        </div>

        {/* Verdict */}
        {showVerdict && (
          <div style={{
            marginTop: 24, textAlign: 'center', padding: '16px 24px',
            background: '#eff6ff', border: '0.5px solid #1a56db', borderRadius: 14,
            animation: 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}>
            <div style={{ fontSize: 9, color: '#1a56db', fontWeight: 800, letterSpacing: '1px', marginBottom: 6 }}>
              {t('scene05.verdict_archer')}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.4 }}>
              {t('scene05.verdict_text_part1')} <span style={{ color: '#1a56db' }}>{userScore} {t('scene05.verdict_text_part2', { total: totalCount })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
