import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import { useStripeConnect } from '../../hooks/attorneys/useStripeConnect';

export default function StripeOnboardingComplete() {
  const { checkStatus, startOnboarding } = useStripeConnect();
  const nav = useNavigate();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus().then(setStatus).catch((e) => {
      setError(e.response?.data?.detail || 'Error loading status');
    });
  }, [checkStatus]);

  const handleResume = async () => {
    try { await startOnboarding(); } catch (e) { setError(e.response?.data?.detail || 'Error'); }
  };

  if (error) {
    return (
      <AttorneyLayout>
        <div className="max-w-lg">
          <div className="text-red-600 mb-4">{error}</div>
          <Link to="/attorneys/dashboard" className="text-sm text-neutral-700 underline">
            ← Retour au dashboard
          </Link>
        </div>
      </AttorneyLayout>
    );
  }

  if (!status) {
    return <AttorneyLayout><div className="text-neutral-500">Vérification en cours...</div></AttorneyLayout>;
  }

  if (status.status === 'complete') {
    return (
      <AttorneyLayout>
        <div className="max-w-lg">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="font-serif text-3xl text-neutral-900 mb-2">Tout est prêt !</h1>
          <p className="text-neutral-600 mb-6">
            Votre compte Stripe est validé{status.iban_last4 ? ` (IBAN ···${status.iban_last4})` : ''}.
            Vous pouvez maintenant recevoir des cases et serez payé chaque lundi.
          </p>
          <button
            type="button"
            onClick={() => nav('/attorneys/dashboard')}
            className="bg-neutral-900 text-white px-4 py-2 rounded-md text-sm hover:bg-neutral-800"
          >
            Accéder à mon dashboard →
          </button>
        </div>
      </AttorneyLayout>
    );
  }

  // Incomplete
  return (
    <AttorneyLayout>
      <div className="max-w-lg">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="font-serif text-3xl text-neutral-900 mb-2">Informations manquantes</h1>
        <p className="text-neutral-600 mb-4">
          Stripe a besoin de plus d'informations avant de pouvoir activer votre compte.
        </p>

        {(status.requirements || []).length > 0 && (
          <ul className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 mb-6 space-y-1">
            {status.requirements.map((r) => <li key={r}>• {r}</li>)}
          </ul>
        )}

        <button
          type="button"
          onClick={handleResume}
          className="bg-[#635bff] text-white px-4 py-2 rounded-md text-sm hover:opacity-90"
        >
          Reprendre l'onboarding Stripe →
        </button>
      </div>
    </AttorneyLayout>
  );
}
