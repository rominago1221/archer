import React from 'react';
import { Clock, DollarSign, Grid3x3, Shield } from 'lucide-react';
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

// Trend pill — replaces the former sparkline. Compares the current score
// to the oldest point in the 7-day window and renders a colour-coded
// arrow-prefixed sentence:
//   negative: "Score de risque : -X% sur 7 jours" (red)   — score went up
//   positive: "Score de risque : +X% sur 7 jours" (green) — score went down
//   stable:   "Score de risque : stable sur 7 jours" (neutral)
// Stable threshold: less than 2% relative change.
function TrendPill({ points, t, language }) {
  if (!points || points.length < 2) {
    return (
      <div className="ts-trend-pill ts-trend-pill--stable" data-testid="act1-trend-pill">
        <span>{t('v3.act1.trend_stable')}</span>
      </div>
    );
  }
  const first = Number(points[0]) || 0;
  const last = Number(points[points.length - 1]) || 0;
  const baseline = first || 50;
  const relPct = Math.round(((last - first) / baseline) * 100);
  const absPct = Math.abs(relPct);

  if (absPct < 2) {
    return (
      <div className="ts-trend-pill ts-trend-pill--stable" data-testid="act1-trend-pill">
        <span>{t('v3.act1.trend_stable')}</span>
      </div>
    );
  }

  // Score went UP = risk increased = negative outcome → red.
  // Score went DOWN = risk decreased = positive outcome → green.
  const worsened = relPct > 0;
  const variant = worsened ? 'negative' : 'positive';
  const sign = worsened ? '+' : '-';
  const label = worsened
    ? t('v3.act1.trend_up', { pct: absPct })
    : t('v3.act1.trend_down', { pct: absPct });

  return (
    <div className={`ts-trend-pill ts-trend-pill--${variant}`} data-testid="act1-trend-pill">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        {worsened ? (
          <path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5"
            stroke="currentColor" strokeWidth="1.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M7 3V11M7 11L3.5 7.5M7 11L10.5 7.5"
            stroke="currentColor" strokeWidth="1.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <span>{label}</span>
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

// Keep the verdict tagline to ~2 short sentences. The legacy ai_summary
// is often a 5-line paragraph; the mockup wants one tight insight line.
function shortTagline(raw) {
  if (!raw) return null;
  const clean = String(raw).trim().replace(/\s+/g, ' ');
  if (clean.length <= 200) return clean;
  // Keep the first 2 sentences (split on `. ` / `! ` / `? `).
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let acc = '';
  for (const s of sentences) {
    if ((acc + s).length > 240) break;
    acc += s;
    if (acc.length > 140) break; // stop after one good sentence
  }
  return acc.trim() || clean.slice(0, 200).trim();
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
            <p className="ts-verdict-p">{shortTagline(caseDoc.ai_summary)}</p>
          )}
          <TrendPill points={sparkline.points} t={t} />
        </div>
      </div>

      {/* ── KPIS ─────────────────────────────────────────────── */}
      {/* Fixed-height label row so every number lands on the same
          baseline regardless of whether a label wraps. Colors mapped
          per the brief: stake red, savings green, depth default,
          confidence blue. */}
      <div className="ts-kpis">
        <div className="ts-kpi">
          <div className="ts-kpi-label ts-kpi-label--fixed">{t('v3.act1.kpi_stake')}</div>
          <div className="ts-kpi-val red">{fmtEur(amounts.at_stake)}</div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-label ts-kpi-label--fixed">{t('v3.act1.kpi_savings')}</div>
          <div className="ts-kpi-val pos">{fmtEur(amounts.savings)}</div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-label ts-kpi-label--fixed">{t('v3.act1.kpi_depth')}</div>
          <div className="ts-kpi-val">800k<span style={{ fontSize: 16, color: 'var(--ink-3)' }}>+</span></div>
          <div className="ts-kpi-sub">{t('v3.act1.kpi_depth_sub')}</div>
        </div>
        <div className="ts-kpi">
          <div className="ts-kpi-label ts-kpi-label--fixed">{t('v3.act1.kpi_confidence')}</div>
          <div className="ts-kpi-val blue">{Math.round(depth.archer_confidence) || 75}%</div>
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
