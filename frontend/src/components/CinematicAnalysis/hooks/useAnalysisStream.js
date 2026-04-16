import { useState, useEffect, useRef, useCallback } from 'react';

const STAGE_TO_SCENE = {
  started: 0, facts_extracted: 1, jurisprudence_loaded: 2, score_ready: 3,
  findings_ready: 4, battle_ready: 5, strategy_ready: 6, complete: 7,
};

// Minimum duration each scene stays visible. Applies when we transition OUT of
// that scene. Scenes 0-2 are time-based (independent of backend). Scenes 3+
// fire sequentially once the backend has produced real data.
// Bug 3 — Scene 0 (intro "Analyzing your document...") now holds 10s so users
// can actually read it. Scene 1 (document highlight scan) needs ~12s to play
// the per-line highlight animation through.
const MIN_SCENE_DURATION = {
  0: 10000, 1: 12000, 2: 6000, 3: 10000,
  4: 10000, 5: 7000, 6: 5000, 7: 2000,
};

// Auto-advance timers for the first 3 scenes.
// Bug 3 — push Scene 1 entry to 10s so the intro has time to land.
// Scene 2 fires at 22s = 10s intro + 12s scan animation.
const SCENE1_AT_MS = 10000;
const SCENE2_AT_MS = 22000;

// Post-real-data cadence for scenes 3-7 (offsets from the moment we detect
// completion). Tuned so the full reveal takes ~35-40s and feels cinematic.
const REAL_DATA_EVENTS_MS = [
  [0, 'score_ready'],
  [10000, 'findings_ready'],
  [20000, 'battle_ready'],
  [27000, 'strategy_ready'],
  [32000, 'complete'],
];

// Polling cadence: fast burst for the first few checks to catch cached/fast
// analyses (e.g. already_complete), then slow to save resources.
const POLL_FAST_MS = 1500;
const POLL_FAST_COUNT = 5;
const POLL_SLOW_MS = 3000;

function riskLevel(score) {
  if (score > 85) return 'critical';
  if (score > 70) return 'high';
  if (score > 40) return 'moderate';
  return 'low';
}

