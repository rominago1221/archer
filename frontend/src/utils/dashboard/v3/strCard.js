// Adapter: caseDoc (+ derived strategy) → StrCard props.
//
// Checklist lines come from strategy.arguments[0..2].title, or from the first
// three ai_next_steps when strategy is absent. Legal refs come from the first
// `legal_ref` / `law_reference` on each finding.
//
// Projection comes from caseDoc.success_probability when present, else a
// default 60/20/20 placeholder (flagged with _placeholder: true).
import { deriveAnalysisDepth } from '../analysisDepth';

function pickFirstRef(item) {
  return item?.legal_ref || item?.law_reference || item?.ref || null;
}

// Checklist lines need to stay single-line. Walk the text, keep the first
// sentence, hard-cap at 80 chars with an ellipsis. Titles already short
// pass through untouched.
function clampChecklistText(s) {
  if (!s) return '';
  const clean = String(s).trim().replace(/\s+/g, ' ');
  if (clean.length <= 80) return clean;
  const firstSentence = clean.slice(0, 80).search(/[.!?]\s/);
  if (firstSentence > 20) return clean.slice(0, firstSentence + 1);
  const lastSpace = clean.slice(0, 79).lastIndexOf(' ');
  return clean.slice(0, lastSpace > 30 ? lastSpace : 77) + '…';
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

export function deriveStrCard(caseDoc, strategy) {
  const depth = deriveAnalysisDepth(caseDoc);
  const confidence = Math.round(depth.archer_confidence || 0);

  // ── Title / subtitle ──────────────────────────────────────────────────
  // Prefer short strategy titles over paragraph-length summaries. We walk a
  // priority list and cap the final string at ~80 chars so the 28px headline
  // never wraps to 3+ lines like the old ai_summary fallback did.
  const TITLE_MAX = 90;
  function clampTitle(s) {
    if (!s) return null;
    const clean = String(s).trim().replace(/\s+/g, ' ');
    if (clean.length <= TITLE_MAX) return clean;
    // Cut on the first sentence-ending punctuation if possible, else hard cut + ellipsis.
    const sentenceEnd = clean.slice(0, TITLE_MAX).lastIndexOf('. ');
    if (sentenceEnd > 30) return clean.slice(0, sentenceEnd + 1);
    return clean.slice(0, TITLE_MAX - 1).trimEnd() + '…';
  }

  const firstStep = Array.isArray(caseDoc?.ai_next_steps) && caseDoc.ai_next_steps[0];
  const title = clampTitle(
    caseDoc?.strategy_title
    || caseDoc?.strategy?.title
    || (firstStep && (firstStep.title || firstStep.description))
    || strategy?.intro_text
    || caseDoc?.key_insight
    || caseDoc?.ai_summary
  );

  const jurisCount = depth.jurisprudences_verified || 0;

  // ── Checklist items (3 max) ───────────────────────────────────────────
  let checklist = [];
  const args = Array.isArray(strategy?.arguments) ? strategy.arguments : [];
  if (args.length > 0) {
    checklist = args.slice(0, 3).map((a) => ({
      text: clampChecklistText(a.title || a.argument || ''),
      ref: pickFirstRef(a),
    }));
  } else {
    const steps = Array.isArray(caseDoc?.ai_next_steps) ? caseDoc.ai_next_steps : [];
    checklist = steps.slice(0, 3).map((s) => ({
      text: clampChecklistText(s.title || s.description || ''),
      ref: pickFirstRef(s),
    }));
  }

  // ── Projection (stacked bar) ──────────────────────────────────────────
  const sp = caseDoc?.success_probability || {};
  const favorable = Number(sp.full_resolution_in_favor ?? sp.resolution_favorable ?? 0);
  const negotiated = Number(sp.negotiated_settlement ?? sp.compromis_negocie ?? 0);
  const loss = Number(sp.full_loss ?? sp.perte_totale ?? 0);
  const partial = Number(sp.partial_loss ?? sp.perte_partielle ?? 0);
  const losses = loss + partial;

  let proj;
  let projPlaceholder = false;
  if (favorable + negotiated + losses > 0) {
    const total = favorable + negotiated + losses;
    proj = {
      win: clamp(Math.round((favorable / total) * 100), 0, 100),
      deal: clamp(Math.round((negotiated / total) * 100), 0, 100),
      loss: clamp(Math.round((losses / total) * 100), 0, 100),
    };
  } else {
    // Defaults — flagged; back-end should populate success_probability.
    proj = { win: 60, deal: 20, loss: 20 };
    projPlaceholder = true;
  }

  return {
    confidence,
    title,
    jurisCount,
    checklist,
    proj,
    projPlaceholder,
  };
}
