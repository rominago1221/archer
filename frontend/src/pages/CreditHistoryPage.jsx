/**
 * Displays the user's credit transaction feed with infinite pagination.
 * Labels come from the server already localised and genericised
 * ("Analyse" / "Analysis" / "Pack acheté" / ...). Never renders an
 * internal action_type or a per-action cost.
 */
import React from 'react';
import PublicHeader from '../components/PublicHeader';
import useCreditsHistory from '../hooks/useCreditsHistory';
import useCreditsBalance from '../hooks/useCreditsBalance';

function formatAmount(n) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString()}`;
}

function formatDate(iso, language) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const locale = language?.startsWith('fr') ? 'fr-FR' : 'en-US';
    return d.toLocaleString(locale, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function CreditHistoryPage() {
  const language = (localStorage.getItem('archer_locale') || 'us-en').split('-')[1] || 'en';
  const { transactions, total, loading, hasMore, loadMore } = useCreditsHistory();
  const { balance } = useCreditsBalance();
  const isFr = language === 'fr';

  return (
    <div className="credits-ui">
      <PublicHeader />
      <main style={{ maxWidth: 960, margin: '96px auto 64px', padding: '0 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>
          {isFr ? 'Historique des crédits' : 'Credit history'}
        </h1>
        {balance && (
          <p style={{ color: '#5a5a65', marginBottom: 32 }}>
            {isFr ? 'Solde actuel : ' : 'Current balance: '}
            <strong>{balance.total_credits.toLocaleString()}</strong>
          </p>
        )}

        <div className="credits-table">
          <div className="credits-table-head">
            <div>{isFr ? 'Date' : 'Date'}</div>
            <div>{isFr ? 'Libellé' : 'Label'}</div>
            <div className="credits-col-amount">{isFr ? 'Montant' : 'Amount'}</div>
          </div>
          {transactions.length === 0 && !loading && (
            <div className="credits-table-empty">
              {isFr ? 'Aucune transaction pour l\'instant.' : 'No transactions yet.'}
            </div>
          )}
          {transactions.map((tx) => (
            <div className="credits-row" key={tx.id} data-testid={`tx-${tx.id}`}>
              <div className="credits-row-date">{formatDate(tx.created_at, language)}</div>
              <div className="credits-row-label">{tx.label}</div>
              <div
                className={`credits-row-amount ${tx.amount < 0 ? 'neg' : 'pos'}`}
              >
                {formatAmount(tx.amount)}
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            type="button"
            className="credits-load-more"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (isFr ? 'Chargement…' : 'Loading…') : (isFr ? 'Voir plus' : 'Load more')}
          </button>
        )}
        {total > 0 && (
          <p style={{ color: '#8a8a95', textAlign: 'center', marginTop: 24, fontSize: 13 }}>
            {isFr
              ? `${transactions.length} sur ${total} transactions`
              : `${transactions.length} of ${total} transactions`}
          </p>
        )}
      </main>
    </div>
  );
}
