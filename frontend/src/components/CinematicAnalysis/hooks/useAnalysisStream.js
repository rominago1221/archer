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

  // All mutable state in a single ref to avoid dependency issues
  const stateRef = useRef({
    done: false,
    emitted: new Set(),
    sceneStart: Date.now(),
    sceneTimer: null,
    pollTimer: null,
    delayTimers: [],
  });

  useEffect(() => {
    if (!caseId) return;

    const s = stateRef.current;
    s.done = false;
    s.emitted = new Set();
    s.sceneStart = Date.now();

    const API = process.env.REACT_APP_BACKEND_URL || '';

    const advanceScene = (targetScene) => {
      if (s.done) return;
      const elapsed = Date.now() - s.sceneStart;
      const minDur = MIN_SCENE_DURATION[targetScene - 1] || 3000;
      const remaining = Math.max(0, minDur - elapsed);

      if (remaining > 0) {
        if (s.sceneTimer) clearTimeout(s.sceneTimer);
        s.sceneTimer = setTimeout(() => {
          if (s.done) return;
          setCurrentScene(targetScene);
          s.sceneStart = Date.now();
        }, remaining);
      } else {
        setCurrentScene(targetScene);
        s.sceneStart = Date.now();
      }
    };

    const emit = (stage, eventData) => {
      if (s.emitted.has(stage) || s.done) return;
      s.emitted.add(stage);
      setData(prev => ({ ...prev, [stage]: { stage, ...eventData } }));
      const scene = STAGE_TO_SCENE[stage];
      if (scene !== undefined && scene > 0) advanceScene(scene);
      if (stage === 'complete' || stage === 'already_complete') {
        s.done = true;
        setIsComplete(true);
      }
    };

    // Scene 00 immediately
    emit('started', { message: 'Archer ouvre votre dossier' });

    // Trigger backend analysis
    fetch(`${API}/api/analyze/stream?case_id=${caseId}`, {
      credentials: 'include',
      headers: { Accept: 'text/event-stream' },
    }).catch(() => {});

    // Poll every 2s
    let pollCount = 0;

    const poll = () => {
      if (s.done) return;
      pollCount++;

      fetch(`${API}/api/cases/${caseId}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(c => {
          if (!c || s.done) return;
          const score = c.risk_score || 0;
          if (c.status !== 'active' || score === 0) return;

          // Stop polling
          if (s.pollTimer) clearInterval(s.pollTimer);

          // If found active on first polls → already analyzed, redirect
          if (pollCount <= 2) {
            emit('already_complete', { case_id: caseId });
            return;
          }

          // Emit cinematic events with delays
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
              score: { total: score, financial: c.risk_financial || 50, urgency: c.risk_urgency || 50, legal_strength: c.risk_legal_strength || 50, complexity: c.risk_complexity || 50,
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
            const t = setTimeout(() => emit(stage, eventData), delay);
            s.delayTimers.push(t);
          });
        })
        .catch(() => {});
    };

    s.pollTimer = setInterval(poll, 2000);

    return () => {
      s.done = true;
      if (s.pollTimer) clearInterval(s.pollTimer);
      if (s.sceneTimer) clearTimeout(s.sceneTimer);
      s.delayTimers.forEach(clearTimeout);
    };
  }, [caseId]); // Only depends on caseId — nothing else

  return { currentScene, data, isComplete, error };
}
