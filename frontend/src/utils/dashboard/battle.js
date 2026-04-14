// Normalises battle_preview into the shape consumed by BattleSection.
// Returns { user_arguments, opponent_arguments, user_score, opponent_score, total }.
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
