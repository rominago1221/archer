import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useUiLanguage } from '../hooks/useUiLanguage';
import { useDashboardT } from '../hooks/useDashboardT';
import CaseHeader from '../components/Dashboard/Sprint1/CaseHeader';
import ProgressTimeline from '../components/Dashboard/Sprint1/ProgressTimeline';
import HeroSection from '../components/Dashboard/Sprint1/HeroSection';
import StrategySection from '../components/Dashboard/Sprint1/StrategySection';
import GenerateLetterCTA from '../components/Dashboard/Sprint1/GenerateLetterCTA';
import GenerateLetterPopup from '../components/Dashboard/Sprint1/GenerateLetterPopup';
import { deriveProgressStep } from '../utils/dashboard/progressStep';
import { deriveStrategy } from '../utils/dashboard/strategyFallback';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CaseDetailV7() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const country = user?.jurisdiction || 'BE';
  const language = useUiLanguage(country);
  const t = useDashboardT(language);

  const [caseDoc, setCaseDoc] = useState(null);
  const [letters, setLetters] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const fetchCase = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const [caseRes, lettersRes, docsRes] = await Promise.all([
        axios.get(`${API}/cases/${caseId}`, { withCredentials: true }),
        axios.get(`${API}/cases/${caseId}/letters`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API}/cases/${caseId}/documents`, { withCredentials: true }).catch(() => ({ data: [] })),
      ]);
      setCaseDoc(caseRes.data);
      setLetters(Array.isArray(lettersRes.data) ? lettersRes.data : (lettersRes.data?.letters || []));
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data?.documents || []));
    } catch (err) {
      console.error('CaseDetailV7 load error:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const handleChoiceSelect = (choice) => {
    setPopupOpen(false);
    if (choice === 'basic') {
      // TODO(sprint-paiement): generate letter client-side or via /letters/generate
      console.log('[stub] generate basic letter for case', caseId);
    } else if (choice === 'signed') {
      // TODO(sprint-paiement): Stripe checkout 49,99€ → signed letter workflow
      console.log('[stub] stripe checkout signed letter for case', caseId);
    } else if (choice === 'combo') {
      // TODO(sprint-paiement): Stripe checkout 198,99€ → signed + live counsel
      console.log('[stub] stripe checkout combo for case', caseId);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f1' }}>
        <div style={{ fontSize: 14, color: '#6b7280' }}>{t('common.loading')}</div>
      </div>
    );
  }

  if (error || !caseDoc) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#f4f4f1' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#b91c1c' }}>{t('common.error_title')}</div>
        <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 420, textAlign: 'center' }}>{error || 'not found'}</div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 18px', background: '#1a56db', color: '#ffffff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t('common.error_back')}
        </button>
      </div>
    );
  }

  const progressStep = deriveProgressStep(caseDoc, letters);
  const strategy = deriveStrategy(caseDoc, t);
  const documentCount = caseDoc.document_count ?? documents.length ?? 0;

  return (
    <div
      data-testid="case-detail-v7"
      style={{
        background: '#f4f4f1',
        minHeight: '100vh',
        padding: '32px 40px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <CaseHeader
          caseDoc={caseDoc}
          country={country}
          language={language}
          documentCount={documentCount}
        />

        <ProgressTimeline currentStep={progressStep} language={language} />

        <HeroSection caseDoc={caseDoc} country={country} language={language} />

        <StrategySection strategy={strategy} language={language} />

        <GenerateLetterCTA onClick={() => setPopupOpen(true)} language={language} />

        <GenerateLetterPopup
          isOpen={popupOpen}
          onClose={() => setPopupOpen(false)}
          onChoiceSelect={handleChoiceSelect}
          country={country}
          language={language}
        />
      </div>
    </div>
  );
}
