import React from 'react';

function Card({ label, value, accent }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="text-[11px] tracking-widest text-neutral-400 uppercase mb-1">{label}</div>
      <div className={`text-2xl font-medium ${accent || 'text-neutral-900'}`}>{value}</div>
    </div>
  );
}

function fmtSeconds(s) {
  if (s == null) return '—';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}min ${rem}s` : `${m}min`;
}

export default function AdminStatsBar({ today }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card label="Assigned today" value={today.cases_assigned ?? 0} />
      <Card
        label="Expired today"
        value={today.cases_expired ?? 0}
        accent={today.cases_expired > 0 ? 'text-amber-700' : undefined}
      />
      <Card
        label="Unmatched today"
        value={today.cases_unmatched ?? 0}
        accent={today.cases_unmatched > 0 ? 'text-red-600' : undefined}
      />
      <Card
        label="Avg acceptance"
        value={fmtSeconds(today.avg_acceptance_time_seconds)}
      />
    </div>
  );
}
