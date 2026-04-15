import React from 'react';
import CountdownTimer from './CountdownTimer';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

function formatCents(cents) {
  if (cents == null) return '—';
  return `€${(cents / 100).toFixed(2)}`;
}

export default function CaseRow({ row, variant = 'pending', onClick, onAccept, onDecline }) {
  const { t } = useAttorneyT();
  const isUrgent = !!row.is_urgent;
  const service = row.service_type === 'live_counsel' ? 'Live Counsel' : 'Letter';
  const borderLeft = isUrgent ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}
      className={`bg-white border border-neutral-200 rounded-lg hover:shadow-sm transition cursor-pointer ${borderLeft}`}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-neutral-500">#{row.case_number}</span>
            <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">
              {row.case_type || '—'}
            </span>
            <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
              {service}
            </span>
            {row.win_probability != null && (
              <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                Win {row.win_probability}%
              </span>
            )}
            {isUrgent && (
              <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-red-50 text-red-700 rounded">
                Urgent
              </span>
            )}
          </div>
          <div className="text-sm text-neutral-500 ml-3">{formatCents(row.earnings_preview_cents || row.earnings_cents)}</div>
        </div>

        <div className="font-medium text-neutral-900 mb-1">{row.title || 'Untitled case'}</div>
        {row.ai_summary_short && (
          <div className="text-sm text-neutral-600 line-clamp-2">{row.ai_summary_short}</div>
        )}

        <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            {row.jurisdiction && <span>{row.jurisdiction}</span>}
            {row.violations_count != null && <span>{row.violations_count} violations</span>}
          </div>
          <div className="flex items-center gap-3">
            {variant === 'pending' && row.expires_at && (
              <span className="text-neutral-500">
                {t.case?.expires_in?.replace('{{time}}', '') || 'Expires in '}
                <CountdownTimer expiresAt={row.expires_at} />
              </span>
            )}
            {variant === 'active' && row.deadline_at && (
              <span className="text-neutral-500">
                Due in <CountdownTimer expiresAt={row.deadline_at} />
              </span>
            )}
            {variant === 'completed' && row.completed_at && (
              <span>
                Completed {new Date(row.completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {variant === 'pending' && (onAccept || onDecline) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
            {onDecline && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDecline(row); }}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              >
                {t.case?.actions?.decline || 'Decline'}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="ml-auto text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Review case →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
