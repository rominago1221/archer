# Static fallback stats for similar cases comparison.
# Used when fewer than 5 real cases with known outcomes exist for a case_type + jurisdiction.
# Will be replaced by live aggregates from the similar_cases_stats collection
# once enough data accumulates.

SIMILAR_CASES_FALLBACK = {
    "traffic": {"total_count": 247, "won_count": 193, "win_rate_percent": 78.1, "reduction_pct": 78, "avg_delay_days": 14},
    "housing": {"total_count": 318, "won_count": 203, "win_rate_percent": 63.8, "reduction_pct": 64, "avg_delay_days": 21},
    "employment": {"total_count": 196, "won_count": 114, "win_rate_percent": 58.2, "reduction_pct": 58, "avg_delay_days": 42},
    "consumer": {"total_count": 402, "won_count": 285, "win_rate_percent": 70.9, "reduction_pct": 71, "avg_delay_days": 18},
    "debt": {"total_count": 402, "won_count": 285, "win_rate_percent": 70.9, "reduction_pct": 71, "avg_delay_days": 18},
    "immigration": {"total_count": 154, "won_count": 80, "win_rate_percent": 51.9, "reduction_pct": 52, "avg_delay_days": 35},
    "administrative": {"total_count": 154, "won_count": 80, "win_rate_percent": 51.9, "reduction_pct": 52, "avg_delay_days": 35},
    "family": {"total_count": 129, "won_count": 59, "win_rate_percent": 45.7, "reduction_pct": 46, "avg_delay_days": 56},
    "civil": {"total_count": 283, "won_count": 173, "win_rate_percent": 61.1, "reduction_pct": 61, "avg_delay_days": 28},
    "contract": {"total_count": 283, "won_count": 173, "win_rate_percent": 61.1, "reduction_pct": 61, "avg_delay_days": 28},
    "insurance": {"total_count": 215, "won_count": 146, "win_rate_percent": 67.9, "reduction_pct": 68, "avg_delay_days": 23},
    "other": {"total_count": 235, "won_count": 146, "win_rate_percent": 62.1, "reduction_pct": 62, "avg_delay_days": 24},
}
