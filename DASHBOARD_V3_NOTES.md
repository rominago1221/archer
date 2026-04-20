# Dashboard V3 — Implementation notes

Delivered via branch `feat/dashboard-v3`, 11 atomic commits. Page refactored: `/cases/:caseId` → `CaseDetailV7.jsx`. All new styling scoped under `.dashboard-v3` in `frontend/src/styles/dashboard-v3.css`.

## Backend fields to create / enrich

These V3 UI elements currently render with placeholders or sensible fallbacks because the backend pipeline does not produce the data yet. Adding them would remove the `TODO(back)` comments in the files noted.

| UI element | Missing field | File with fallback |
|---|---|---|
| **Act 3.4 — 5 simulated attacks** | `caseDoc.attacks[]` structured output from PASS 5/6 (category, attackerQuote, attackerRefs, archerResponse, defenseRefs, defenseForce, threatLevel) | `utils/dashboard/v3/atkPlaceholders.js` — returns 5 BE rental-dispute exemplars while the backend catches up |
| **Act 2 — projection bar** | `caseDoc.success_probability.{full_resolution_in_favor, negotiated_settlement, full_loss, partial_loss}` populated consistently — today most cases have only the main `favorable/negotiated/unfavorable` keys | `utils/dashboard/v3/strCard.js::deriveStrCard()` falls back to a 60/20/20 split, flagged via `projPlaceholder: true` |
| **Act 1 — 4 dimensions** | A consistent `caseDoc.sub_scores` object with `{urgency, financial, complexity, legal}` — today only recent analyses have it | `utils/dashboard/v3/tsCard.js::buildDimensions()` derives each dim from `risk_score` with ±10–20 pt offsets when the sub-scores are absent |
| **Act 1 — "Économie potentielle" KPI** | `caseDoc.amounts.potential_savings` | Existing `financial.js::deriveAmounts()` falls back to –30% of `at_stake` — same behavior as the legacy V7 hero, but now surfaced more prominently |
| **Arms — jurisprudence refs with URLs** | `ai_findings[].jurisprudences[]` (array of `{label, url, citation_date?}`) | `ArmsStack.jsx` aggregates from `finding.jurisprudence_count` + `similar_cases_won/total` and falls back to a juportal search URL pre-filled with the finding title |

## Remaining hardcoded strings

`CaseDetailV7.jsx` still contains two inline blocks with direct `language === 'fr'` string switches:

1. **Generated-letter display** (lines ~338–402): "Archer rédige votre lettre…", "LETTRE GÉNÉRÉE", "Références :", "Télécharger", "Copier". Shown after `handleChoiceSelect('basic')` runs.
2. **Answer-feedback toast** (lines ~479–510): "Analyse mise à jour", "Nouvelles questions ci-dessous…", "Archer affine l'analyse…". Shown after `handleAnswerQuestion` submits.

These pre-existed the V3 refactor and weren't part of the brief scope. Migrating them to `t('v3.generated_letter.*')` and `t('v3.answer_feedback.*')` would finish the i18n sweep.

## Dropped from the render

- `HeroSection` (Sprint 1) — absorbed by `<TsCard>` (score ring, verdict, 4 KPIs).
- `StrategySection`, `GenerateLetterCTA`, `SendLetterOptions` modal — absorbed by `<StrCard>` with inline 3-option CTAs.
- `BattleSection` — absorbed by `<BattleBlock>` inside the Act 3 accordion.
- `AdversarialCounterArgsSection` — its intent is now covered by `<AtkList>` (Act 3.4) with structured face-à-face. The legacy component still lives in `frontend/src/components/AdversarialCounterArgsSection.jsx` in case it's reused elsewhere; if not, delete in a follow-up.
- `FindingsSection type="strong" / "critical"` — absorbed by `<ArmsStack>` (green accordion) and `<CritBox>` (red accordion).
- `ScoreHistoryGraph` — the 7-day sparkline in TsCard covers the same intent at a fraction of the space; the full chart never fit the 340 px rail.

## Accordion state

`openAccordions: Set<string>` lives in `CaseDetailV7.jsx`. All 4 accordions closed by default. `toggleAllAccordions` drives the ACT 3 header button (TOUT OUVRIR ↔ TOUT FERMER). The label flips based on `allOpen` (all 4 ids present in the set).

If a product decision ever opens one accordion by default on first visit, seed the initial state from a cookie or a backend field (e.g. `caseDoc.ui_defaults.open_accordions`).

## NL i18n

`useDashboardT.js::resolveLang()` patched to accept `'nl'`. Every v3.* key has an NL translation in `dashboard.json` (~100 keys). The atk placeholder copies are currently **French-as-NL-fallback** in `atkPlaceholders.js::PLACEHOLDER_ATTACKS_NL`; flagged with `TODO(i18n-nl)` for a native-speaker review.

## User plan (gating)

`StrCard` reads `user.plan` from `AuthContext` and renders the lock badge + SOLO+ tier pill when `plan === 'free'`. Per product spec §6.4 the CTA stays clickable (marketing signal, not a hard gate) — the Stripe Checkout opens for everyone. If the gating rule ever tightens to "redirect `/plans` when free", change the `onAttorney` handler in `CaseDetailV7.jsx`:

```js
onAttorney={() => {
  if (user?.plan === 'free') return navigate('/plans');
  return handleChoiceSelect('signed');
}}
```

Tier values in the DB: `free | solo | pro` (from `constants/credits.py::TIER_CREDITS`). No `plus`/`elite` tier exists.

## Suggested follow-ups (not V3 scope)

- Migrate the two hardcoded blocks above to i18n.
- Delete `AdversarialCounterArgsSection.jsx` if nothing else imports it.
- Populate `caseDoc.attacks[]` from PASS 5/6 and drop the placeholder file.
- Add `legal_ref_url` to every `ai_findings[].legal_refs[]` item so the rail pills don't fall back to `getLegalRefUrl()` (which guesses the source).
- Add an open-by-default UI preference (first visit flag) for Act 3 accordions if user testing shows the empty state is confusing.
- Run `grep -rn "language === '[a-z]\{2\}'"` in `components/Dashboard/V3/` to confirm zero new regressions once the above i18n migrations land.

## Behavior tracking

All pre-existing `useCaseBehaviorTracking` events still fire: `analysis_viewed`, `time_spent` heartbeat, `case_abandoned`, `scrolled_to_bottom` (via `bottomSentinelRef`), `refinement_started`, `clicked_attorney_letter`, `purchased_attorney_letter`, `purchased_live_counsel`. `markInteracted()` is called inside `handleChoiceSelect` (inherited).
