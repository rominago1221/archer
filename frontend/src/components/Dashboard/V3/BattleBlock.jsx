import React from 'react';
import { Shield, User, AlertTriangle, Star } from 'lucide-react';
import { deriveBattle } from '../../../utils/dashboard/battle';

function strengthClass(s) {
  if (s === 'strong') return 'fort';
  if (s === 'weak') return 'weak';
  return 'medium';
}

// Map internal strength → i18n key for the badge label.
const STRENGTH_KEY = {
  strong: 'strength_fort',
  medium: 'strength_medium',
  weak: 'strength_weak',
};

function ArgCard({ side, num, title, strength, t }) {
  const sClass = strengthClass(strength);
  const labelClass = sClass === 'fort' ? (side === 'you' ? 'solid' : 'fort') : sClass;
  return (
    <li className={`arg-card ${side}`} data-testid={`act3-arg-${side}-${num}`}>
      <div className="arg-card-num">{String(num).padStart(2, '0')}</div>
      <div className="arg-card-title">{title}</div>
      <span className={`arg-strength ${labelClass}`}>
        {t(`v3.act3.battle.${side === 'you' && sClass === 'fort' ? 'strength_solid' : STRENGTH_KEY[strength] || 'strength_medium'}`)}
      </span>
    </li>
  );
}

export default function BattleBlock({ caseDoc, t }) {
  const battle = deriveBattle(caseDoc);
  const yourCount = battle.user_arguments.length;
  const themCount = battle.opponent_arguments.length;
  const total = yourCount + themCount || 1;
  const youPct = Math.round((yourCount / total) * 100);
  const themPct = 100 - youPct;

  let verdictKey = 'verdict_balanced';
  if (youPct >= 60) verdictKey = 'verdict_advantage';
  else if (youPct <= 40) verdictKey = 'verdict_disadvantage';

  const aiSummary = caseDoc?.ai_summary || '';

  return (
    <div data-testid="act3-battle-block">
      {/* Gauge */}
      <div className="battle-gauge">
        <div className="battle-gauge-head">
          <span className="battle-gauge-title">{t('v3.act3.battle.gauge_title')}</span>
          <span className="battle-gauge-verdict-pill"><AlertTriangle size={11} aria-hidden /> {t(`v3.act3.battle.${verdictKey}`)}</span>
        </div>
        <div className="battle-gauge-bar">
          <div className="battle-gauge-you-seg"  style={{ width: `${youPct}%` }} />
          <div className="battle-gauge-them-seg" style={{ width: `${themPct}%` }} />
        </div>
        <div className="battle-gauge-row-stats">
          <div className="battle-gauge-stat you">
            <span className="battle-gauge-stat-label">{t('v3.act3.battle.col_you')}</span>
            <span className="battle-gauge-stat-val">{youPct}%</span>
          </div>
          <div className="battle-gauge-stat them">
            <span className="battle-gauge-stat-label">{t('v3.act3.battle.col_them')}</span>
            <span className="battle-gauge-stat-val">{themPct}%</span>
          </div>
        </div>
      </div>

      {/* 2 columns */}
      <div className="battle-cols">
        <div className="battle-col">
          <div className="battle-col-label you">
            <div className="battle-col-label-icon"><User size={10} aria-hidden /></div>
            <span className="battle-col-label-txt">{t('v3.act3.battle.col_you')}</span>
            <span className="battle-col-label-count">{yourCount}</span>
          </div>
          <ul className="arg-list">
            {battle.user_arguments.map((a) => (
              <ArgCard key={a.number} side="you" num={a.number} title={a.short_title || a.argument} strength={a.strength} t={t} />
            ))}
            {yourCount === 0 && (
              <li className="arg-card you" style={{ color: 'var(--ink-4)', fontStyle: 'italic', justifyContent: 'center' }}>—</li>
            )}
          </ul>
        </div>
        <div className="battle-col">
          <div className="battle-col-label them">
            <div className="battle-col-label-icon"><Shield size={10} aria-hidden /></div>
            <span className="battle-col-label-txt">{t('v3.act3.battle.col_them')}</span>
            <span className="battle-col-label-count">{themCount}</span>
          </div>
          <ul className="arg-list">
            {battle.opponent_arguments.map((a) => (
              <ArgCard key={a.number} side="them" num={a.number} title={a.short_title || a.argument} strength={a.strength} t={t} />
            ))}
            {themCount === 0 && (
              <li className="arg-card them" style={{ color: 'var(--ink-4)', fontStyle: 'italic', justifyContent: 'center' }}>—</li>
            )}
          </ul>
        </div>
      </div>

      {/* Archer verdict */}
      {aiSummary && (
        <div className="battle-verdict" data-testid="act3-battle-verdict">
          <div className="battle-verdict-icon"><Star size={18} aria-hidden fill="currentColor" /></div>
          <div className="battle-verdict-txt">
            <strong>{t('v3.act3.battle.archer_verdict_prefix')}</strong> {aiSummary}
          </div>
        </div>
      )}
    </div>
  );
}
