import React from 'react';

export default function AttorneysWorkloadTable({ attorneys = [] }) {
  if (!attorneys.length) {
    return (
      <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-8 text-center text-neutral-500">
        No active attorneys.
      </div>
    );
  }
  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Attorney</th>
            <th className="text-left px-4 py-2 font-medium">Jurisdiction</th>
            <th className="text-left px-4 py-2 font-medium">Specialties</th>
            <th className="text-right px-4 py-2 font-medium">Load</th>
            <th className="text-right px-4 py-2 font-medium">Pending</th>
            <th className="text-right px-4 py-2 font-medium">Rating</th>
            <th className="text-right px-4 py-2 font-medium">This week</th>
            <th className="text-center px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {attorneys.map((a) => (
            <tr key={a.id} className="border-t border-neutral-100">
              <td className="px-4 py-2">
                <div className="font-medium text-neutral-900">{a.name}</div>
                <div className="text-xs text-neutral-500">{a.email}</div>
              </td>
              <td className="px-4 py-2 text-neutral-600">{a.jurisdiction}</td>
              <td className="px-4 py-2 text-neutral-600">
                <div className="flex gap-1 flex-wrap">
                  {(a.specialties || []).map((s) => (
                    <span key={s} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-neutral-100 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{a.active_cases}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {a.pending_cases > 0
                  ? <span className="text-amber-700">{a.pending_cases}</span>
                  : <span className="text-neutral-400">0</span>}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{a.rating != null ? a.rating.toFixed(1) : '—'}</td>
              <td className="px-4 py-2 text-right tabular-nums">{a.this_week_assigned ?? 0}</td>
              <td className="px-4 py-2 text-center">
                {a.available
                  ? <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Available" />
                  : <span className="inline-block w-2 h-2 rounded-full bg-neutral-400" title="Unavailable" />}
                {!a.stripe_ready && (
                  <span className="ml-2 text-[10px] uppercase text-amber-600">no-stripe</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
