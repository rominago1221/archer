import React from 'react';
import UpcomingCallCard from './UpcomingCallCard';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

export default function UpcomingCallsList({ calls = [], onJoin }) {
  const { t } = useAttorneyT();
  const tx = t.live_counsel_ext || {};
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          {tx.upcoming_consultations}
        </h3>
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {tx.calendly_active}
        </span>
      </div>

      {calls.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
          <div className="text-3xl mb-2">📅</div>
          <div>{tx.no_calls_scheduled}</div>
          <div className="text-xs mt-1">{tx.no_calls_hint}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((c) => (
            <UpcomingCallCard key={c.assignment_id} call={c} onJoin={onJoin} />
          ))}
        </div>
      )}
    </div>
  );
}
