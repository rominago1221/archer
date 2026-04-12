import React, { useState } from 'react';

const scoreColor = (s) => s <= 30 ? '#16a34a' : s <= 60 ? '#d97706' : '#dc2626';

const ScoreHistoryChart = ({ history, title, isCompact = false }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!history || history.length === 0) return null;

  const scores = history.map(h => h.score);
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);
  const yMin = Math.max(0, Math.floor((rawMin - 10) / 10) * 10);
  const yMax = Math.min(100, Math.ceil((rawMax + 10) / 10) * 10);
  const yRange = yMax - yMin || 20;

  // Layout
  const W = 520, H = isCompact ? 170 : 200;
  const padL = 42, padR = 14, padT = 24, padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (i) => history.length === 1 ? padL + plotW / 2 : padL + (i / (history.length - 1)) * plotW;
  const toY = (score) => padT + plotH - ((score - yMin) / yRange) * plotH;

  // Grid values every 10 points
  const gridValues = [];
  for (let v = yMin; v <= yMax; v += 10) gridValues.push(v);

  // Bezier path
  let pathD = '';
  if (history.length === 1) {
    // Single point — no line
  } else {
    history.forEach((h, i) => {
      const x = toX(i);
      const y = toY(h.score);
      if (i === 0) {
        pathD = `M ${x} ${y}`;
      } else {
        const px = toX(i - 1);
        const py = toY(history[i - 1].score);
        const cp = (x - px) * 0.3;
        pathD += ` C ${px + cp} ${py}, ${x - cp} ${y}, ${x} ${y}`;
      }
    });
  }

  const lastColor = scoreColor(history[history.length - 1].score);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const mon = d.toLocaleString('en', { month: 'short' });
    const day = d.getDate();
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${mon} ${day} · ${h}:${m}`;
  };

  const fontSize = isCompact ? 9 : 10;

  return (
    <div data-testid="score-history-chart" style={{ background: '#fff', borderRadius: 12, padding: '12px 10px 8px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0f', marginBottom: 8, paddingLeft: 8 }}>{title || 'Score History'}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: isCompact ? 170 : 200, display: 'block' }}>
        {/* Y axis line */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#9ca3af" strokeWidth="1" />
        {/* X axis line */}
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#9ca3af" strokeWidth="1" />

        {/* Gridlines + Y labels */}
        {gridValues.map(v => {
          const y = toY(v);
          return (
            <g key={`grid-${v}`}>
              <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="4,3" />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize={fontSize} fill="#374151" fontWeight="400">{v}</text>
            </g>
          );
        })}

        {/* Bezier line */}
        {pathD && <path d={pathD} fill="none" stroke={lastColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Data points + labels */}
        {history.map((h, i) => {
          const x = toX(i);
          const y = toY(h.score);
          const c = scoreColor(h.score);
          const label = formatTime(h.date) || `#${i + 1}`;
          const isHovered = hoveredIdx === i;

          return (
            <g key={h.date || `pt-${i}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* X tick */}
              <line x1={x} y1={padT + plotH} x2={x} y2={padT + plotH + 4} stroke="#9ca3af" strokeWidth="1" />

              {/* Hit area */}
              <circle cx={x} cy={y} r="16" fill="transparent" />

              {/* Point */}
              <circle cx={x} cy={y} r={isHovered ? 6 : 5} fill={c} stroke="#fff" strokeWidth="2.5" />

              {/* Score label above */}
              <text x={x} y={y - 12} textAnchor="middle" fontSize="12" fontWeight="500" fill="#0a0a0f">{h.score}</text>

              {/* X label */}
              <text x={x} y={padT + plotH + 16} textAnchor="middle" fontSize={fontSize} fill="#374151">{label}</text>

              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect x={x - 70} y={y - 52} width="140" height="32" rx="6" fill="#0a0a0f" opacity="0.92" />
                  <text x={x} y={y - 38} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="500">
                    {h.score} — {label}
                  </text>
                  <text x={x} y={y - 27} textAnchor="middle" fontSize="9" fill="#9ca3af">
                    {h.document_name || ''}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ScoreHistoryChart;
