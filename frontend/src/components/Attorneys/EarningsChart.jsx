import React, { useState } from 'react';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';

const PERIODS = [
  { value: '12m', label: '12M' },
  { value: '3m', label: '3M' },
  { value: 'all', label: 'All time' },
];

function euros(cents) {
  return `€${(cents / 100).toFixed(0)}`;
}

export default function EarningsChart({ initialData, initialPeriod = '12m' }) {
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState(initialData || []);
  const [hover, setHover] = useState(null);

  const loadPeriod = async (p) => {
    setPeriod(p);
    try {
      const { data: resp } = await attorneyApi.get(`/attorneys/earnings/chart?period=${p}`);
      setData(resp.chart || []);
    } catch (_) { /* ignore */ }
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-neutral-500">
        No earnings data yet.
      </div>
    );
  }

  const W = 800;
  const H = 220;
  const padX = 50;
  const padY = 20;
  const maxAmount = Math.max(1, ...data.map((d) => d.amount_cents));
  const stepX = data.length > 1 ? (W - 2 * padX) / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: H - padY - (d.amount_cents / maxAmount) * (H - 2 * padY - 20),
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`
    : '';

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-900">Évolution des revenus</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => loadPeriod(p.value)}
              className={`text-xs px-2 py-1 rounded ${
                period === p.value
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="earnings-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a56db" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1a56db" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#earnings-grad)" />
        <path d={linePath} stroke="#1a56db" strokeWidth="2.5" fill="none" />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y}
              r={p.is_current_month ? 6 : 4}
              fill={p.is_current_month ? '#16a34a' : '#fff'}
              stroke={p.is_current_month ? '#fff' : '#1a56db'}
              strokeWidth="2"
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
            <text x={p.x} y={H - 2} fontSize="10" fill="#6b7280" textAnchor="middle">
              {p.month_label}
            </text>
          </g>
        ))}

        {hover && (
          <g>
            <rect x={hover.x - 40} y={hover.y - 32} width={80} height={22}
                  fill="#111827" rx={4} />
            <text x={hover.x} y={hover.y - 17} fontSize="11" fill="#fff" textAnchor="middle">
              {euros(hover.amount_cents)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
