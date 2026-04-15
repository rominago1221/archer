import React, { useState } from 'react';
import Modal from './Modal';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

const REASONS = ['outside_specialty', 'conflict_of_interest', 'overloaded', 'other'];

export default function DeclineModal({ open, onClose, onConfirm }) {
  const { t } = useAttorneyT();
  const [reason, setReason] = useState('outside_specialty');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try { await onConfirm({ reason, notes: notes.trim() || null }); onClose?.(); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} labelledBy="decline-title">
      <div className="p-6">
        <h2 id="decline-title" className="text-lg font-serif text-neutral-900 mb-1">
          {t.decline_modal?.title || 'Decline this case?'}
        </h2>
        <p className="text-sm text-neutral-600 mb-4">
          {t.decline_modal?.subtitle || 'The case will be reassigned to another attorney within 30 minutes.'}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">
              {t.decline_modal?.reason_label || 'Reason'}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {t.decline_modal?.reasons?.[r] || r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">
              {t.decline_modal?.notes_label || 'Additional notes (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            />
            <div className="text-[11px] text-neutral-400 mt-1">{notes.length}/200</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button" onClick={onClose} disabled={busy}
            className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {t.decline_modal?.cancel || 'Cancel'}
          </button>
          <button
            type="button" onClick={confirm} disabled={busy}
            className="text-sm px-4 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? '...' : (t.decline_modal?.confirm || 'Decline case')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
