import React from 'react';
import { useStripeConnect } from '../../hooks/attorneys/useStripeConnect';

export default function StripeConnectBand({ ibanLast4 }) {
  const { openStripeDashboard } = useStripeConnect();
  return (
    <div
      className="rounded-lg p-5 flex items-center justify-between flex-wrap gap-3"
      style={{
        background: 'linear-gradient(135deg, #635bff 0%, #7d6cff 100%)',
        color: 'white',
      }}
    >
      <div>
        <div className="font-medium">Compte Stripe Connect actif ✓</div>
        <div className="text-sm opacity-90">
          {ibanLast4 ? `IBAN se terminant par ···${ibanLast4}` : 'Compte connecté'} · Versements automatiques chaque lundi
        </div>
      </div>
      <button
        type="button"
        onClick={openStripeDashboard}
        className="bg-white text-[#635bff] font-medium px-4 py-2 rounded-md text-sm hover:opacity-90"
      >
        Gérer dans Stripe →
      </button>
    </div>
  );
}
