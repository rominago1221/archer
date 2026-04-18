/**
 * Shows the user's total credit balance with a "Recharger" button when
 * the balance runs low. Per-action costs are NEVER surfaced — the widget
 * reads `total_credits` only.
 *
 * Thresholds
 *   total < 200  → red, "Recharger" prominent
 *   total < 500  → amber
 *   otherwise    → neutral
 */
import React from 'react';
import { Link } from 'react-router-dom';
import useCreditsBalance from '../../hooks/useCreditsBalance';

function formatNumber(n, language) {
  try {
    return n.toLocaleString(language?.startsWith('fr') ? 'fr-FR' : 'en-US');
  } catch {
    return String(n);
  }
}

export default function CreditBalanceWidget({ language = 'en', compact = false }) {
  const { balance, loading } = useCreditsBalance();

  if (loading || !balance) {
    return (
      <div className="credits-widget credits-widget-skeleton" aria-busy="true">
        <span className="credits-icon" aria-hidden="true">⚡</span>
        <span className="credits-amount">—</span>
      </div>
    );
  }

  const total = balance.total_credits ?? 0;
  const tone = total < 200 ? 'low' : total < 500 ? 'medium' : 'normal';
  const label = language.startsWith('fr') ? 'crédits' : 'credits';
  const recharge = language.startsWith('fr') ? 'Recharger' : 'Top up';

  return (
    <div className={`credits-widget credits-widget-${tone}`} data-testid="credits-widget">
      <span className="credits-icon" aria-hidden="true">⚡</span>
      <div className="credits-info">
        <div className="credits-amount" data-testid="credits-amount">
          {formatNumber(total, language)}
        </div>
        {!compact && <div className="credits-label">{label}</div>}
      </div>
      {tone === 'low' && (
        <Link to="/pricing" className="credits-recharge-btn" data-testid="credits-recharge-btn">
          {recharge}
        </Link>
      )}
    </div>
  );
}
