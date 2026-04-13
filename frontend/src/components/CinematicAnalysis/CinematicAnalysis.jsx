import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import './styles/animations.css';

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

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafaf8', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c' }}>
          {language?.startsWith('fr') ? 'Erreur d\'analyse' : 'Analysis Error'}
        </div>
        <div style={{ fontSize: 14, color: '#555' }}>{error}</div>
        <button
          onClick={() => navigate('/dashboard')}
          data-testid="error-back-btn"
          style={{ padding: '12px 24px', borderRadius: 30, background: '#1a56db', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          {language?.startsWith('fr') ? 'Retour au dashboard' : 'Back to dashboard'}
        </button>
      </div>
    );
  }

  const scenes = [
    <Scene00_Opening key={0} data={data} />,
    <Scene01_Reading key={1} data={data} language={language} />,
    <Scene02_Verification key={2} data={data} language={language} />,
    <Scene03_Verdict key={3} data={data} language={language} />,
    <Scene04_Findings key={4} data={data} language={language} />,
    <Scene05_Battle key={5} data={data} language={language} />,
    <Scene06_Strategy key={6} data={data} language={language} />,
    <Scene07_Landing key={7} data={data} language={language} caseId={caseId} />,
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

      {/* Current scene */}
      <div key={currentScene} style={{ animation: 'fadeIn 0.4s ease' }}>
        {scenes[Math.min(currentScene, scenes.length - 1)]}
      </div>
    </div>
  );
}
