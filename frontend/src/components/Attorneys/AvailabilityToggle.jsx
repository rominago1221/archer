import React, { useState } from 'react';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

export default function AvailabilityToggle({ available, onChange }) {
  const { t } = useAttorneyT();
  const [busy, setBusy] = useState(false);
  const flip = async () => {
    setBusy(true);
    try { await onChange(!available); } finally { setBusy(false); }
  };
  return (
    <button
      type="button"
      onClick={flip}
      disabled={busy}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition ${
        available
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
          : 'bg-neutral-100 border-neutral-300 text-neutral-600'
      } ${busy ? 'opacity-60 cursor-wait' : 'hover:opacity-90'}`}
    >
      <span className={`w-2 h-2 rounded-full ${available ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
      {available ? t.dashboard.available : t.dashboard.unavailable}
    </button>
  );
}
