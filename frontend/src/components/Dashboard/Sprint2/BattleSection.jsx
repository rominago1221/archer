import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   battle       → output of deriveBattle()
//   opponentLabel → localised opponent name (PARQUET / BAILLEUR / ...)
//   language      → 'fr' | 'en'
export default function BattleSection({ battle, opponentLabel = '', language = 'fr' }) {
  const t = useDashboardT(language);
  const userArgs = battle?.user_arguments || [];
  const oppArgs = battle?.opponent_arguments || [];
  const userScore = battle?.user_score || 0;
  const oppScore = battle?.opponent_score || 0;
  const total = battle?.total || (userScore + oppScore);
  const hasAdvantage = userScore > oppScore;

  const opponentInitial = (opponentLabel || 'A').trim().charAt(0).toUpperCase() || 'A';

  const userCountKey = userArgs.length === 1 ? 'battle.you_count_one' : 'battle.you_count_many';
  const oppCountKey = oppArgs.length === 1 ? 'battle.opponent_count_one' : 'battle.opponent_count_many';

  return (
    <div
      data-testid="battle-section"
      style={{
        background: '#ffffff',
        border: '0.5px solid #e2e0db',
        borderRadius: 14,
        padding: '28px 32px',
        marginBottom: 28,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: '1.2px', marginBottom: 6 }}>
          {t('battle.title_label')}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.5 }}>
          {t('battle.title', { opponent: opponentLabel })}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 140px minmax(0, 1fr)',
        gap: 16,
        alignItems: 'stretch',
      }}>
        {/* LEFT — You */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 14, paddingBottom: 12,
            borderBottom: '2px solid #1a56db',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1a56db, #1e40af)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontSize: 14, fontWeight: 800,
            }}>A</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.5px', color: '#1a56db' }}>
                {t('battle.you_label')}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>
                {t(userCountKey, { count: userArgs.length })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {userArgs.map((arg, i) => (
              <ArgCard key={`u-${i}`} arg={arg} side="you" language={language} />
            ))}
          </div>
        </div>

        {/* CENTER — swords + score pill */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 14, padding: '12px 0',
        }}>
          <div style={{ width: 100, height: 100 }}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100" height="100">
              <g transform="rotate(45 50 50)">
                <path d="M50 8 L46 60 L50 64 L54 60 Z" fill="#3b82f6" stroke="#1e40af" strokeWidth="1" />
                <rect x="40" y="60" width="20" height="3" fill="#1e40af" />
                <rect x="48" y="63" width="4" height="14" fill="#92400e" />
                <circle cx="50" cy="80" r="3" fill="#fbbf24" />
              </g>
              <g transform="rotate(-45 50 50)">
                <path d="M50 8 L46 60 L50 64 L54 60 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1" />
                <rect x="40" y="60" width="20" height="3" fill="#7f1d1d" />
                <rect x="48" y="63" width="4" height="14" fill="#92400e" />
                <circle cx="50" cy="80" r="3" fill="#fbbf24" />
              </g>
              <circle cx="50" cy="50" r="4" fill="#fbbf24" opacity="0.8" />
              <circle cx="50" cy="50" r="2" fill="#ffffff" />
            </svg>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #1a56db, #1e40af)',
            padding: '10px 18px',
            borderRadius: 30,
            boxShadow: '0 8px 20px rgba(26,86,219,0.25)',
            fontFamily: '"SF Mono", Monaco, monospace',
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: -1 }}>{userScore}</span>
            <span style={{
              fontSize: 10, color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase', letterSpacing: 1.5,
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 800,
            }}>vs</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fca5a5', letterSpacing: -1 }}>{oppScore}</span>
          </div>
        </div>

        {/* RIGHT — Opponent */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 14, paddingBottom: 12,
            borderBottom: '2px solid #b91c1c',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontSize: 14, fontWeight: 800,
            }}>{opponentInitial}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.5px', color: '#b91c1c' }}>
                {opponentLabel}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>
                {t(oppCountKey, { count: oppArgs.length })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {oppArgs.map((arg, i) => (
              <ArgCard key={`o-${i}`} arg={arg} side="them" language={language} />
            ))}
          </div>
        </div>
      </div>

      {total > 0 && (
        <div
          data-testid="battle-verdict"
          style={{
            marginTop: 24,
            padding: '16px 22px',
            background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
            borderRadius: 12,
            textAlign: 'center',
            fontSize: 14, fontWeight: 700, color: '#0a0a0f',
            border: '0.5px solid #c7d2fe',
          }}
        >
          <span style={{ fontSize: 16, marginRight: 8 }}>⚖️</span>
          {hasAdvantage ? (
            <>
              {t('battle.verdict_prefix')} <strong style={{ color: '#1a56db', fontWeight: 900 }}>{userScore} {t('battle.verdict_points_unit', { total })}</strong>. {t('battle.verdict_advantage_suffix')}
            </>
          ) : (
            t('battle.verdict_balanced')
          )}
        </div>
      )}
    </div>
  );
}

function ArgCard({ arg, side, language }) {
  const t = useDashboardT(language);
  const isYou = side === 'you';
  const forceKey = arg.strength === 'strong' ? 'battle.force_strong'
    : arg.strength === 'weak' ? 'battle.force_weak' : 'battle.force_medium';
  const forceColor = arg.strength === 'strong' ? '#15803d'
    : arg.strength === 'weak' ? '#b91c1c' : '#b45309';

  const displayText = arg.short_title || arg.argument;

  return (
    <div
      data-testid={`battle-arg-${side}-${arg.number}`}
      title={arg.argument}
      style={{
        background: '#fafaf8',
        borderRadius: 10,
        padding: '12px 14px',
        borderLeft: `3px solid ${isYou ? '#1a56db' : '#b91c1c'}`,
      }}
    >
      <span style={{
        fontFamily: '"SF Mono", Monaco, monospace',
        fontSize: 9, fontWeight: 800,
        padding: '2px 6px', borderRadius: 3,
        marginRight: 8,
        color: isYou ? '#1a56db' : '#b91c1c',
        background: isYou ? '#eff6ff' : '#fee2e2',
      }}>#{arg.number}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f', lineHeight: 1.4 }}>
        {displayText}
      </span>
      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 6 }}>
        {t('battle.force_label')}:{' '}
        <strong style={{ fontWeight: 800, color: forceColor }}>{t(forceKey)}</strong>
      </div>
    </div>
  );
}
