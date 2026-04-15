import React from 'react';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

function euros(cents) {
  if (cents == null) return '—';
  return `€${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function EarningsBreakdown({ breakdown }) {
  const { t } = useAttorneyT();
  if (!breakdown) return null;
  const { client_pays_cents, archer_fee_cents, stripe_fee_cents, your_payout_cents } = breakdown;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5">
      <div className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
        {t.case?.earnings_title || 'Earnings Breakdown'}
      </div>
      <dl className="text-sm">
        <div className="flex justify-between py-1 text-neutral-700">
          <dt>Client pays</dt><dd>{euros(client_pays_cents)}</dd>
        </div>
        <div className="flex justify-between py-1 text-neutral-500">
          <dt>− Archer fee</dt><dd>−{euros(archer_fee_cents)}</dd>
        </div>
        <div className="flex justify-between py-1 text-neutral-500">
          <dt>− Stripe fee</dt><dd>−{euros(stripe_fee_cents)}</dd>
        </div>
        <div className="flex justify-between py-2 mt-1 border-t border-neutral-200 font-medium bg-emerald-50 -mx-5 px-5 rounded-b-lg text-emerald-700">
          <dt>Your payout</dt><dd>{euros(your_payout_cents)}</dd>
        </div>
      </dl>
    </div>
  );
}
