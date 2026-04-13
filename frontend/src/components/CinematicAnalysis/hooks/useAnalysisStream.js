import { useState, useEffect, useRef, useCallback } from 'react';

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
  0: 3000,
  1: 5000,
  2: 7000,
  3: 10000,
  4: 10000,
  5: 7000,
  6: 5000,
  7: 2000,
};

export function useAnalysisStream(caseId) {
  const [currentScene, setCurrentScene] = useState(0);
  const [data, setData] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const sceneStartRef = useRef(Date.now());
  const timerRef = useRef(null);
  const doneRef = useRef(false);
  const emittedRef = useRef(new Set());

  const advanceScene = useCallback((targetScene) => {
    if (doneRef.current) return;
    const now = Date.now();
    const elapsed = now - sceneStartRef.current;
    const prevSceneMin = MIN_SCENE_DURATION[targetScene - 1] || 3000;
    const remaining = Math.max(0, prevSceneMin - elapsed);

    if (remaining > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (doneRef.current) return;
        setCurrentScene(targetScene);
        sceneStartRef.current = Date.now();
      }, remaining);
    } else {
      setCurrentScene(targetScene);
      sceneStartRef.current = Date.now();
    }
  }, []);

  const emit = useCallback((stage, eventData) => {
    if (emittedRef.current.has(stage)) return;
    emittedRef.current.add(stage);
    setData(prev => ({ ...prev, [stage]: { stage, ...eventData } }));
    const scene = STAGE_TO_SCENE[stage];
    if (scene !== undefined && scene > 0) {
      advanceScene(scene);
    }
    if (stage === 'complete' || stage === 'already_complete') {
      doneRef.current = true;
      setIsComplete(true);
    }
  }, [advanceScene]);

  useEffect(() => {
    if (!caseId) return;
    doneRef.current = false;
    emittedRef.current = new Set();

    const API = process.env.REACT_APP_BACKEND_URL || '';

    // Scene 00: immediate
    emit('started', { message: 'Archer ouvre votre dossier' });

    // Trigger the SSE endpoint to start the backend analysis
    fetch(`${API}/api/analyze/stream?case_id=${caseId}`, {
      credentials: 'include',
      headers: { Accept: 'text/event-stream' },
    }).catch(() => {});

    // Poll for analysis completion
    let pollCount = 0;
    let pollInterval = null;

    const checkCase = async () => {
      if (doneRef.current) {
        clearInterval(pollInterval);
        return;
      }
      pollCount++;
      if (pollCount > 90) {
        setError('Analysis timeout');
        clearInterval(pollInterval);
        return;
      }

      try {
        const resp = await fetch(`${API}/api/cases/${caseId}`, { credentials: 'include' });
        if (!resp.ok) return;
        const c = await resp.json();
        const score = c.risk_score || 0;
        const status = c.status;

        if (status !== 'active' || score === 0) return;
        clearInterval(pollInterval);

        // Analysis complete! Emit events with cinematic timing
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

        const delays = [
          [5000, 'jurisprudence_loaded', { count: 2475, verified_refs: laws.slice(0, 5) }],
          [12000, 'score_ready', {
            score: {
              total: score,
              financial: c.risk_financial || 50,
              urgency: c.risk_urgency || 50,
              legal_strength: c.risk_legal_strength || 50,
              complexity: c.risk_complexity || 50,
              level: score > 85 ? 'critical' : score > 70 ? 'high' : score > 40 ? 'moderate' : 'low',
              tagline: c.key_insight || '',
            },
            level: score > 85 ? 'critical' : score > 70 ? 'high' : score > 40 ? 'moderate' : 'low',
            tagline: c.key_insight || '',
          }],
          [22000, 'findings_ready', { findings }],
          [32000, 'battle_ready', { user_side: battle?.user_side, opposing_side: battle?.opposing_side }],
          [39000, 'strategy_ready', {
            next_steps: c.ai_next_steps || [],
            success_probability: sp || {},
            key_insight: c.key_insight || '',
          }],
          [44000, 'complete', {}],
        ];

        delays.forEach(([delay, stage, eventData]) => {
          setTimeout(() => emit(stage, eventData), delay);
        });

      } catch {
        // Ignore
      }
    };

    pollInterval = setInterval(checkCase, 2000);

    return () => {
      doneRef.current = true;
      clearInterval(pollInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [caseId, emit]);

  return { currentScene, data, isComplete, error };
}
