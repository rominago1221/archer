// Keyword-based impact generator. Ensures every argument surfaces a green
// impact pill even when the backend didn't populate one.
const IMPACT_RULES_FR = [
  { keywords: ['nullité', 'nullite', 'vice de forme', 'vice de procédure', 'vice de procedure'], impact: '\u2192 Si accepté : nullité de la procédure' },
  { keywords: ['marge', 'calibration', 'tolérance', 'tolerance'], impact: '\u2192 Si accepté : réduction technique de la qualification' },
  { keywords: ['disproportionné', 'disproportionne', 'proportionnalité', 'proportionnalite', 'excessif'], impact: '\u2192 Si accepté : réduction du montant' },
  { keywords: ['défaut', 'defaut', 'absence', 'manque', 'omission'], impact: '\u2192 Si accepté : invalidation de l\u2019élément contesté' },
  { keywords: ['prescription', 'délai', 'delai', 'forclusion'], impact: '\u2192 Si accepté : irrecevabilité de l\u2019action' },
  { keywords: ['charge de la preuve', 'preuve', 'contradiction'], impact: '\u2192 Si accepté : renversement de la charge de la preuve' },
];
const IMPACT_RULES_EN = [
  { keywords: ['nullity', 'void', 'procedural defect', 'vice'], impact: '\u2192 If accepted: procedural nullity' },
  { keywords: ['margin', 'calibration', 'tolerance'], impact: '\u2192 If accepted: technical reduction of the qualification' },
  { keywords: ['disproportionate', 'proportionality', 'excessive'], impact: '\u2192 If accepted: reduced amount' },
  { keywords: ['lack', 'absence', 'missing', 'omission'], impact: '\u2192 If accepted: invalidation of the contested element' },
  { keywords: ['statute of limitations', 'limitations', 'time-barred', 'deadline'], impact: '\u2192 If accepted: action is time-barred' },
  { keywords: ['burden of proof', 'evidence', 'contradiction'], impact: '\u2192 If accepted: shifts the burden of proof' },
];

function generateImpact(title, angle, language) {
  const text = `${title || ''} ${angle || ''}`.toLowerCase();
  const rules = language === 'fr' ? IMPACT_RULES_FR : IMPACT_RULES_EN;
  for (const rule of rules) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.impact;
  }
  return language === 'fr'
    ? '\u2192 Renforce ta position de défense'
    : '\u2192 Strengthens your defense';
}

// When the backend case does not yet include the V7 structured strategy
// (legacy case analyzed before the prompt update), derive a reasonable
// approximation from the existing fields: key_insight + battle_preview + success_probability.
//
// Returns { intro_text, arguments: [{number, title, angle, impact}], objectives: {primary, fallback, avoided} }
export function deriveStrategy(caseDoc, t, language = 'fr') {
  if (!caseDoc) return null;
  const lang = language === 'en' ? 'en' : 'fr';
  // New prompts populate `strategy_narrative` with the V7-ready structure.
  // (Legacy `strategy` holds the old recommended_strategy dict; we fall back below.)
  const narrative = caseDoc.strategy_narrative;
  if (narrative && typeof narrative === 'object' && Array.isArray(narrative.arguments) && narrative.intro_text) {
    // Ensure every argument has a non-empty impact, even if the prompt skipped it.
    const args = narrative.arguments.map((arg) => ({
      ...arg,
      impact: (arg && arg.impact && String(arg.impact).trim())
        || generateImpact(arg?.title, arg?.angle, lang),
    }));
    return { ...narrative, arguments: args };
  }

  // ── intro ────────────────────────────────────────────────────────────────
  const intro = (caseDoc.key_insight || '').trim() || (caseDoc.ai_summary || '');

  // ── arguments (from user_side of battle_preview) ─────────────────────────
  const userArgs = caseDoc.battle_preview?.user_side?.strongest_arguments
    || caseDoc.battle_preview?.user_side?.strong_arguments
    || [];
  const args = userArgs.slice(0, 5).map((a, i) => {
    const title = a.argument || a.title || '';
    const angle = a.angle || a.legal_basis || a.reasoning || '';
    const backendImpact = (a.impact || a.expected_outcome || a.strength_explanation || '').trim();
    return {
      number: i + 1,
      title,
      angle,
      impact: backendImpact || generateImpact(title, angle, lang),
    };
  });

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
