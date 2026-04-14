// Placeholder stats per V7 case_type. Will be replaced by real aggregates
// from the backend in a later sprint; for now these plausible numbers keep
// the section visually populated.
// Shape: { reduction_pct, total_cancel_pct, avg_delay_days, total_count }
export const SIMILAR_CASES_STATS = {
  penal_routier:  { reduction_pct: 78, total_cancel_pct: 23, avg_delay_days: 14, total_count: 247 },
  logement:       { reduction_pct: 64, total_cancel_pct: 19, avg_delay_days: 21, total_count: 318 },
  travail:        { reduction_pct: 58, total_cancel_pct: 31, avg_delay_days: 42, total_count: 196 },
  consommation:   { reduction_pct: 71, total_cancel_pct: 28, avg_delay_days: 18, total_count: 402 },
  administratif:  { reduction_pct: 52, total_cancel_pct: 17, avg_delay_days: 35, total_count: 154 },
  famille:        { reduction_pct: 46, total_cancel_pct: 12, avg_delay_days: 56, total_count: 129 },
  civil:          { reduction_pct: 61, total_cancel_pct: 22, avg_delay_days: 28, total_count: 283 },
  assurance:      { reduction_pct: 68, total_cancel_pct: 24, avg_delay_days: 23, total_count: 215 },
  generic:        { reduction_pct: 62, total_cancel_pct: 21, avg_delay_days: 24, total_count: 235 },
};
