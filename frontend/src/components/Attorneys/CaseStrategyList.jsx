import React from 'react';

export default function CaseStrategyList({ strategies = [] }) {
  if (!strategies || strategies.length === 0) {
    return <div className="text-sm text-neutral-500 italic">No strategy generated yet.</div>;
  }
  return (
    <ol className="space-y-3">
      {strategies.map((s) => (
        <li key={s.rank} className="bg-white border border-neutral-200 rounded-lg p-4 flex gap-4">
          <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-900 text-white flex items-center justify-center font-medium text-sm">
            {s.rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium text-neutral-900">{s.title}</div>
              {s.score != null && (
                <span className="text-[11px] uppercase tracking-widest px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                  {s.score}%
                </span>
              )}
            </div>
            {s.description && (
              <p className="text-sm text-neutral-600 mt-1 whitespace-pre-line">{s.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
