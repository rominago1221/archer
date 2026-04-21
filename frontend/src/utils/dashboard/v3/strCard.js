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

// Condense a long legal_ref to a short pill label (~15 chars).
// Examples: "Loi du 20/02/1991 article 3 §5" → "Loi 20/02/1991"
//           "Ord. bxl 27/07/2017 article 224 §1" → "Ord. bxl 27/07/2017"
function compactRefPill(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // Strip trailing " article X §Y" chunks to keep pill compact.
  s = s.replace(/\s*,?\s*article\s+\d+[^,]*$/i, '');
  s = s.replace(/\s*§\s*\d+.*$/, '');
  // Abbreviate Ordonnance / Article / Loi
  s = s.replace(/\bOrdonnance\b/i, 'Ord.');
  s = s.replace(/\bArticle\b/i, 'art.');
  if (s.length > 22) s = s.slice(0, 20) + '…';
  return s;
}

// Strings like "Le régime légal du préavis de résiliation anticipée par le"
// are older backend outputs that got cut mid-sentence (before the prompt
// update). If the title ends on a loose preposition/article we strip the
// trailing word so the phrase reads cleanly, and we can fall back to the
// source's `description` / `how_to_use` for the continuation.
const LOOSE_TAIL = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'd', 'au', 'aux',
  'par', 'pour', 'sur', 'en', 'un', 'une', 'et', 'ou',
  'l', 'ce', 'cet', 'cette', 'son', 'sa', 'ses', 'leur', 'leurs',
  'à', 'avec', 'sans', 'dans', 'the', 'a', 'an', 'of', 'to', 'by',
]);

