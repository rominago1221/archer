// Derives the user's position in the 6-step journey from the case + letters state.
// 1: document analysé  /  2: choix de l'action  /  3: lettre rédigée
// 4: signature avocat  /  5: envoi recommandé  /  6: suivi de la réponse
//
// For Sprint 1 we only look at the case document. If richer signals become
// available (letter collection, stripe events, mail tracking) this helper
// is the single place to extend.
export function deriveProgressStep(caseDoc, letters = []) {
  if (!caseDoc) return 1;
  const status = caseDoc.status;
  const score = Number(caseDoc.risk_score) || 0;

  // Analysis incomplete → step 1
  if (status !== 'active' || score === 0) return 1;

  // Use letters collection if available
  const hasLetter = Array.isArray(letters) && letters.length > 0;
  if (!hasLetter) return 2; // user needs to choose an action

  const latest = letters[letters.length - 1] || {};
  if (latest.mailed_at || latest.sent_at) return 5;
  if (latest.signed_at || latest.attorney_signed_at) return 4;
  if (latest.response_received_at) return 6;
  return 3; // letter drafted, not yet signed/sent
}
