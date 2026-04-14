// Normalises battle_preview into the shape consumed by BattleSection.
// Returns { user_arguments, opponent_arguments, user_score, opponent_score, total }.
// Each argument carries a `short_title` (max ~8 words) so the Battle cards
// stay readable; the full argument is preserved under `argument` for tooltips.
const MAX_WORDS = 8;

function toShortTitle(raw) {
  if (!raw) return '';
  const text = String(raw).trim();
  if (!text) return '';
  // Prefer the first segment before a sentence-break separator.
  const match = text.split(/\s[\u2014\u2013\-\u00B7]\s|[:.!?\u2014]/)[0].trim();
  const candidate = match || text;
  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_WORDS) return candidate;
  return `${words.slice(0, MAX_WORDS).join(' ')}\u2026`;
}

function normaliseArg(raw, idx) {
  if (!raw) return null;
  const argument = raw.argument || raw.title || raw.text || '';
  if (!argument) return null;
  const strengthRaw = String(raw.strength || raw.force || 'medium').toLowerCase();
  let strength = 'medium';
  if (['strong', 'fort', 'high'].includes(strengthRaw)) strength = 'strong';
  else if (['weak', 'faible', 'low'].includes(strengthRaw)) strength = 'weak';
  return {
    number: idx + 1,
    argument,
    short_title: toShortTitle(argument),
    strength,
    legal_basis: raw.legal_basis || raw.legal_ref || raw.basis || '',
  };
}

export function deriveBattle(caseDoc) {
  const bp = caseDoc?.battle_preview || {};
  const rawUser = bp.user_side?.strongest_arguments || bp.user_side?.strong_arguments || [];
  const rawOpp = bp.opposing_side?.opposing_arguments || [];
  const user = rawUser.map(normaliseArg).filter(Boolean);
  const opp = rawOpp.map(normaliseArg).filter(Boolean);

  return {
    user_arguments: user,
    opponent_arguments: opp,
    user_score: user.length,
    opponent_score: opp.length,
    total: user.length + opp.length,
  };
}
