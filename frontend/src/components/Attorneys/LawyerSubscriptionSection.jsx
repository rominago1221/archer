/**
 * Attorney dashboard — "My Archer subscription" block + "Welcome Live
 * Counsels offered" counter.
 *
 * Drop-in component; the dashboard page just needs to render it once.
 * Hits `/api/lawyers/me/subscription` and `/api/lawyers/me/welcome-counsels`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function fmtDate(s, language = 'fr') {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(
      language.startsWith('fr') ? 'fr-FR' : 'en-US',
      { day: 'numeric', month: 'short', year: 'numeric' },
    );
  } catch {
    return s;
  }
}

const STATUS_LABEL = {
  trial:     { fr: '🎁 Période d\'essai',     en: '🎁 Trial' },
  active:    { fr: '✅ Actif',                en: '✅ Active' },
  past_due:  { fr: '⚠️ Paiement en attente',  en: '⚠️ Payment pending' },
  cancelled: { fr: '❌ Annulé',               en: '❌ Cancelled' },
  inactive:  { fr: '⛔ Inactif',              en: '⛔ Inactive' },
};

export default function LawyerSubscriptionSection({ language = 'fr' }) {
  const [sub, setSub] = useState(null);
  const [counters, setCounters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);
  const isFr = language.startsWith('fr');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        axios.get(`${API}/lawyers/me/subscription`, { withCredentials: true }),
        axios.get(`${API}/lawyers/me/welcome-counsels`, { withCredentials: true }),
      ]);
      setSub(s.data);
      setCounters(c.data);
      setErr(null);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubscribe = async () => {
    setBusy('subscribe');
    try {
      const { data } = await axios.post(`${API}/lawyers/me/subscribe`, {}, { withCredentials: true });
      window.location.href = data.checkout_url;
    } catch {
      alert(isFr ? 'Erreur Stripe. Réessaye.' : 'Stripe error. Please retry.');
    } finally { setBusy(null); }
  };

  const handleCancel = async () => {
    if (!window.confirm(isFr ? 'Annuler l\'abonnement en fin de période ?' : 'Cancel at period end?')) return;
    setBusy('cancel');
    try {
      await axios.post(`${API}/lawyers/me/subscription/cancel`, {}, { withCredentials: true });
      await load();
    } catch {
      alert(isFr ? 'Erreur.' : 'Error.');
    } finally { setBusy(null); }
  };

  const handleReactivate = async () => {
    setBusy('reactivate');
    try {
      await axios.post(`${API}/lawyers/me/subscription/reactivate`, {}, { withCredentials: true });
      await load();
    } catch {
      alert(isFr ? 'Erreur.' : 'Error.');
    } finally { setBusy(null); }
  };

  if (loading) return <div className="lawyer-sub-section">Loading…</div>;
  if (err)     return <div className="lawyer-sub-section lawyer-sub-error">Could not load subscription.</div>;

  const status = sub?.status || 'inactive';
  const label = STATUS_LABEL[status]?.[isFr ? 'fr' : 'en'] || status;
  const needsSubscribe = status === 'inactive' || status === 'cancelled';
  const canCancel = (status === 'trial' || status === 'active') && !sub?.cancel_at_period_end;
  const canReactivate = sub?.cancel_at_period_end;

  return (
    <div className="lawyer-subscription-ui">
      <div className="lawyer-sub-section" data-testid="lawyer-subscription">
        <h2>{isFr ? 'Mon abonnement Archer' : 'My Archer subscription'}</h2>

        <div className={`lawyer-sub-status-card lawyer-sub-status-${status}`}>
          <span className="lawyer-sub-badge">{label}</span>
          {sub?.early_access && (
            <span className="lawyer-sub-tag">
              {isFr ? '🚀 Accès anticipé — 30 jours offerts' : '🚀 Early access — 30 days free'}
            </span>
          )}
        </div>

        <div className="lawyer-sub-details">
          <div><strong>{isFr ? 'Prix' : 'Price'} :</strong> €99 {isFr ? '/ mois' : '/ month'}</div>
          <div><strong>{isFr ? 'Engagement' : 'Commitment'} :</strong> {isFr ? 'Aucun (mensuel)' : 'None (monthly)'}</div>
          {status === 'trial' && sub?.trial_ends_at && (
            <div><strong>{isFr ? 'Fin d\'essai' : 'Trial ends'} :</strong> {fmtDate(sub.trial_ends_at, language)}</div>
          )}
          {sub?.current_period_end && (
            <div><strong>{isFr ? 'Prochaine facturation' : 'Next billing'} :</strong> {fmtDate(sub.current_period_end, language)}</div>
          )}
          {sub?.payment_method && (
            <div><strong>{isFr ? 'Carte' : 'Card'} :</strong> {sub.payment_method.brand} •••• {sub.payment_method.last4}</div>
          )}
          {sub?.cancel_at_period_end && (
            <div className="lawyer-sub-warn">
              {isFr
                ? 'Abonnement annulé — actif jusqu\'à la fin de la période.'
                : 'Subscription cancelled — active until period end.'}
            </div>
          )}
        </div>

        <div className="lawyer-sub-actions">
          {needsSubscribe && (
            <button className="lawyer-sub-btn primary" onClick={handleSubscribe} disabled={busy === 'subscribe'}>
              {busy === 'subscribe'
                ? (isFr ? 'Redirection…' : 'Redirecting…')
                : (sub?.early_access
                    ? (isFr ? 'Démarrer l\'essai (30 j)' : 'Start 30-day trial')
                    : (isFr ? 'Activer (€99 / mois)' : 'Activate (€99 / month)'))}
            </button>
          )}
          {canCancel && (
            <button className="lawyer-sub-btn ghost" onClick={handleCancel} disabled={busy === 'cancel'}>
              {busy === 'cancel' ? '…' : (isFr ? 'Annuler' : 'Cancel')}
            </button>
          )}
          {canReactivate && (
            <button className="lawyer-sub-btn primary" onClick={handleReactivate} disabled={busy === 'reactivate'}>
              {busy === 'reactivate' ? '…' : (isFr ? 'Réactiver' : 'Reactivate')}
            </button>
          )}
        </div>

        <div className="lawyer-sub-benefits">
          <h3>{isFr ? 'Inclus dans votre abonnement' : 'Included'}</h3>
          <ul>
            <li>✅ {isFr ? 'Cases illimités'                     : 'Unlimited cases'}</li>
            <li>✅ {isFr ? '100 % des honoraires'                : '100% of your fees'}</li>
            <li>✅ {isFr ? 'Dashboard + analytics'               : 'Dashboard + analytics'}</li>
            <li>✅ {isFr ? 'Stripe Connect — virements hebdo'    : 'Stripe Connect — weekly payouts'}</li>
            <li>✅ {isFr ? 'Calendly intégré'                    : 'Calendly built-in'}</li>
          </ul>
          <h3>{isFr ? 'Votre engagement' : 'Your commitment'}</h3>
          <ul>
            <li>🎁 {isFr
              ? 'Offrir gratuitement le 1er Live Counsel aux nouveaux Pro routés vers vous.'
              : 'Offer a free Welcome Live Counsel to new Pro users routed to you.'}
            </li>
          </ul>
        </div>
      </div>

      {counters && (
        <div className="lawyer-welcome-counters" data-testid="welcome-counsels-widget">
          <div className="welcome-counters-title">
            🎁 {isFr ? 'Welcome Live Counsels offerts' : 'Welcome Live Counsels offered'}
          </div>
          <div className="welcome-counters-grid">
            <div>
              <div className="welcome-counters-num">{counters.total_offered || 0}</div>
              <div className="welcome-counters-label">{isFr ? 'Cumulé' : 'Total'}</div>
            </div>
            <div>
              <div className="welcome-counters-num">{counters.this_month || 0}</div>
              <div className="welcome-counters-label">{isFr ? 'Ce mois' : 'This month'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
