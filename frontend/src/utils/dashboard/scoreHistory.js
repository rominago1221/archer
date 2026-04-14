// Returns [{ date, score, event_label }] ready for ScoreHistoryGraph.
// Reads case.risk_score_history when present; falls back to a single
// "today" point so the graph still renders for legacy cases.
export function deriveScoreHistory(caseDoc, language = 'fr') {
  const history = Array.isArray(caseDoc?.risk_score_history) ? caseDoc.risk_score_history : [];
  if (history.length > 0) {
    return history.map((entry, idx) => ({
      date: entry.date || entry.timestamp || null,
      score: Number(entry.score) || 0,
      event_label: entry.document_name
        ? (idx === 0
            ? (language === 'fr' ? 'Upload initial' : 'Initial upload')
            : `+ ${entry.document_name}`)
        : (language === 'fr' ? 'Mise à jour' : 'Update'),
    }));
  }

  // Fallback: 1 point, score courant, date de création
  const createdAt = caseDoc?.created_at || caseDoc?.updated_at || null;
  return [
    {
      date: createdAt,
      score: Number(caseDoc?.risk_score) || 0,
      event_label: language === 'fr' ? 'Score actuel' : 'Current score',
    },
  ];
}

// Derived trend: difference between the first and last data points.
// Positive = improvement (risk went down vs original analysis).
export function computeScoreTrend(history) {
  if (!Array.isArray(history) || history.length < 2) return 0;
  const first = Number(history[0]?.score) || 0;
  const last = Number(history[history.length - 1]?.score) || 0;
  return first - last;
}
