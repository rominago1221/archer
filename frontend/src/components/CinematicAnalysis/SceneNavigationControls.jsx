import React from 'react';

/**
 * Bug 6 — Manual nav for scenes 3+ (Verdict, Findings, Battle, Strategy, Landing).
 *
 * Bottom-fixed bar with:
 *   - Prev arrow (disabled on first manual scene)
 *   - Step indicator "Étape X sur Y"
 *   - Next arrow (turns into "See dashboard →" on the last scene)
 *
 * Keyboard arrow nav is wired in CinematicAnalysis.jsx itself.
 */
export default function SceneNavigationControls({
  currentIndex, totalScenes, firstManualScene,
  onPrev, onNext, onFinish, language = 'en',
}) {
  const isFr = (language || '').startsWith('fr');
  const isFirst = currentIndex <= firstManualScene;
  const isLast = currentIndex >= totalScenes - 1;
  // Display: step X of Y in the manual block (e.g., 1 of 5 when 5 manual scenes)
  const displayStep = currentIndex - firstManualScene + 1;
  const displayTotal = totalScenes - firstManualScene;

  const stepLabel = isFr
    ? `Étape ${displayStep} sur ${displayTotal}`
    : `Step ${displayStep} of ${displayTotal}`;

  const prevLabel = isFr ? '← Précédent' : '← Previous';
  const nextLabel = isFr ? 'Suivant →' : 'Next →';
  const finishLabel = isFr ? 'Voir mon dashboard complet →' : 'See full dashboard →';

  return (
    <div
      role="navigation"
      aria-label="Cinematic scene navigation"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.96)',
        border: '0.5px solid #e2e0db',
        borderRadius: 999,
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirst}
        aria-label={prevLabel}
        style={{
          background: 'transparent',
          border: 'none',
          color: isFirst ? '#cbd5e1' : '#6b7280',
          fontSize: 14,
          fontWeight: 500,
          cursor: isFirst ? 'not-allowed' : 'pointer',
          padding: '6px 10px',
        }}
      >
        {prevLabel}
      </button>

      <span
        aria-live="polite"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#9ca3af',
          letterSpacing: '0.5px',
          fontFamily: '"SF Mono", Monaco, monospace',
          minWidth: 100,
          textAlign: 'center',
        }}
      >
        {stepLabel}
      </span>

      {isLast ? (
        <button
          type="button"
          onClick={onFinish}
          style={{
            background: '#1a56db',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {finishLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          aria-label={nextLabel}
          style={{
            background: '#1a56db',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
