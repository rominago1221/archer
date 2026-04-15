import React, { useState, useMemo } from 'react';

export default function ManualAssignModal({ open, caseId, attorneys, onClose, onAssign }) {
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);

  const eligible = useMemo(
    () => (attorneys || []).filter((a) => a.available).sort((x, y) => x.active_cases - y.active_cases),
    [attorneys],
  );

  if (!open) return null;

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try { await onAssign(caseId, selected); }
    finally { setBusy(false); }
  };

  return (
    <div
      role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-lg font-serif text-neutral-900 mb-1">Assign manually</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Pick an attorney to assign case <span className="font-mono">{caseId?.slice(-8)}</span>.
          </p>

          <label className="text-xs font-medium text-neutral-600 block mb-1">Attorney</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">— choose one —</option>
            {eligible.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.active_cases} active · rating {a.rating?.toFixed?.(1) || '—'}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button" onClick={onClose} disabled={busy}
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button" onClick={submit} disabled={busy || !selected}
              className="text-sm px-4 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {busy ? '...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
