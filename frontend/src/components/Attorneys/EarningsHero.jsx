import React from 'react';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

function formatCents(cents, currency = 'eur') {
  if (cents == null) return '—';
  const symbol = currency === 'usd' ? '$' : '€';
  return `${symbol}${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function Stat({ label, value, meta }) {
  return (
    <div>
      <div className="text-[11px] tracking-widest uppercase opacity-70 mb-1">{label}</div>
      <div className="text-3xl font-medium">{value}</div>
      {meta && <div className="text-xs opacity-80 mt-1">{meta}</div>}
    </div>
  );
}

export default function EarningsHero({ summary }) {
  const { t } = useAttorneyT();
  const tx = t.earnings || {};
  if (!summary) return null;
  const growth = summary.this_month.growth_vs_last_month_percent;
  const growthSign = growth >= 0 ? '+' : '';
  return (
    <div
      className="rounded-xl p-8 text-white"
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1a56db 60%, #2563eb 100%)',
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Stat
          label={tx.this_month}
          value={formatCents(summary.this_month.amount_cents)}
          meta={`${growthSign}${growth}% ${tx.growth_vs_last_month} · ${summary.this_month.case_count} ${tx.cases_suffix}`}
        />
        <Stat
          label={tx.next_payout}
          value={formatCents(summary.next_payout.amount_cents)}
          meta={`${tx.monday} ${formatDate(summary.next_payout.expected_date)} · ${summary.next_payout.case_count} ${tx.cases_suffix}`}
        />
        <Stat
          label={tx.total_all_time}
          value={formatCents(summary.total_all_time.amount_cents)}
          meta={`${summary.total_all_time.case_count} ${tx.cases_suffix}`}
        />
      </div>
    </div>
  );
}
