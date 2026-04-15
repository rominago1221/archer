import React from 'react';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

function Card({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="text-[11px] tracking-widest text-neutral-400 uppercase mb-1">{label}</div>
      <div className={`text-2xl font-medium ${accent || 'text-neutral-900'}`}>{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

function euros(cents) {
  if (cents == null) return '—';
  return `€${(cents / 100).toFixed(0)}`;
}

export default function LiveCounselStats({ stats, nextCallAt }) {
  const { t } = useAttorneyT();
  const tx = t.live_counsel_ext || {};
  if (!stats) return null;
  const nextLabel = nextCallAt
    ? new Date(nextCallAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card label={tx.today} value={stats.today_count ?? 0} sub={nextLabel} />
      <Card
        label={tx.this_week}
        value={stats.this_week_count ?? 0}
        sub={`${euros(stats.this_week_earnings_cents)}`}
      />
      <Card
        label={tx.completion}
        value={`${stats.completion_rate_percent ?? 0}%`}
        sub={tx.calls_completed}
      />
      <Card
        label={tx.avg_rating}
        value={stats.avg_rating != null ? stats.avg_rating.toFixed(1) : '—'}
        sub="★★★★★"
      />
    </div>
  );
}
