import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useAnalysisStream } from './hooks/useAnalysisStream';
import Scene00_Opening from './scenes/Scene00_Opening';
import Scene01_Reading from './scenes/Scene01_Reading';
import Scene02_Verification from './scenes/Scene02_Verification';
import Scene03_Verdict from './scenes/Scene03_Verdict';
import Scene04_Findings from './scenes/Scene04_Findings';
import Scene05_Battle from './scenes/Scene05_Battle';
import Scene06_Strategy from './scenes/Scene06_Strategy';
import Scene07_Landing from './scenes/Scene07_Landing';
import SceneNavigationControls from './SceneNavigationControls';
import './styles/animations.css';

// Bug 6 — scenes 0-2 auto-advance via the streaming hook. Scenes 3-7 require
// manual navigation: user clicks Prev/Next or uses arrow keys. The hand-off
// happens the first time the stream lands on FIRST_MANUAL_SCENE.
const FIRST_MANUAL_SCENE = 3;
const TOTAL_SCENES = 8;

export default function CinematicAnalysis() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const language = user?.language || (user?.jurisdiction === 'BE' ? 'fr' : 'en');
  const jurisdiction = user?.jurisdiction || 'US';
  const { currentScene: streamScene, data, isComplete, error, deepAnalysisMsg } = useAnalysisStream(caseId);

  // Bug 6 — once the stream crosses into manual-nav territory, freeze the
  // scene index locally and let the user drive Prev/Next.
  const [manualScene, setManualScene] = useState(null);
  const inManualMode = manualScene !== null;
  const currentScene = inManualMode ? manualScene : streamScene;

  useEffect(() => {
    if (!inManualMode && streamScene >= FIRST_MANUAL_SCENE) {
      setManualScene(streamScene);
    }
  }, [streamScene, inManualMode]);

  const goPrev = useCallback(() => {
    setManualScene((s) => Math.max(FIRST_MANUAL_SCENE, (s ?? streamScene) - 1));
  }, [streamScene]);

  const goNext = useCallback(() => {
    setManualScene((s) => Math.min(TOTAL_SCENES - 1, (s ?? streamScene) + 1));
  }, [streamScene]);

  // Keyboard nav (arrow keys) — only active in manual mode
  useEffect(() => {
    if (!inManualMode) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inManualMode, goPrev, goNext]);

  // Bug 2 — multi-document counter. Fetch the case once at mount to read
  // `document_count`. Displayed as a small badge so multi-upload users see
  // "Analysing N documents…" instead of nothing.
  const [documentCount, setDocumentCount] = useState(1);
  useEffect(() => {
    if (!caseId) return;
    const API = process.env.REACT_APP_BACKEND_URL || '';
    fetch(`${API}/api/cases/${caseId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => { if (c?.document_count) setDocumentCount(c.document_count); })
      .catch(() => {});
  }, [caseId]);

  // If already analyzed, redirect to case detail via useEffect (not during render)
  useEffect(() => {
    if (data.already_complete && isComplete) {
      navigate(`/cases/${caseId}`, { replace: true });
    }
  }, [data.already_complete, isComplete, caseId, navigate]);

  // Non-blocking error banner: keeps the cinematic visible so the user isn't
  // stranded on a white error page when Opus fails mid-pipeline. Retry re-
  // triggers the background analysis; the poll inside useAnalysisStream picks
  // up the next status change on its own.
  const [retrying, setRetrying] = useState(false);
  const handleRetry = useCallback(async () => {
    if (retrying || !caseId) return;
    setRetrying(true);
    try {
      const API = process.env.REACT_APP_BACKEND_URL || '';
      await axios.post(`${API}/api/analyze/trigger?case_id=${caseId}`, null, { withCredentials: true });
      // Force the page to reload the hook with a clean state. Simpler than
      // exposing a re-arm method from the hook and avoids stale timers.
      window.location.reload();
    } catch (_) {
      setRetrying(false);
    }
  }, [retrying, caseId]);

  const scenes = [
    <Scene00_Opening key={0} data={data} language={language} jurisdiction={jurisdiction} />,
    <Scene01_Reading key={1} data={data} language={language} />,
    <Scene02_Verification key={2} data={data} language={language} jurisdiction={jurisdiction} />,
    <Scene03_Verdict key={3} data={data} language={language} />,
    <Scene04_Findings key={4} data={data} language={language} />,
    <Scene05_Battle key={5} data={data} language={language} />,
    <Scene06_Strategy key={6} data={data} language={language} jurisdiction={jurisdiction} />,
    <Scene07_Landing key={7} data={data} language={language} jurisdiction={jurisdiction} caseId={caseId} />,
  ];

  return (
    <div data-testid="cinematic-analysis" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 3, background: '#e2e0db' }}>
        <div style={{
          height: '100%', background: '#1a56db', borderRadius: '0 2px 2px 0',
          width: `${Math.min(100, ((currentScene + 1) / 8) * 100)}%`,
          transition: 'width 1s ease',
        }} />
      </div>

      {/* Scene indicator */}
      <div style={{
        position: 'fixed', top: 12, right: 16, zIndex: 100,
        padding: '5px 12px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
        borderRadius: 20, border: '0.5px solid #e2e0db',
        fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.5px',
        fontFamily: '"SF Mono", Monaco, monospace',
      }}>
        {String(currentScene).padStart(2, '0')} / 07
      </div>

      {/* Bug 2 — multi-document counter (visible only when >1 doc) */}
      {documentCount > 1 && (
        <div style={{
          position: 'fixed', top: 12, left: 16, zIndex: 100,
          padding: '5px 12px', background: 'rgba(26,86,219,0.95)',
          borderRadius: 20, border: '0.5px solid #1a56db',
          fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.3px',
          fontFamily: '"SF Mono", Monaco, monospace',
        }}>
          📎 {language?.startsWith('fr')
            ? `Analyse de ${documentCount} documents…`
            : `Analysing ${documentCount} documents…`}
        </div>
      )}

      {/* Deep analysis message after 120s */}
      {deepAnalysisMsg && !isComplete && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '10px 20px',
          background: 'rgba(26,86,219,0.95)', backdropFilter: 'blur(8px)',
          borderRadius: 12, border: '1px solid #1a56db',
          fontSize: 12, fontWeight: 600, color: '#fff',
          animation: 'fadeIn 0.5s ease',
        }}>
          {deepAnalysisMsg}
        </div>
      )}

      {/* Inline, non-blocking error banner. When the backend pipeline fails
          we used to replace the whole page with a red error screen, killing
          the cinematic mid-flight. Now the current scene keeps playing and
          the user gets a Retry / Back action at the top. */}
      {error && (
        <div
          data-testid="cinematic-error-banner"
          style={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, padding: '12px 18px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 13, color: '#991b1b', fontWeight: 500,
            boxShadow: '0 10px 30px rgba(220,38,38,0.15)',
          }}
        >
          <span style={{ fontWeight: 700 }}>
            {language?.startsWith('fr') ? 'Analyse interrompue' : 'Analysis interrupted'}
          </span>
          <span style={{ color: '#7f1d1d' }}>{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            data-testid="cinematic-error-retry"
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: retrying ? '#94a3b8' : '#1a56db', color: '#fff',
              border: 'none', fontSize: 12, fontWeight: 600,
              cursor: retrying ? 'default' : 'pointer',
            }}
          >
            {retrying
              ? (language?.startsWith('fr') ? 'Relance…' : 'Retrying…')
              : (language?.startsWith('fr') ? 'Réessayer' : 'Retry')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            data-testid="cinematic-error-back"
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'transparent', color: '#991b1b',
              border: '1px solid #fecaca', fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {language?.startsWith('fr') ? 'Dashboard' : 'Dashboard'}
          </button>
        </div>
      )}

      {/* Bug 5 — Scenes are scaled +20% via the .cinematic-scene-wrap class
          which applies transform: scale(1.2) on viewports >= 768px. On mobile
          the natural responsive layout wins (no scale). */}
      <div key={currentScene} style={{ animation: 'fadeIn 0.4s ease' }} className="cinematic-scene-wrap">
        {scenes[Math.min(currentScene, scenes.length - 1)]}
      </div>

      {/* Bug 6 — Manual nav controls, visible only on scenes 3+ */}
      {inManualMode && (
        <SceneNavigationControls
          currentIndex={currentScene}
          totalScenes={TOTAL_SCENES}
          firstManualScene={FIRST_MANUAL_SCENE}
          onPrev={goPrev}
          onNext={goNext}
          onFinish={() => navigate(`/cases/${caseId}`)}
          language={language}
        />
      )}
    </div>
  );
}
