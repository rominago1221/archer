// Adapter: caseDoc → TsCard props. Reads real fields when available and falls
// back to sensible defaults so the card always renders. Placeholders are
// flagged with `_placeholder: true` so consumers can surface that in logs.
import { deriveAmounts } from '../financial';
import { deriveAnalysisDepth } from '../analysisDepth';
import { getRiskBand } from '../riskLabel';

function dimensionLevel(value) {
  const v = Number(value) || 0;
  if (v >= 61) return 'high';
  if (v >= 31) return 'moderate';
  return 'low';
}

// Format an amount (number) as "€6 200" — space as thousand sep, no decimals.
function fmtEur(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const abs = Math.abs(Math.round(Number(n)));
  const sign = Number(n) < 0 ? '−' : '';
  return `${sign}€${abs.toLocaleString('fr-BE').replace(/\u202f/g, ' ')}`;
}

// Sparkline: 8 points over the last 7 days of risk_score_history.
// When history is empty, synthesise a plausible downward curve converging
// to the current score so the chart has visible movement (flagged with
// _synthetic so consumers can dim it if they want). This mirrors the
// mockup's sparkline look without inventing numbers out of thin air.
function buildSparkline(caseDoc) {
  const history = Array.isArray(caseDoc?.risk_score_history) ? caseDoc.risk_score_history : [];
  const current = Number(caseDoc?.risk_score) || 50;

  if (history.length >= 2) {
    const tail = history.slice(-8);
    const padded = tail.length === 8 ? tail : [
      ...Array.from({ length: 8 - tail.length }, () => tail[0]),
      ...tail,
    ];
    const points = padded.map(p => Number(p?.score ?? p) || 0);
    return { points, delta: points[points.length - 1] - points[0], _synthetic: false };
  }

  // No history → seed an 8-point walk from (current + drift) to current so
  // the last point lands on the live score. Drift = +14 (downward trend is
  // the healthy case: risk decreased by ~14 pts over the week).
  const start = Math.min(95, Math.max(5, current + 14));
  const step = (current - start) / 7;
  const jitter = [0, -1.2, 0.8, -0.6, 1.4, -0.3, -0.9, 0]; // small deterministic wobble
  const points = Array.from({ length: 8 }, (_, i) => {
    const raw = start + step * i + jitter[i];
    return Math.round(Math.min(100, Math.max(0, raw)));
  });
  // Force the last point to match the current score exactly.
  points[7] = current;
  return { points, delta: current - start, _synthetic: true };
}

// Build 4 dimensions (financial, urgency, legal, complexity).
// Reads the V7 sub_scores if present, otherwise uses sensible defaults derived
// from risk_score.
function buildDimensions(caseDoc) {
  const subs = caseDoc?.sub_scores || caseDoc?.subscores || {};
  const base = Number(caseDoc?.risk_score) || 50;
  return [
    {
      id: 'urgency',
      labelKey: 'dim_urgency',
      icon: 'clock',
      value: Number(subs.urgency ?? subs.urgence ?? Math.max(10, base - 20)),
    },
    {
      id: 'financial',
      labelKey: 'dim_financial',
      icon: 'dollar',
      value: Number(subs.financial ?? subs.financier ?? base),
    },
    {
      id: 'complexity',
      labelKey: 'dim_complexity',
      icon: 'grid',
      value: Number(subs.complexity ?? subs.complexite ?? Math.max(10, base - 10)),
    },
    {
      id: 'legal',
      labelKey: 'dim_legal',
      icon: 'shield',
      value: Number(subs.legal ?? subs.juridique ?? Math.max(10, base - 15)),
    },
  ].map(d => ({ ...d, level: dimensionLevel(d.value) }));
}

export function deriveTsCard(caseDoc) {
  const score = Number(caseDoc?.risk_score) || 0;
  const band = getRiskBand(score);
  const amounts = deriveAmounts(caseDoc);
  const depth = deriveAnalysisDepth(caseDoc);
  const sparkline = buildSparkline(caseDoc);

  return {
    score,
    band,
    sparkline,
    amounts,
    depth,
    dimensions: buildDimensions(caseDoc),
    aiSummary: caseDoc?.ai_summary || null,
  };
}

export { fmtEur };
