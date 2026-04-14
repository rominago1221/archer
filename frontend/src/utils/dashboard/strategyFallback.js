// When the backend case does not yet include the V7 structured strategy
// (legacy case analyzed before the prompt update), derive a reasonable
// approximation from the existing fields: key_insight + battle_preview + success_probability.
//
// Returns { intro_text, arguments: [{number, title, angle, impact}], objectives: {primary, fallback, avoided} }
export function deriveStrategy(caseDoc, t) {
  if (!caseDoc) return null;
  // New prompts populate `strategy_narrative` with the V7-ready structure.
  // (Legacy `strategy` holds the old recommended_strategy dict; we fall back below.)
  const narrative = caseDoc.strategy_narrative;
  if (narrative && typeof narrative === 'object' && Array.isArray(narrative.arguments) && narrative.intro_text) {
    return narrative;
  }

  // ── intro ────────────────────────────────────────────────────────────────
  const intro = (caseDoc.key_insight || '').trim() || (backend && typeof backend === 'string' ? backend : '');

  // ── arguments (from user_side of battle_preview) ─────────────────────────
  const userArgs = caseDoc.battle_preview?.user_side?.strongest_arguments
    || caseDoc.battle_preview?.user_side?.strong_arguments
    || [];
  const args = userArgs.slice(0, 5).map((a, i) => ({
    number: i + 1,
    title: a.argument || a.title || '',
    angle: a.angle || a.legal_basis || a.reasoning || '',
    impact: a.impact || a.expected_outcome || a.strength_explanation || '',
  }));

  // ── objectives (derived from success_probability + risk band) ─────────────
  const sp = caseDoc.success_probability || {};
  const favorable = Number(sp.full_resolution_in_favor ?? sp.resolution_favorable ?? 0);
  const negotiated = Number(sp.negotiated_settlement ?? sp.compromis_negocie ?? 0);
  const partial = Number(sp.partial_loss ?? sp.perte_partielle ?? 0);
  const unfavorable = Number(sp.full_loss ?? sp.perte_totale ?? 0);

  const best = favorable >= negotiated ? 'favorable' : 'negotiated';
  const worst = unfavorable > partial ? 'unfavorable' : 'partial';

  // Use t() for localized fallback texts when backend data is too thin.
  const fallback = t || ((k) => k);
  const objectives = {
    primary: intro || fallback('strategy.fallback.primary_default'),
    fallback: best === 'favorable'
      ? fallback('strategy.fallback.fallback_negotiated')
      : fallback('strategy.fallback.fallback_partial'),
    avoided: worst === 'unfavorable'
      ? fallback('strategy.fallback.avoided_total_loss')
      : fallback('strategy.fallback.avoided_default'),
  };

  return {
    intro_text: intro || fallback('strategy.fallback.intro_default'),
    arguments: args,
    objectives,
  };
}
