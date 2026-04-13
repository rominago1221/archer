import { useState, useEffect, useRef } from 'react';

const STAGE_TO_SCENE = {
  started: 0,
  facts_extracted: 1,
  jurisprudence_loaded: 2,
  score_ready: 3,
  findings_ready: 4,
  battle_ready: 5,
  strategy_ready: 6,
  complete: 7,
};

const MIN_SCENE_DURATION = {
  0: 3000, 1: 5000, 2: 7000, 3: 10000,
  4: 10000, 5: 7000, 6: 5000, 7: 2000,
};

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
    mountedRef.current = true;
    emittedRef.current = new Set();
    sceneStartRef.current = Date.now();

    const API = process.env.REACT_APP_BACKEND_URL || '';

    const advanceScene = (targetScene) => {
      if (!mountedRef.current) return;
      const elapsed = Date.now() - sceneStartRef.current;
      const minDur = MIN_SCENE_DURATION[targetScene - 1] || 3000;
      const remaining = Math.max(0, minDur - elapsed);

      if (remaining > 0) {
        if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
        sceneTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setCurrentScene(targetScene);
          sceneStartRef.current = Date.now();
        }, remaining);
      } else {
        setCurrentScene(targetScene);
        sceneStartRef.current = Date.now();
      }
    };

    const emit = (stage, eventData) => {
      if (emittedRef.current.has(stage) || !mountedRef.current) return;
      emittedRef.current.add(stage);
      setData(prev => ({ ...prev, [stage]: { stage, ...eventData } }));
      const scene = STAGE_TO_SCENE[stage];
      if (scene !== undefined && scene > 0) advanceScene(scene);
      if (stage === 'complete' || stage === 'already_complete') {
        setIsComplete(true);
      }
    };

    // Scene 00 immediately
    emit('started', { message: 'Archer ouvre votre dossier' });

    // Trigger backend analysis — abort after 500ms (analysis runs in background)
    const ac = new AbortController();
    fetch(`${API}/api/analyze/stream?case_id=${caseId}`, {
      credentials: 'include',
      signal: ac.signal,
    }).catch(() => {});
    setTimeout(() => ac.abort(), 500);

    // Recursive polling with setTimeout
    let pollNum = 0;
    let stopped = false;

    const schedulePoll = () => {
      if (stopped || !mountedRef.current) return;
      setTimeout(async () => {
        if (stopped || !mountedRef.current) return;
        pollNum++;
        try {
          const r = await fetch(`${API}/api/cases/${caseId}`, { credentials: 'include' });
          if (!r.ok || stopped || !mountedRef.current) { schedulePoll(); return; }
          const c = await r.json();
          const score = c.risk_score || 0;
          if (c.status !== 'active' || score === 0) { schedulePoll(); return; }

          stopped = true;

          // Already analyzed before this session? Redirect.
          if (pollNum <= 2) {
            emit('already_complete', { case_id: caseId });
            return;
          }

          // Analysis just completed! Start cinematic events.
          const findings = c.ai_findings || [];
          const battle = c.battle_preview;
          const sp = c.success_probability;
          const laws = c.applicable_laws || [];

          emit('facts_extracted', {
            facts: {
              type_document: c.type || 'other',
              key_dates: c.deadline ? [{ date: c.deadline, description: c.deadline_description }] : [],
              montants_cles: c.financial_exposure ? [{ montant: c.financial_exposure, devise: 'EUR', description: 'Exposition financière' }] : [],
              references_legales_citees: laws.slice(0, 4).map(l => ({
                reference: l.law || l.loi || '',
                description: l.relevance || l.pertinence || '',
              })),
            },
          });

          const evts = [
            [5000, 'jurisprudence_loaded', { count: 2475, verified_refs: laws.slice(0, 5) }],
            [12000, 'score_ready', {
              score: { total: score, financial: c.risk_financial || 50, urgency: c.risk_urgency || 50,
                legal_strength: c.risk_legal_strength || 50, complexity: c.risk_complexity || 50,
                level: score > 85 ? 'critical' : score > 70 ? 'high' : score > 40 ? 'moderate' : 'low',
                tagline: c.key_insight || '' },
              level: score > 85 ? 'critical' : score > 70 ? 'high' : score > 40 ? 'moderate' : 'low',
              tagline: c.key_insight || '' }],
            [22000, 'findings_ready', { findings }],
            [32000, 'battle_ready', { user_side: battle?.user_side, opposing_side: battle?.opposing_side }],
            [39000, 'strategy_ready', { next_steps: c.ai_next_steps || [], success_probability: sp || {}, key_insight: c.key_insight || '' }],
            [44000, 'complete', {}],
          ];

          evts.forEach(([delay, stage, eventData]) => {
            const t = setTimeout(() => { if (mountedRef.current) emit(stage, eventData); }, delay);
            delayTimersRef.current.push(t);
          });
        } catch {
          if (!stopped && mountedRef.current) schedulePoll();
        }
      }, 2000);
    };

    schedulePoll();

    return () => {
      mountedRef.current = false;
      stopped = true;
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
      delayTimersRef.current.forEach(clearTimeout);
    };
  }, [caseId]);

  return { currentScene, data, isComplete, error };
}
