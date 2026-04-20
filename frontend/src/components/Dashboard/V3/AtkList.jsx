import React from 'react';
import { Swords, Shield, Check } from 'lucide-react';
import { getPlaceholderAttacks } from '../../../utils/dashboard/v3/atkPlaceholders';
import { getLegalRefUrl } from '../../../utils/dashboard/legalRefs';

function RefPill({ ref: r, country }) {
  const label = r?.label || '';
  if (!label) return null;
  const variant = r?.variant || '';
  return (
    <a
      className={`law-ref ${variant}`.trim()}
      href={getLegalRefUrl(label, country) || '#'}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
    >
      {label}
    </a>
  );
}

function AtkCard({ attack, country, t }) {
  return (
    <div className="atk-card" data-testid={`act3-atk-${attack.id}`}>
      <div className="atk-card-head">
        <div className="atk-card-num">{attack.num}</div>
        <div className="atk-card-head-body">
          <div className="atk-eyebrow">{attack.category}</div>
          <div className="atk-title">{attack.title}</div>
        </div>
        <span className={`atk-threat-badge ${attack.threatLevel}`}>
          {t(`v3.act3.anticipation.threat_${attack.threatLevel}`)}
        </span>
      </div>

      <div className="atk-duel">
        <div className="atk-duel-side attack">
          <span className="atk-duel-label attack"><Swords size={12} aria-hidden /> {t('v3.act3.anticipation.attacker_label')}</span>
          <div className="atk-quote">{attack.attackerQuote}</div>
          {attack.attackerRefs?.length > 0 && (
            <div className="atk-refs">
              {attack.attackerRefs.map((r, i) => <RefPill key={i} ref={r} country={country} />)}
            </div>
          )}
        </div>
        <div className="atk-duel-side defense">
          <span className="atk-duel-label defense"><Shield size={12} aria-hidden /> {t('v3.act3.anticipation.defense_label')}</span>
          <div
            className="atk-response"
            dangerouslySetInnerHTML={{ __html: attack.archerResponse }}
          />
          {attack.defenseRefs?.length > 0 && (
            <div className="atk-refs">
              {attack.defenseRefs.map((r, i) => <RefPill key={i} ref={r} country={country} />)}
            </div>
          )}
        </div>
      </div>

      <div className="atk-footer">
        <div className="atk-footer-left">
          <Check size={14} aria-hidden />
          <span><strong>{t('v3.act3.anticipation.footer_rejected')}</strong> · {t('v3.act3.anticipation.probability', { pct: attack.defenseForce })}</span>
        </div>
        <div className="atk-footer-force">
          <div className="atk-force-bar">
            <div className="atk-force-bar-fill" style={{ width: `${attack.defenseForce}%` }} />
          </div>
          <span className="atk-force-val">{attack.defenseForce}%</span>
        </div>
      </div>
    </div>
  );
}

export default function AtkList({ caseDoc, language = 'fr', country = 'BE', t }) {
  // TODO(back): replace with caseDoc.attacks[] from PASS 5/6 when available.
  const attacks = caseDoc?.attacks && Array.isArray(caseDoc.attacks) && caseDoc.attacks.length > 0
    ? caseDoc.attacks
    : getPlaceholderAttacks(language);

  const avgForce = attacks.length
    ? Math.round(attacks.reduce((s, a) => s + (Number(a.defenseForce) || 0), 0) / attacks.length)
    : 0;

  return (
    <div data-testid="act3-atk-list">
      <div className="atk-stats">
        <div className="atk-stat">
          <span className="atk-stat-label">{t('v3.act3.anticipation.stats_attacks')}</span>
          <span className="atk-stat-val">{attacks.length}</span>
        </div>
        <div className="atk-stat">
          <span className="atk-stat-label">{t('v3.act3.anticipation.stats_defense')}</span>
          <span className="atk-stat-val green">{avgForce}%</span>
        </div>
        <div className="atk-stat">
          <span className="atk-stat-label">{t('v3.act3.anticipation.stats_verdict')}</span>
          <span className="atk-stat-val green">{t('v3.act3.anticipation.verdict_defendable')}</span>
        </div>
      </div>

      <div className="atk-list">
        {attacks.map((a) => <AtkCard key={a.id} attack={a} country={country} t={t} />)}
      </div>
    </div>
  );
}
