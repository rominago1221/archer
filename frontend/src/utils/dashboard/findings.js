// Splits the case's ai_findings into critical and strong buckets.
// Each finding is normalised to a stable shape for FindingCard.
//
// Shape: { id, title, legal_refs: [{label, archer_explanation?}], pedagogy_text }
//   - critical → type in ['risk', 'deadline']
//   - strong   → type in ['opportunity', 'neutral']
function parseLegalRefs(finding) {
  const raw = finding.legal_ref || finding.legal_refs || '';
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((r) => (typeof r === 'string' ? { label: r } : r)).filter((r) => r.label);
  }
  // Split a single comma/point/bullet-separated string into multiple refs.
  return String(raw)
    .split(/\s*·\s*|\s+\|\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ label }));
}

function normaliseFinding(f, idx) {
  const type = (f.type || '').toLowerCase();
  const isCritical = ['risk', 'deadline'].includes(type);
  const pedagogyText = isCritical
    ? (f.risk_if_ignored || f.impact_description || '')
    : (f.do_now || f.impact_description || '');
  return {
    id: `${type}-${idx}`,
    raw_type: type,
    title: f.text || f.title || '',
    legal_refs: parseLegalRefs(f),
    pedagogy_text: pedagogyText,
    is_critical: isCritical,
    is_deadline: type === 'deadline',
    // Confidence score fields (Feature 1 — Brief E)
    confidence_score: typeof f.confidence_score === 'number' ? f.confidence_score : null,
    jurisprudence_count: f.jurisprudence_count || null,
    similar_cases_won: f.similar_cases_won || null,
    similar_cases_total: f.similar_cases_total || null,
    reasoning: f.reasoning || null,
    do_now: f.do_now || '',
    impact_description: f.impact_description || '',
  };
}

export function deriveFindings(caseDoc) {
  const all = Array.isArray(caseDoc?.ai_findings) ? caseDoc.ai_findings : [];
  const normalised = all.map(normaliseFinding).filter((f) => f.title);
  return {
    critical: normalised.filter((f) => f.is_critical),
    strong: normalised.filter((f) => !f.is_critical),
  };
}
