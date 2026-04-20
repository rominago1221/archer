import React from 'react';
import { Clock, DollarSign, Grid3x3, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import { deriveTsCard, fmtEur } from '../../../utils/dashboard/v3/tsCard';

const ICON_BY_ID = {
  clock: Clock,
  dollar: DollarSign,
  grid: Grid3x3,
  shield: Shield,
};

// Score ring: 132px SVG, dashoffset animates from empty to the score.
// Color gradient matches the band (green / amber / red).
function ScoreRing({ score, band }) {
  const RADIUS = 56;
  const CIRC = 2 * Math.PI * RADIUS; // ≈ 351.86
  const pct = Math.max(0, Math.min(100, Number(score) || 0)) / 100;
  const offset = CIRC * (1 - pct);
  const gradStart = band.level === 'low' ? '#22c55e'
    : band.level === 'critical' ? '#ef4444'
    : band.level === 'high' ? '#f97316'
    : '#fbbf24';
  const gradEnd = band.level === 'low' ? '#16a34a'
    : band.level === 'critical' ? '#b91c1c'
    : band.level === 'high' ? '#ea580c'
    : '#f59e0b';
  const gradId = `tsScoreGrad-${band.level}`;
  return (
    <div className="ts-score" data-testid="act1-score-ring">
      <svg viewBox="0 0 132 132" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradStart} />
            <stop offset="100%" stopColor={gradEnd} />
          </linearGradient>
        </defs>
        <circle cx="66" cy="66" r={RADIUS} fill="none" stroke="var(--bg-soft)" strokeWidth="10" />
        <circle
          cx="66" cy="66" r={RADIUS}
          fill="none" stroke={`url(#${gradId})`} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.23, 1, 0.32, 1)' }}
        />
      </svg>
      <div className="ts-score-center">
        <div className="ts-score-num">{score}</div>
        <div className="ts-score-total">/ 100</div>
      </div>
    </div>
  );
}

// Sparkline: 60×14 polyline over 8 points. Delta pill positive = trending
// away from risk (down) so shown in green.
function Sparkline({ points, delta, t }) {
  if (!points || points.length < 2) return null;
  const W = 60;
  const H = 14;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = W / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = H - 2 - ((p - min) / span) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = coords[coords.length - 1].split(',').map(Number);
  const isDown = delta < 0;
  const color = isDown ? '#16a34a' : delta > 0 ? '#dc2626' : '#8a8a95';
  const Icon = isDown ? TrendingDown : TrendingUp;
  const deltaText = `${delta > 0 ? '+' : ''}${Math.round(delta)} pts`;
  return (
    <div className="ts-sparkline" data-testid="act1-sparkline">
      <span className="ts-sparkline-label">{t('v3.act1.trend_label')}</span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
      </svg>
      <span className="ts-sparkline-val" style={{ color }}>
        {deltaText} <Icon size={10} style={{ verticalAlign: 'middle' }} aria-hidden />
      </span>
    </div>
  );
}

function Dimension({ dim, t }) {
  const Icon = ICON_BY_ID[dim.icon] || Grid3x3;
  const fillClass = dim.level === 'low' ? 'ts-risk-low' : dim.level === 'high' ? 'ts-risk-high' : 'ts-risk-med';
  const tagClass = dim.level === 'low' ? 'ts-tag-low' : dim.level === 'high' ? 'ts-tag-high' : 'ts-tag-med';
  const tagKey = dim.level === 'low' ? 'label_low' : dim.level === 'high' ? 'label_high' : 'label_moderate';
  return (
    <div className="ts-dim-row" data-testid={`act1-dim-${dim.id}`}>
      <div className="ts-dim-icon"><Icon size={15} aria-hidden /></div>
      <div className="ts-dim-label">{t(`v3.act1.${dim.labelKey}`)}</div>
      <div className="ts-dim-bar"><div className={`ts-dim-bar-fill ${fillClass}`} style={{ width: `${Math.min(100, Math.max(0, dim.value))}%` }} /></div>
      <div className="ts-dim-val">{dim.value}</div>
      <div className={`ts-dim-tag ${tagClass}`}>{t(`v3.act1.${tagKey}`)}</div>
    </div>
  );
}

export default function TsCard({ caseDoc, t }) {
  const { score, band, sparkline, amounts, depth, dimensions } = deriveTsCard(caseDoc);

  const verdictLabelKey = band.level === 'critical' ? 'verdict_high'
    : band.level === 'high' ? 'verdict_high'
    : band.level === 'low' ? 'verdict_low'
    : 'verdict_moderate';

  const verdictTitle = t(`hero.tagline_${band.level === 'critical' ? 'critical' : band.level}`);

  // Profondeur: show as "articles+juris / 120" with the numerator highlighted.
  const depthTotal = (depth.articles_consulted || 0) + (depth.jurisprudences_verified || 0);

  return (
    <div className="ts-card" data-testid="act1-ts-card">
      {/* ── TOP: score ring + verdict ─────────────────────────── */}
      <div className="ts-top">
        <ScoreRing score={score} band={band} />
        <div className="ts-verdict">
          <div className="ts-verdict-head">
            <span className={`ts-risk-pill ts-risk-pill--${band.level}`} data-testid="act1-risk-pill">
              {t(`v3.act1.${verdictLabelKey}`)}
            </span>
          </div>
          <h3 className="ts-verdict-title">{verdictTitle}</h3>
          {caseDoc?.ai_summary && (
            <p className="ts-verdict-p">{caseDoc.ai_summary}</p>
          )}
          <Sparkline points={sparkline.points} delta={sparkline.delta} t={t} />
        </div>
      </div>

      {/* ── KPIS ─────────────────────────────────────────────── */}
      <div className="ts-kpis">
        <div className="ts-kpi">
          <div className="ts-kpi-label">{t('v3.act1.kpi_stake')}</div>
          <div className="ts-kpi-val">{fmtEur(amounts.at_stake)}</div>
          {amounts.max_risk != null && (
            <div className="ts-kpi-sub">max {fmtEur(amounts.max_risk)}</div>
          )}
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-label">{t('v3.act1.kpi_savings')}</div>
          <div className="ts-kpi-val pos">{fmtEur(amounts.savings)}</div>
          <div className="ts-kpi-sub">{t('hero.financial_savings')}</div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-label">{t('v3.act1.kpi_depth')}</div>
          <div className="ts-kpi-val">
            {depthTotal}
            <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>/120</span>
          </div>
          <div className="ts-kpi-sub">
            {depth.articles_consulted} + {depth.jurisprudences_verified}
          </div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-label">{t('v3.act1.kpi_confidence')}</div>
          <div className="ts-kpi-val blue">{Math.round(depth.archer_confidence)}%</div>
          <div className="ts-kpi-sub">7 passes · 4 agents</div>
        </div>
      </div>

      {/* ── DIMENSIONS ───────────────────────────────────────── */}
      <div className="ts-dims">
        <div className="ts-dims-h">
          <span className="ts-dims-h-l">{t('v3.act1.dims_title')}</span>
          <span className="ts-dims-h-r">{t('v3.act1.dims_legend')}</span>
        </div>
        {dimensions.map(dim => <Dimension key={dim.id} dim={dim} t={t} />)}
      </div>
    </div>
  );
}
