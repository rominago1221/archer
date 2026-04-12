import React, { useState, useRef, useEffect } from 'react';

const scoreColor = (s) => s <= 30 ? '#16a34a' : s <= 60 ? '#d97706' : '#dc2626';

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

const ScoreHistoryChart = ({ history, title }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [containerW, setContainerW] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerW(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!history || history.length === 0) return null;

  const scores = history.map(h => h.score);
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);
  const yMin = Math.max(0, Math.floor((rawMin - 10) / 10) * 10);
  const yMax = Math.min(100, Math.ceil((rawMax + 10) / 10) * 10);
  const yRange = yMax - yMin || 20;

  const H = 200;
  const W = containerW || 520;
  const padL = 42, padR = 50, padT = 24, padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (i) => history.length === 1 ? padL + plotW / 2 : padL + (i / (history.length - 1)) * plotW;
  const toY = (score) => padT + plotH - ((score - yMin) / yRange) * plotH;

  const gridValues = [];
  for (let v = yMin; v <= yMax; v += 10) gridValues.push(v);

  let pathD = '';
  if (history.length > 1) {
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

  const hoveredPoint = hoveredIdx !== null ? history[hoveredIdx] : null;
  const tooltipX = hoveredIdx !== null ? toX(hoveredIdx) : 0;
  const tooltipY = hoveredIdx !== null ? toY(hoveredPoint.score) : 0;

  return (
    <div data-testid="score-history-chart" style={{ background: '#fff', borderRadius: 12, padding: '12px 10px 8px', marginBottom: 10, border: '0.5px solid #e2e0db' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0f', marginBottom: 8, paddingLeft: 8 }}>{title || 'Score History'}</div>
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 200, overflow: 'hidden' }}>
        {containerW > 0 && (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: 200, display: 'block' }}
          >
            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#9ca3af" strokeWidth="1" />
            <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#9ca3af" strokeWidth="1" />

            {gridValues.map(v => {
              const y = toY(v);
              return (
                <g key={`grid-${v}`}>
                  <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="4,3" />
                  <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize="10" fill="#374151" fontWeight="400">{v}</text>
                </g>
              );
            })}

            {pathD && <path d={pathD} fill="none" stroke={lastColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

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
                  <line x1={x} y1={padT + plotH} x2={x} y2={padT + plotH + 4} stroke="#9ca3af" strokeWidth="1" />
                  <circle cx={x} cy={y} r="16" fill="transparent" />
                  <circle cx={x} cy={y} r={isHovered ? 6 : 5} fill={c} stroke="#fff" strokeWidth="2.5" />
                  <text x={x} y={y - 12} textAnchor="middle" fontSize="12" fontWeight="500" fill="#0a0a0f">{h.score}</text>
                  <text x={x} y={padT + plotH + 16} textAnchor="middle" fontSize="10" fill="#374151">{label}</text>
                </g>
              );
            })}
          </svg>
        )}

        {hoveredPoint && containerW > 0 && (
          <div
            data-testid="score-chart-tooltip"
            style={{
              position: 'absolute',
              left: Math.min(Math.max(tooltipX, 80), containerW - 80),
              top: Math.max(tooltipY - 70, 4),
              transform: 'translateX(-50%)',
              background: '#fff',
              border: '0.5px solid #e2e0db',
              borderRadius: 8,
              padding: '8px 12px',
              pointerEvents: 'none',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0f' }}>Score: {hoveredPoint.score}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{formatTime(hoveredPoint.date)}</div>
            {hoveredPoint.document_name && (
              <div style={{ fontSize: 11, color: '#1a56db', marginTop: 2 }}>{hoveredPoint.document_name}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreHistoryChart;