// Noun-phrase openers ("Le / La / Les / L'") are also a hint the backend
// produced a title WITHOUT a verb — that's the whole "La clause d'intérêts
// de retard de 12%" bug. We keep the string but prepend an implicit action
// verb so the checklist reads as an action.
const NOUN_PHRASE_STARTS = /^(le |la |les |l'|l’|une |un |ce |cette |ces |des |du )/i;

// Strip loose tails iteratively (e.g. "par le" → strip "le" → "par" → strip
// "par" → clean stem). Caps at 4 iterations so we never nibble a real
// title to nothing.
function stripLooseTail(s) {
  let clean = String(s || '').trim().replace(/\s+/g, ' ');
  for (let i = 0; i < 4; i++) {
    if (!clean) break;
    const lastWord = clean.split(' ').pop().toLowerCase().replace(/[.,;:]$/, '');
    if (!LOOSE_TAIL.has(lastWord)) break;
    const parts = clean.split(' ');
    if (parts.length <= 1) break; // would empty the string
    clean = parts.slice(0, -1).join(' ').replace(/[,;]$/, '').trim();
  }
  return clean;
}

// Heuristic: backend produced a noun phrase without a leading verb.
// Turn "La clause d'intérêts de retard de 12%" into "Contester la clause
// d'intérêts de retard de 12%". Keeps new-prompt verb-led titles untouched.
function ensureActionVerb(s, language) {
  const clean = String(s || '').trim();
  if (!clean) return clean;
  if (!NOUN_PHRASE_STARTS.test(clean)) return clean; // already starts with a verb / acronym / number
  const verb = String(language || 'fr').startsWith('en') ? 'Address ' : 'Invoquer ';
  // lowercase the first letter so "La clause" → "Invoquer la clause"
  return verb + clean.charAt(0).toLowerCase() + clean.slice(1);
}

// Split a checklist source into { bold, rest, ref } so the UI can render
// a short bold action + short continuation + green ref pill — matching
// the mockup pattern:
//   **Invalidation de la clause pénale à 12%** [art. 5.74]
//   **Demande de réduction du loyer** au prix de référence bruxellois
//   **Mise en demeure d'enregistrer le bail** [15 jours max]
// Hard-cap the bold at 60 chars and the continuation at 45 chars; if the
// source string has a ":" separator we use it to split bold vs rest,
// otherwise bold takes everything up to the first break and rest is
// dropped. No ellipsis — the user sees a complete short phrase.
function splitChecklistItem(rawTitle, rawRef) {
  const raw = stripLooseTail(rawTitle);
  const clean = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { bold: '', rest: '', ref: compactRefPill(rawRef) };

  // Colon / em-dash / parenthesis = primary split points
  let bold;
  let rest = '';
  const primaryMatch = clean.search(/\s*[:—–]\s|\s*\(\s*/);
  if (primaryMatch > 8 && primaryMatch < 70) {
    bold = clean.slice(0, primaryMatch).trim();
    rest = clean.slice(primaryMatch).replace(/^[\s:—–()]+/, '').trim();
  } else {
    bold = clean;
  }

  // Cap bold at 60 chars on a word boundary
  if (bold.length > 60) {
    const cut = bold.slice(0, 60).lastIndexOf(' ');
    bold = bold.slice(0, cut > 25 ? cut : 60).trim();
    rest = ''; // drop continuation if bold already got cropped
  }

  // Cap continuation at 45 chars; drop if it doesn't open with lowercase
  // (avoids keeping long detail explanations).
  if (rest) {
    if (rest.length > 45) {
      const cut = rest.slice(0, 45).lastIndexOf(' ');
      rest = rest.slice(0, cut > 10 ? cut : 45).trim();
    }
    // Strip trailing comma/semicolon/dot
    rest = rest.replace(/[,;.]\s*$/, '');
  }

  return { bold, rest, ref: compactRefPill(rawRef) };
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

export function deriveStrCard(caseDoc, strategy) {
  const depth = deriveAnalysisDepth(caseDoc);
  const confidence = Math.round(depth.archer_confidence || 0);

  // ── Title / subtitle ──────────────────────────────────────────────────
  // Strategy title must stay on 1-2 lines (mockup: "Contester 3 clauses
  // du bail pour réduire ton loyer." — 53 chars). We walk the priority
  // list and force a short cut even if the source is a full paragraph.
  const TITLE_MAX = 75;
  function clampTitle(s) {
    if (!s) return null;
    let clean = String(s).trim().replace(/\s+/g, ' ');
    // Drop trailing colon details ("Title : long explanation" → "Title")
    const colonIdx = clean.search(/\s*:\s/);
    if (colonIdx > 20 && colonIdx < TITLE_MAX) {
      clean = clean.slice(0, colonIdx).trim();
    }
    if (clean.length <= TITLE_MAX) return clean;
    // Cut at first period if any before 80 chars
    const firstStop = clean.slice(0, 90).search(/\.\s|[!?]\s|[!?]$/);
    if (firstStop > 25) return clean.slice(0, firstStop + 1);
    // Last resort: hard cut on word boundary
    const lastSpace = clean.slice(0, TITLE_MAX).lastIndexOf(' ');
    return clean.slice(0, lastSpace > 40 ? lastSpace : TITLE_MAX).trimEnd() + '.';
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
  // Checklist source priority: strategy.arguments → ai_next_steps. Each
  // item is split into { bold, rest, ref, action_type, verification_question }.
  // When ANY item is verification_required, the StrCard blocks the
  // "attorney letter" CTA until the user confirms (brief §2, Type A/B).
  let checklist = [];
  const args = Array.isArray(strategy?.arguments) ? strategy.arguments : [];
  // For each source: we try `title` first, then fall back to
  // `description` / `how_to_use` / `angle` / `argument` if title looks
  // truncated (ends on a loose preposition). That catches legacy cached
  // cases analysed before the strict-title prompt shipped.
  // Finally ensureActionVerb() prepends "Invoquer / Address" when the
  // backend produced a noun phrase ("La clause d'intérêts…").
  const pickTitleWithFallback = (item) => {
    const title = item.title || '';
    const cleanTitle = stripLooseTail(title);
    const chosen = cleanTitle.length > 15
      ? cleanTitle
      : (item.description || item.how_to_use || item.argument || item.angle || title);
    return ensureActionVerb(stripLooseTail(chosen), /* language */ undefined);
  };

  if (args.length > 0) {
    checklist = args.slice(0, 3).map((a) => ({
      ...splitChecklistItem(pickTitleWithFallback(a), pickFirstRef(a)),
      action_type: a.action_type || 'direct',
      verification_question: a.verification_question || null,
    }));
  } else {
    const steps = Array.isArray(caseDoc?.ai_next_steps) ? caseDoc.ai_next_steps : [];
    checklist = steps.slice(0, 3).map((s) => ({
      ...splitChecklistItem(pickTitleWithFallback(s), pickFirstRef(s)),
      action_type: s.action_type || 'direct',
      verification_question: s.verification_question || null,
    }));
  }

  // Aggregate: the whole strategy is "verification_required" if ANY step is.
  const needsVerification = checklist.some((c) => c.action_type === 'verification_required');
  const firstVerificationQuestion = checklist.find((c) => c.action_type === 'verification_required')?.verification_question || null;

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
    needsVerification,
    firstVerificationQuestion,
  };
}
