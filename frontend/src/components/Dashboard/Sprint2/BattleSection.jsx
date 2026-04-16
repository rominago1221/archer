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

  const strengthIcon = (s) => s === 'strong' ? '✓' : s === 'weak' ? '✕' : '~';
  const strengthColor = (s) => s === 'strong' ? '#16a34a' : s === 'weak' ? '#b91c1c' : '#b45309';
  const strengthLabel = (s) =>
    s === 'strong' ? (language === 'fr' ? 'Solide' : 'Strong')
    : s === 'weak' ? (language === 'fr' ? 'Faible' : 'Weak')
    : (language === 'fr' ? 'Moyen' : 'Medium');

  return (
    <div data-testid="battle-section" style={{ marginBottom: 28 }}>
      <style>{`
        @keyframes battleFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .battle-arg { animation: battleFadeIn 0.4s ease-out both; }
      `}</style>

      {/* Header */}
      <div style={{
        background: '#ffffff', border: '0.5px solid #e2e0db', borderRadius: '14px 14px 0 0',
        padding: '20px 28px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 1.2, marginBottom: 6 }}>
          {t('battle.title_label')}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.5 }}>
          {t('battle.title', { opponent: opponentLabel })}
        </div>
      </div>

      {/* Split screen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 200 }}>
        {/* Left — Your arguments */}
        <div style={{
          background: '#eff6ff', borderLeft: '3px solid #1a56db',
          borderBottom: '0.5px solid #e2e0db',
          padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a56db', letterSpacing: 0.5 }}>
              {t('battle.you_label')}
            </div>
            <div style={{
              background: '#1a56db', color: '#fff', fontSize: 18, fontWeight: 900,
              padding: '4px 14px', borderRadius: 20, lineHeight: 1.2,
            }}>
              {userScore}%
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {userArgs.map((arg, i) => (
              <div
                key={`u-${i}`}
                className="battle-arg"
                data-testid={`battle-arg-you-${arg.number}`}
                title={arg.argument}
                style={{
                  animationDelay: `${i * 0.12}s`,
                  background: '#ffffff', borderRadius: 10, padding: '12px 14px',
                  border: '0.5px solid #bfdbfe',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                    background: '#dbeafe', color: '#1a56db', flexShrink: 0,
                  }}>#{arg.number}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f', lineHeight: 1.4, marginBottom: 4 }}>
                      {arg.short_title || arg.argument}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: strengthColor(arg.strength),
                    }}>
                      {strengthIcon(arg.strength)} {strengthLabel(arg.strength)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Opponent arguments */}
        <div style={{
          background: '#fef2f2', borderRight: '3px solid #fca5a5',
          borderBottom: '0.5px solid #e2e0db',
          padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', letterSpacing: 0.5 }}>
              {opponentLabel || (language === 'fr' ? 'PARTIE ADVERSE' : 'OPPOSING PARTY')}
            </div>
            <div style={{
              background: '#b91c1c', color: '#fff', fontSize: 18, fontWeight: 900,
              padding: '4px 14px', borderRadius: 20, lineHeight: 1.2,
            }}>
              {oppScore}%
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {oppArgs.map((arg, i) => (
              <div
                key={`o-${i}`}
                className="battle-arg"
                data-testid={`battle-arg-them-${arg.number}`}
                title={arg.argument}
                style={{
                  animationDelay: `${i * 0.12}s`,
                  background: '#ffffff', borderRadius: 10, padding: '12px 14px',
                  border: '0.5px solid #fecaca',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                    background: '#fee2e2', color: '#b91c1c', flexShrink: 0,
                  }}>#{arg.number}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f', lineHeight: 1.4, marginBottom: 4 }}>
                      {arg.short_title || arg.argument}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: strengthColor(arg.strength),
                    }}>
                      {strengthIcon(arg.strength)} {strengthLabel(arg.strength)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verdict bar */}
      <div data-testid="battle-verdict" style={{
        background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
        border: '0.5px solid #c7d2fe', borderRadius: '0 0 14px 14px',
        padding: '16px 28px', textAlign: 'center',
        fontSize: 14, fontWeight: 700, color: '#0a0a0f',
      }}>
        <span style={{ fontSize: 16, marginRight: 8 }}>⚖️</span>
        {language === 'fr'
          ? `Verdict Archer : ${userScore}% de chances de gagner`
          : `Archer Verdict: ${userScore}% chance of winning`
        }
      </div>
    </div>
  );
}
