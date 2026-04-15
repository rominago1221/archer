import React from 'react';

export default function UnmatchedCasesList({ cases = [], onAssign }) {
  if (!cases.length) {
    return (
      <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-8 text-center text-neutral-500">
        No unmatched cases. 🎉
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {cases.map((c) => (
        <div key={c.case_id} className="bg-white border border-amber-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-neutral-500">#{c.case_number}</span>
              <span className="text-[11px] uppercase tracking-widest px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">
                {c.case_type}
              </span>
              {c.jurisdiction && (
                <span className="text-[11px] uppercase tracking-widest px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">
                  {c.jurisdiction}
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-neutral-900">{c.title || 'Untitled case'}</div>
            <div className="text-xs text-amber-700 mt-1">Waiting since {c.waiting_since}</div>
          </div>
          <button
            type="button"
            onClick={() => onAssign(c.case_id)}
            className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
          >
            Assign manually
          </button>
        </div>
      ))}
    </div>
  );
}
