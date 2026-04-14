// Derives { amount_at_stake, amount_max_risk, amount_potential_savings } for
// the "ENJEU FINANCIER" card. Prefers backend-provided structured fields,
// falls back to financial_exposure_detailed or financial_exposure string.
const NUMERIC_RE = /-?\d[\d\s.,]*/;

function parseAmount(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const match = String(raw).match(NUMERIC_RE);
  if (!match) return null;
  const cleaned = match[0].replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function deriveAmounts(caseDoc) {
  if (!caseDoc) return { at_stake: null, max_risk: null, savings: null };

  // Prefer the structured `amounts` object populated by the V7-ready prompts.
  const amounts = caseDoc.amounts;
  if (amounts && typeof amounts === 'object'
      && (amounts.at_stake != null || amounts.max_risk != null || amounts.potential_savings != null)) {
    return {
      at_stake: amounts.at_stake != null ? Number(amounts.at_stake) : null,
      max_risk: amounts.max_risk != null ? Number(amounts.max_risk) : null,
      savings: amounts.potential_savings != null ? Number(amounts.potential_savings) : null,
    };
  }

  // Fallback: financial_exposure_detailed + primary_amount + financial_exposure string
  const detailed = caseDoc.financial_exposure_detailed || {};
  const atStake = parseAmount(detailed.current_amount ?? detailed.amount ?? caseDoc.primary_amount ?? caseDoc.financial_exposure);
  const maxRisk = parseAmount(detailed.max_amount ?? detailed.max_exposure ?? detailed.worst_case);

  let savings = null;
  if (atStake != null && maxRisk != null && maxRisk > atStake) {
    // Potential savings = what the user avoids vs the worst case.
    savings = -(maxRisk - atStake);
  } else if (atStake != null) {
    // Conservative default: ~30% hypothetical savings if a strategy exists.
    savings = -Math.round(atStake * 0.3);
  }

  return {
    at_stake: atStake,
    max_risk: maxRisk,
    savings,
  };
}
