// Returns { articles_consulted, jurisprudences_verified, archer_confidence }
// for the "PROFONDEUR DE L'ANALYSE" card.
//
// Prefers the backend-provided analysis_depth object (new cases), and
// derives sensible fallbacks from existing fields for legacy cases.
export function deriveAnalysisDepth(caseDoc) {
  if (!caseDoc) return { articles_consulted: 0, jurisprudences_verified: 0, archer_confidence: 0 };
  const backend = caseDoc.analysis_depth || {};

  const articles = backend.articles_consulted
    ?? (Array.isArray(caseDoc.applicable_laws) ? caseDoc.applicable_laws.length : 0);

  const juris = backend.jurisprudences_verified
    ?? (Array.isArray(caseDoc.recent_case_law) ? caseDoc.recent_case_law.length : 0);

  // Archer confidence: use backend value if present, else derive from
  // legal_strength + data richness (more laws/jurisprudences → higher confidence).
  let confidence = backend.archer_confidence;
  if (confidence === undefined || confidence === null) {
    const strength = Number(caseDoc.risk_legal_strength) || 50;
    const dataBonus = Math.min(20, (Number(articles) + Number(juris)) * 2);
    confidence = Math.min(99, Math.max(50, 100 - strength + dataBonus));
  }

  return {
    articles_consulted: Number(articles) || 0,
    jurisprudences_verified: Number(juris) || 0,
    archer_confidence: Number(confidence) || 0,
  };
}
