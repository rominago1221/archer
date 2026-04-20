// Derives { amount_at_stake, amount_max_risk, amount_potential_savings } for
// the "ENJEU FINANCIER" card. Prefers backend-provided structured fields,
// falls back to financial_exposure_detailed or financial_exposure string.
//
// parseAmount is defensive: it handles every separator convention the
// backend / user text might use. Previous version collapsed the comma to
// a dot unconditionally, so "6,200" (US thousand sep) parsed as 6.2 and
// we showed "€6" instead of "€6 200". Fixed.
const NUMERIC_RE = /-?\d[\d\s.,]*/;

function parseAmount(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const match = String(raw).match(NUMERIC_RE);
  if (!match) return null;
  let token = match[0].replace(/\s/g, '');
  const negative = token.startsWith('-');
  if (negative) token = token.slice(1);

  const hasDot = token.includes('.');
  const hasComma = token.includes(',');
  let normalized;

  if (hasDot && hasComma) {
    // Both present → the LATER one is decimal, the earlier one is
    // thousand separator. "6,200.50" (US) → 6200.50. "6.200,50" (EU)
    // → 6200.50.
    const lastDot = token.lastIndexOf('.');
    const lastComma = token.lastIndexOf(',');
    if (lastComma > lastDot) {
      normalized = token.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = token.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only commas. Groups of 3 digits → thousand sep. Else decimal.
    // "6,200" → 6200 (3-digit tail), "6,50" → 6.50 (2-digit tail).
    const parts = token.split(',');
    const last = parts[parts.length - 1];
    if (parts.length > 2 || last.length === 3) {
      normalized = token.replace(/,/g, '');
    } else {
      normalized = token.replace(',', '.');
    }
  } else if (hasDot) {
    // Only dots. Same 3-digit rule: "6.200" → 6200, "6.50" → 6.50.
    const parts = token.split('.');
    const last = parts[parts.length - 1];
    if (parts.length > 2 || last.length === 3) {
      normalized = token.replace(/\./g, '');
    } else {
      normalized = token;
    }
  } else {
    normalized = token;
  }

  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
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
