import React, { useState } from 'react';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import { useStripeConnect } from '../../hooks/attorneys/useStripeConnect';

export default function StripeOnboarding() {
  const { startOnboarding } = useStripeConnect();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      await startOnboarding();
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not start onboarding. Try again.');
      setLoading(false);
    }
  };

  return (
    <AttorneyLayout>
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl text-neutral-900 mb-2">Configurez vos paiements</h1>
        <p className="text-neutral-600 mb-8">
          Pour recevoir des cases et être payé automatiquement chaque lundi, vous devez configurer votre compte Stripe Connect.
        </p>

        <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded bg-[#635bff] text-white font-bold text-2xl flex items-center justify-center shrink-0">
              S
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-neutral-900 mb-2">Stripe Connect Express</div>
              <ul className="text-sm text-neutral-700 space-y-1.5">
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Vérification d'identité (KYC) — environ 2 minutes</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Ajout de votre IBAN — sécurisé et crypté</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Versements automatiques chaque lundi matin</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Vous gardez 70% de chaque transaction</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="w-full bg-[#635bff] text-white font-medium py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Redirection vers Stripe...' : 'Configurer avec Stripe →'}
        </button>

        <p className="text-xs text-neutral-500 mt-4 text-center">
          🔒 Powered by Stripe Connect Express. Archer ne stocke aucune information bancaire.
        </p>
      </div>
    </AttorneyLayout>
  );
}
