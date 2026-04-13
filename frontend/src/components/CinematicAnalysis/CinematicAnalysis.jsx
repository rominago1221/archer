import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAnalysisStream } from './hooks/useAnalysisStream';
import Scene00_Opening from './scenes/Scene00_Opening';
import Scene01_Reading from './scenes/Scene01_Reading';
import Scene02_Verification from './scenes/Scene02_Verification';
import './styles/animations.css';

function ScenePlaceholder({ num, label, data }) {
  return (
    <div data-testid={`scene-${String(num).padStart(2, '0')}-placeholder`} style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        padding: '8px 18px', background: '#eff6ff', borderRadius: 30,
        fontSize: 11, fontWeight: 800, color: '#1a56db', letterSpacing: '1px',
      }}>
        SCÈNE {String(num).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#0a0a0f', letterSpacing: -1.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#9ca3af', maxWidth: 400, textAlign: 'center' }}>
        Cette scène sera implémentée dans le prochain sprint.
        Les données sont déjà disponibles via le stream SSE.
      </div>
      {data && (
        <div style={{
          marginTop: 16, padding: 16, background: '#fff', border: '0.5px solid #e2e0db',
          borderRadius: 12, maxWidth: 500, width: '100%', fontSize: 11, color: '#555',
          fontFamily: '"SF Mono", Monaco, monospace', maxHeight: 200, overflow: 'auto',
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(data, null, 2).slice(0, 500)}...
          </pre>
        </div>
      )}
    </div>
  );
}

export default function CinematicAnalysis() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const language = user?.language || (user?.jurisdiction === 'BE' ? 'fr' : 'en');
  const { currentScene, data, isComplete, error } = useAnalysisStream(caseId);

  // If already analyzed, redirect directly
  if (data.already_complete && isComplete) {
    navigate(`/cases/${caseId}`, { replace: true });
    return null;
  }

  // When complete, allow user to proceed to case detail
  const handleGoToDashboard = () => {
    navigate(`/cases/${caseId}`);
  };

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafaf8', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c' }}>Erreur d'analyse</div>
        <div style={{ fontSize: 14, color: '#555' }}>{error}</div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '12px 24px', borderRadius: 30, background: '#1a56db', color: '#fff',
            border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retour au dashboard
        </button>
      </div>
    );
  }

  const scenes = [
    <Scene00_Opening key={0} data={data} />,
    <Scene01_Reading key={1} data={data} language={language} />,
    <Scene02_Verification key={2} data={data} language={language} />,
    <ScenePlaceholder key={3} num={3} label="Le Score se Révèle" data={data.score_ready} />,
    <ScenePlaceholder key={4} num={4} label="Les Findings" data={data.findings_ready} />,
    <ScenePlaceholder key={5} num={5} label="La Joute" data={data.battle_ready} />,
    <ScenePlaceholder key={6} num={6} label="Ton Plan" data={data.strategy_ready} />,
  ];

  // Scene 07: Landing — redirect to case detail
  if (currentScene >= 7 && isComplete) {
    return (
      <div data-testid="scene-07-placeholder" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafaf8', flexDirection: 'column', gap: 20,
      }}>
        <div style={{
          padding: '8px 18px', background: '#dcfce7', borderRadius: 30,
          fontSize: 11, fontWeight: 800, color: '#15803d', letterSpacing: '1px',
        }}>
          ANALYSE TERMINÉE
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#0a0a0f', letterSpacing: -1.5 }}>
          {language?.startsWith('fr') ? 'Votre dossier est prêt.' : 'Your case is ready.'}
        </div>
        <button
          data-testid="go-to-dashboard-btn"
          onClick={handleGoToDashboard}
          style={{
            padding: '16px 32px', borderRadius: 30, background: '#1a56db', color: '#fff',
            border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(26,86,219,0.25)', transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {language?.startsWith('fr') ? 'Voir mon dossier' : 'View my case'}
        </button>
      </div>
    );
  }

  return (
    <div data-testid="cinematic-analysis" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Progress indicator */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 3, background: '#e2e0db',
      }}>
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

      {/* Current scene */}
      <div style={{
        animation: 'fadeIn 0.4s ease',
      }}>
        {scenes[Math.min(currentScene, scenes.length - 1)]}
      </div>
    </div>
  );
}
