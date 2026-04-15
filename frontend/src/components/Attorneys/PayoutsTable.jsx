import React from 'react';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

function formatCents(cents, currency = 'eur') {
  const symbol = currency === 'usd' ? '$' : '€';
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function StatusBadge({ status, t }) {
  const label = t?.[`status_${status}`] || status;
  const iconMap = { paid: '✓', pending: '⏱', failed: '✗', cancelled: '—' };
  const cfg = {
    paid: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    failed: 'bg-red-50 text-red-700',
    cancelled: 'bg-neutral-100 text-neutral-600',
  }[status] || 'bg-neutral-100 text-neutral-600';
  return (
    <span className={`text-[11px] uppercase tracking-widest px-2 py-0.5 rounded ${cfg}`}>
      {iconMap[status] || ''} {label}
    </span>
  );
}

export default function PayoutsTable({ payouts = [] }) {
  const { t } = useAttorneyT();
  const tx = t.earnings || {};
  if (!payouts.length) {
    return (
      <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
        {tx.no_payouts}
      </div>
    );
  }
  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="text-left px-4 py-2 font-medium">{tx.table_date}</th>
            <th className="text-left px-4 py-2 font-medium">{tx.table_description}</th>
            <th className="text-right px-4 py-2 font-medium">{tx.table_cases}</th>
            <th className="text-right px-4 py-2 font-medium">{tx.table_amount}</th>
            <th className="text-center px-4 py-2 font-medium">{tx.table_status}</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-t border-neutral-100">
              <td className="px-4 py-3 text-neutral-600 tabular-nums">{formatDate(p.created_at)}</td>
              <td className="px-4 py-3 text-neutral-900">
                {tx.weekly_payout_label}
                {p.iban_last4 && <span className="text-neutral-500 ml-2">···{p.iban_last4}</span>}
              </td>
              <td className="px-4 py-3 text-right text-neutral-600">{p.assignment_count}</td>
              <td className="px-4 py-3 text-right font-medium text-emerald-700 tabular-nums">
                +{formatCents(p.amount_cents, p.currency)}
              </td>
              <td className="px-4 py-3 text-center"><StatusBadge status={p.status} t={tx} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
