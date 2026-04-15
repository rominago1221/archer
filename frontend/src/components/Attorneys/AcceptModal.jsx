import React, { useState } from 'react';
import Modal from './Modal';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

export default function AcceptModal({ open, onClose, onConfirm }) {
  const { t } = useAttorneyT();
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(); onClose?.(); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={busy ? undefined : onClose} labelledBy="accept-title">
      <div className="p-6">
        <h2 id="accept-title" className="text-lg font-serif text-neutral-900 mb-1">
          {t.accept_modal?.title || 'Accept this case?'}
        </h2>
        <p className="text-sm text-neutral-600 mb-3">
          {t.accept_modal?.subtitle || 'You commit to deliver the signed letter within 4 hours.'}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
          {t.accept_modal?.warning ||
            "Once accepted, you'll see the client's identity and all documents. Attorney-client privilege applies."}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button" onClick={onClose} disabled={busy}
            className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {t.accept_modal?.cancel || 'Cancel'}
          </button>
          <button
            type="button" onClick={confirm} disabled={busy}
            className="text-sm px-4 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? '...' : (t.accept_modal?.confirm || 'Accept case')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