export function useAnalysisStream(caseId) {
  const [currentScene, setCurrentScene] = useState(0);
  const [data, setData] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const sceneStartRef = useRef(Date.now());
  const sceneTimerRef = useRef(null);
  const emittedRef = useRef(new Set());
  const delayTimersRef = useRef([]);

  useEffect(() => {
    if (!caseId) return;
    mountedRef.current = true;
    emittedRef.current = new Set();
    sceneStartRef.current = Date.now();
    const startedAt = Date.now();
    const HARD_TIMEOUT_MS = 360000; // 6 min — Opus 4.6 analysis can take 3-5 min

    const API = process.env.REACT_APP_BACKEND_URL || '';

    const advanceScene = (targetScene) => {
      if (!mountedRef.current) return;
      const elapsed = Date.now() - sceneStartRef.current;
      const minDur = MIN_SCENE_DURATION[targetScene - 1] || 3000;
      const remaining = Math.max(0, minDur - elapsed);
      const apply = () => {
        if (!mountedRef.current) return;
        setCurrentScene((cur) => (targetScene > cur ? targetScene : cur));
        sceneStartRef.current = Date.now();
      };
      if (remaining > 0) {
        if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
        sceneTimerRef.current = setTimeout(apply, remaining);
      } else {
        apply();
      }
    };

    // emit(stage, data, {advance}) — emitting the same stage twice updates data
    // but does NOT re-trigger advanceScene. That lets us seed scenes 1/2 with
    // placeholder data early, then upgrade to real backend data later without
    // snapping the UI.
    const emit = (stage, eventData, opts = {}) => {
      const { advance = true } = opts;
      if (!mountedRef.current) return;
      const already = emittedRef.current.has(stage);
      emittedRef.current.add(stage);
      setData((prev) => ({ ...prev, [stage]: { stage, ...eventData } }));
      const scene = STAGE_TO_SCENE[stage];
      if (advance && !already && scene !== undefined && scene > 0) advanceScene(scene);
      if (stage === 'complete' || stage === 'already_complete') setIsComplete(true);
    };

    // Scene 0 kicks in from the initial useState(0). Announce 'started' for UI.
    emit('started', { message: 'Archer ouvre votre dossier' });

    // ── Scene 0 → 1 → 2 auto-advance (time-based, not data-gated) ──────────
    const scene1Timer = setTimeout(() => {
      emit('facts_extracted', { facts: { type_document: 'other', key_dates: [], montants_cles: [], references_legales_citees: [] } });
    }, SCENE1_AT_MS);
    delayTimersRef.current.push(scene1Timer);

    const scene2Timer = setTimeout(() => {
      emit('jurisprudence_loaded', { count: 2475, verified_refs: [] });
    }, SCENE2_AT_MS);
    delayTimersRef.current.push(scene2Timer);

    // ── Polling: watches for completion + error ────────────────────────────
    let stopped = false;
    let pollNum = 0;
    let intervalId = null;

    const completed = (c) => {
      // Fire scenes 3-7 relative to now, using real backend data.
      const findings = c.ai_findings || [];
      const battle = c.battle_preview;
      const sp = c.success_probability;
      const laws = c.applicable_laws || [];
      const score = c.risk_score || 0;
      const level = riskLevel(score);
      const tagline = c.key_insight || '';

      // Upgrade scenes 1/2 data in-place (no advance).
      emit('facts_extracted', {
        facts: {
          type_document: c.type || 'other',
          key_dates: c.deadline ? [{ date: c.deadline, description: c.deadline_description }] : [],
          montants_cles: c.financial_exposure
            ? [{ montant: c.financial_exposure, devise: 'EUR', description: 'Exposition financière' }] : [],
          references_legales_citees: laws.slice(0, 4).map((l) => ({
            reference: l.law || l.loi || '', description: l.relevance || l.pertinence || '',
          })),
        },
      }, { advance: false });

      emit('jurisprudence_loaded', {
        count: 2475,
        verified_refs: laws.slice(0, 5),
      }, { advance: false });

      // Scenes 3-7 with real data, staggered.
      const payloads = {
        score_ready: {
          score: {
            total: score,
            financial: c.risk_financial || 50,
            urgency: c.risk_urgency || 50,
            legal_strength: c.risk_legal_strength || 50,
            complexity: c.risk_complexity || 50,
            level,
            tagline,
          },
          level,
          tagline,
        },
        findings_ready: { findings },
        battle_ready: { user_side: battle?.user_side, opposing_side: battle?.opposing_side },
        strategy_ready: {
          next_steps: c.ai_next_steps || [],
          success_probability: sp || {},
          key_insight: tagline,
        },
        complete: {},
      };

      REAL_DATA_EVENTS_MS.forEach(([delay, stage]) => {
        const tm = setTimeout(() => {
          if (mountedRef.current) emit(stage, payloads[stage]);
        }, delay);
        delayTimersRef.current.push(tm);
      });
    };

    const pollFn = () => {
      if (stopped || !mountedRef.current) return;
      pollNum++;
      if (Date.now() - startedAt > HARD_TIMEOUT_MS) {
        stopped = true;
        if (intervalId) window.clearTimeout(intervalId);
        if (mountedRef.current) setError('Analysis timed out. Please try again.');
        return;
      }
      fetch(`${API}/api/cases/${caseId}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => {
          if (!c || stopped || !mountedRef.current) return;
          window.__cinPollResult = { status: c.status, score: c.risk_score, pollNum };

          if (c.status === 'error') {
            stopped = true;
            if (intervalId) window.clearTimeout(intervalId);
            if (mountedRef.current) setError(c.ai_summary || 'Analysis failed. Please try again.');
            return;
          }
          if (c.status !== 'active' || (c.risk_score || 0) === 0) return;

          stopped = true;
          if (intervalId) window.clearTimeout(intervalId);

          // Fast path: case was already analyzed (or completed very quickly) —
          // don't play the full cinematic, redirect immediately via isComplete.
          if (pollNum <= 2) {
            emit('already_complete', { case_id: caseId });
            return;
          }

          completed(c);
        })
        .catch(() => {});
    };

    // Adaptive polling: fast burst for the first few checks, then slow down.
    let pollsIssued = 0;
    const scheduleNext = () => {
      if (stopped || !mountedRef.current) return;
      pollsIssued++;
      const next = pollsIssued <= POLL_FAST_COUNT ? POLL_FAST_MS : POLL_SLOW_MS;
      intervalId = window.setTimeout(() => { pollFn(); scheduleNext(); }, next);
    };
    scheduleNext();

    return () => {
      mountedRef.current = false;
      stopped = true;
      if (intervalId) window.clearTimeout(intervalId);
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
      delayTimersRef.current.forEach(clearTimeout);
    };
  }, [caseId]);

  // Deep analysis message after 120s
  const [deepAnalysisMsg, setDeepAnalysisMsg] = useState(null);
  useEffect(() => {
    if (isComplete || error) return;
    const timer = setTimeout(() => {
      if (!isComplete && !error) {
        setDeepAnalysisMsg('Deep analysis in progress \u2014 Opus is being thorough...');
      }
    }, 120000);
    return () => clearTimeout(timer);
  }, [isComplete, error]);

  return { currentScene, data, isComplete, error, deepAnalysisMsg };
}
