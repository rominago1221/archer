import React, { useState } from 'react';
import { useCountdown } from '../../hooks/attorneys/useCountdown';

function euros(cents) {
  if (cents == null) return '—';
  return `€${(cents / 100).toFixed(0)}`;
}

function Avatar({ name }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-neutral-900 text-white text-sm font-medium flex items-center justify-center shrink-0">
      {initials || '?'}
    </div>
  );
}

export default function UpcomingCallCard({ call, onJoin }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { formatted, remaining, isExpired } = useCountdown(call.scheduled_at);
  const startingSoon = remaining > 0 && remaining <= 15 * 60;
  const clientName = `${call.client_first_name || ''} ${call.client_last_initial || ''}`.trim() || 'Client';
  const whenTime = new Date(call.scheduled_at).toLocaleTimeString(
    [], { hour: '2-digit', minute: '2-digit' },
  );
  const whenDay = new Date(call.scheduled_at).toLocaleDateString(
    [], { weekday: 'short', day: 'numeric', month: 'short' },
  );

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const { room_url, meeting_token, user_name } = await onJoin(call.assignment_id);
      const url = `${room_url}?t=${encodeURIComponent(meeting_token)}&userName=${encodeURIComponent(user_name)}`;
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not join. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${startingSoon ? 'border-red-300' : 'border-neutral-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="uppercase tracking-widest px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">
            {whenDay}
          </span>
          <span className="font-mono text-neutral-900 text-sm">{whenTime}</span>
        </div>
        <div className={`text-xs ${startingSoon ? 'text-red-600 font-medium' : 'text-neutral-500'}`}>
          {isExpired
            ? 'Window closed'
            : startingSoon
              ? `Starts in ${formatted}`
              : `In ${formatted}`}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <Avatar name={clientName} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-neutral-900 truncate">{clientName}</div>
          <div className="text-xs text-neutral-500 truncate">
            Case #{call.case_number} · {call.case_type} · 30 min · {euros(call.earnings_cents)}
          </div>
        </div>
      </div>

      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}

      <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100">
        {startingSoon && call.daily_co_ready ? (
          <button
            type="button"
            onClick={handleJoin}
            disabled={busy}
            className="text-sm px-4 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Joining...' : '🎥 Join Daily.co room'}
          </button>
        ) : (
          <span className="text-xs text-neutral-500 self-center">
            {call.daily_co_ready ? 'Join button enabled 15 min before start' : 'Daily.co room pending'}
          </span>
        )}
      </div>
    </div>
  );
}
