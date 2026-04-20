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

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

export function deriveStrCard(caseDoc, strategy) {
  const depth = deriveAnalysisDepth(caseDoc);
  const confidence = Math.round(depth.archer_confidence || 0);

  // ── Title / subtitle ──────────────────────────────────────────────────
  const title = strategy?.intro_text
    || caseDoc?.key_insight
    || caseDoc?.ai_summary
    || null;

  const jurisCount = depth.jurisprudences_verified || 0;

  // ── Checklist items (3 max) ───────────────────────────────────────────
  let checklist = [];
  const args = Array.isArray(strategy?.arguments) ? strategy.arguments : [];
  if (args.length > 0) {
    checklist = args.slice(0, 3).map((a) => ({
      text: a.title || a.argument || '',
      ref: pickFirstRef(a),
    }));
  } else {
    const steps = Array.isArray(caseDoc?.ai_next_steps) ? caseDoc.ai_next_steps : [];
    checklist = steps.slice(0, 3).map((s) => ({
      text: s.title || s.description || '',
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
