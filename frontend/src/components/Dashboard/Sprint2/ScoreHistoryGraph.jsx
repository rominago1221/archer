import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';
import { computeScoreTrend } from '../../../utils/dashboard/scoreHistory';

function shortDate(dateStr, language) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

// Props:
//   scoreHistory: array of { date, score, event_label }
//   language: 'fr' | 'en'
export default function ScoreHistoryGraph({ scoreHistory = [], language = 'fr' }) {
  const t = useDashboardT(language);
  if (!Array.isArray(scoreHistory) || scoreHistory.length === 0) return null;

  // SVG viewBox dimensions. Fixed so the coordinate math is easy to reason about.
  const W = 600;
  const H = 140;
  const PAD_LEFT = 36;
  const PAD_RIGHT = 18;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 22;
  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  // Map a 0-100 score to a y coordinate within the plot area.
  const yFor = (score) => PAD_TOP + plotH - (Math.max(0, Math.min(100, score)) / 100) * plotH;

  // Evenly distribute points along the x axis.
  const n = scoreHistory.length;
  const xFor = (i) => {
    if (n === 1) return PAD_LEFT + plotW / 2;
    return PAD_LEFT + (i / (n - 1)) * plotW;
  };

  const points = scoreHistory.map((h, i) => ({ x: xFor(i), y: yFor(h.score), score: h.score, ...h }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${points[0].x},${points[0].y} ${points.map((p) => `L${p.x},${p.y}`).join(' ')} L${points[n - 1].x},${PAD_TOP + plotH} L${points[0].x},${PAD_TOP + plotH} Z`;

  const trend = computeScoreTrend(scoreHistory);
  const trendKey = trend > 0 ? 'score_history.trend_up' : trend < 0 ? 'score_history.trend_down' : 'score_history.trend_stable';
  const trendBg = trend > 0 ? '#dcfce7' : trend < 0 ? '#fee2e2' : '#fafaf8';
  const trendFg = trend > 0 ? '#15803d' : trend < 0 ? '#b91c1c' : '#6b7280';

  return (
    <div
      data-testid="score-history"
      style={{
        background: '#ffffff', border: '0.5px solid #e2e0db',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18,
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0f' }}>
          {t('score_history.title')}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700,
          padding: '4px 10px', borderRadius: 30,
          background: trendBg, color: trendFg,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {trend !== 0 && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              {trend > 0 ? (
                <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>
              ) : (
                <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></>
              )}
            </svg>
          )}
          {t(trendKey, { delta: Math.abs(trend) })}
        </div>
      </div>

      <div style={{ height: 140, position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Gridlines 100 / 75 / 50 / 0 */}
          {[100, 75, 50, 0].map((gridScore) => (
            <line
              key={gridScore}
              x1={PAD_LEFT} x2={W - PAD_RIGHT}
              y1={yFor(gridScore)} y2={yFor(gridScore)}
              stroke="#f4f4f1" strokeWidth="1"
            />
          ))}
          {/* Y axis labels */}
          {[100, 75, 50, 0].map((gridScore) => (
            <text
              key={gridScore}
              x={0} y={yFor(gridScore) + 4}
              fontSize="9" fill="#9ca3af"
            >{gridScore}</text>
          ))}

          {/* Area gradient */}
          <defs>
            <linearGradient id="scoreArea" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a56db" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1a56db" stopOpacity="0" />
            </linearGradient>
          </defs>
          {n > 1 && <path d={areaPath} fill="url(#scoreArea)" />}

          {/* Line */}
          {n > 1 && (
            <polyline
              points={polyline}
              fill="none" stroke="#1a56db" strokeWidth="3"
              strokeLinejoin="round" strokeLinecap="round"
            />
          )}

          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x} cy={p.y} r={6}
                fill={i === n - 1 ? '#1a56db' : '#ffffff'}
                stroke="#1a56db" strokeWidth="3"
              />
              <text
                x={p.x} y={p.y - 12}
                fontSize="11" fill="#1a56db" fontWeight="800"
                textAnchor="middle"
              >
                {p.score}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 8, fontSize: 9, color: '#9ca3af',
        padding: '0 4px',
      }}>
        {points.map((p, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#0a0a0f' }}>{shortDate(p.date, language)}</div>
            <div style={{ color: '#9ca3af' }}>{p.event_label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
