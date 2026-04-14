import { SIMILAR_CASES_STATS } from './similarCasesStats';

// Returns stats for the SimilarCasesSection based on V7 case_type.
// Shape: { reduction_pct, total_cancel_pct, avg_delay_days, total_count }
export function deriveSimilarCases(caseTypeV7 = 'generic') {
  return SIMILAR_CASES_STATS[caseTypeV7] || SIMILAR_CASES_STATS.generic;
}
