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
import BattleSection from '../components/Dashboard/Sprint2/BattleSection';
import FindingsSection from '../components/Dashboard/Sprint2/FindingsSection';
import DocumentsSection from '../components/Dashboard/Sprint2/DocumentsSection';
import AttorneyStatusBanner from '../components/AttorneyStatusBanner';
import JurisdictionMismatchBanner from '../components/JurisdictionMismatchBanner';
import RefineAnalysisSection from '../components/RefineAnalysisSection';
import VersionPicker from '../components/VersionPicker';
import AdversarialCounterArgsSection from '../components/AdversarialCounterArgsSection';
import LiveCounselCTA from '../components/LiveCounselCTA';
import LiveCounselBookingFlow from '../components/LiveCounselBookingFlow';
import ScoreHistoryGraph from '../components/Dashboard/Sprint2/ScoreHistoryGraph';
import ArcherQuestionsSection from '../components/Dashboard/Sprint2/ArcherQuestionsSection';
import LegalNewsSection from '../components/Dashboard/Sprint3/LegalNewsSection';
import SimilarCasesSection from '../components/Dashboard/Sprint3/SimilarCasesSection';
import AskArcherCompact from '../components/Dashboard/Sprint3/AskArcherCompact';
import ExplainSimplyButton from '../components/Dashboard/ExplainSimplyButton';
import { deriveProgressStep } from '../utils/dashboard/progressStep';
import { deriveStrategy } from '../utils/dashboard/strategyFallback';
import { deriveBattle } from '../utils/dashboard/battle';
import { deriveFindings } from '../utils/dashboard/findings';
import { deriveScoreHistory } from '../utils/dashboard/scoreHistory';
import { deriveArcherQuestions } from '../utils/dashboard/archerQuestions';
import { deriveFreemiumExhausted } from '../utils/dashboard/documents';
import { mapBackendCaseType } from '../utils/dashboard/caseType';
import { getOpponentLabel } from '../utils/dashboard/opponent';
import { deriveLegalNews } from '../utils/dashboard/legalNews';
import { deriveSimilarCases } from '../utils/dashboard/similarCases';

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
  const [letterGenerating, setLetterGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  // Refinement versioning — null means "view the live current version".
  const [viewingVersion, setViewingVersion] = useState(null);
  const [viewedAnalysis, setViewedAnalysis] = useState(null);

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

  const handleChoiceSelect = async (choice) => {
    setPopupOpen(false);
    if (choice === 'basic') {
      // DIY letter: generate via AI and show inline
      setLetterGenerating(true);
      try {
        const step = caseDoc?.ai_next_steps?.[0] || {};
        const res = await axios.post(`${API}/cases/${caseId}/generate-action-letter`, {
          action_title: step.title || caseDoc?.title || '',
          action_description: step.description || '',
          tone: 'citizen',
        }, { withCredentials: true });
        setGeneratedLetter(res.data);
      } catch (err) {
        console.error('Letter generation error:', err);
        setGeneratedLetter({ error: err?.response?.data?.detail || 'Letter generation failed' });
      } finally {
        setLetterGenerating(false);
      }
    } else if (choice === 'signed') {
      // Attorney-signed letter: Stripe checkout
      try {
        const res = await axios.post(`${API}/cases/${caseId}/checkout/attorney-letter`, {}, { withCredentials: true });
        if (res.data?.checkout_url) {
          window.location.href = res.data.checkout_url;
        }
      } catch (err) {
        console.error('Checkout error:', err);
        alert(err?.response?.data?.detail || 'Checkout failed');
      }
    } else if (choice === 'combo') {
      // Combo: Live Counsel checkout
      try {
        const res = await axios.post(`${API}/cases/${caseId}/checkout/live-counsel`, {
          service_type: 'live_counsel',
        }, { withCredentials: true });
        if (res.data?.checkout_url) {
          window.location.href = res.data.checkout_url;
        }
      } catch (err) {
        console.error('Combo checkout error:', err);
        alert(err?.response?.data?.detail || 'Checkout failed');
      }
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

  // When viewing a historical version, merge the snapshot over the live case so
  // every downstream section renders against the older analysis. When viewingVersion
  // is null we render the live case as-is.
  const displayedCase = (viewedAnalysis && viewingVersion)
    ? { ...caseDoc, ...viewedAnalysis }
    : caseDoc;

  const progressStep = deriveProgressStep(displayedCase, letters);
  const strategy = deriveStrategy(displayedCase, t, language);
  const documentCount = caseDoc.document_count ?? documents.length ?? 0;

  // Sprint 2 derivations
  const caseTypeV7 = mapBackendCaseType(displayedCase.type);
  const opponentLabel = getOpponentLabel(caseTypeV7, country, language);
  const battle = deriveBattle(displayedCase);
  const { critical: criticalFindings, strong: strongFindings } = deriveFindings(displayedCase);
  const scoreHistory = deriveScoreHistory(caseDoc, language); // always live — score_history is a timeline, not versioned
  const archerQuestions = deriveArcherQuestions(displayedCase, caseTypeV7, language);
  const freemiumExhausted = deriveFreemiumExhausted(user, documents);

  // Sprint 3 derivations
  const legalNews = deriveLegalNews(caseDoc, caseTypeV7, language);
  const similarCases = deriveSimilarCases(caseTypeV7);

  const handleAskArcher = (question) => {
    // TODO(sprint-plumbing): post to chat endpoint. For now, jump to the chat
    // page with the question prefilled via query param.
    const q = encodeURIComponent(question);
    navigate(`/chat?q=${q}&case_id=${caseId}`);
  };

  const handleAnswerQuestion = async (payload) => {
    setAnswerLoading(true);
    setAnswerFeedback(null);
    try {
      const res = await axios.post(`${API}/cases/${caseId}/archer-answer`, {
        question: payload.question_text,
        answer: payload.choice_selected,
      }, { withCredentials: true });
      setAnswerFeedback({
        impact: res.data.impact_summary,
        oldScore: res.data.old_risk_score,
        newScore: res.data.new_risk_score,
        hasMore: !!res.data.next_question,
      });
      // Refresh case data to get new questions/score
      setTimeout(() => fetchCase(), 1000);
    } catch (err) {
      console.error('Archer answer error:', err);
      setAnswerFeedback({ error: true });
    } finally {
      setAnswerLoading(false);
    }
  };
  const handleAddDocument = () => {
    navigate('/upload');
  };
  const handleUpgrade = () => {
    // TODO(sprint-plumbing): redirect to Stripe / pricing flow
    console.log('[stub] upgrade flow for case', caseId);
  };

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
        <VersionPicker
          caseId={caseId}
          currentVersion={caseDoc.current_analysis_version || 1}
          viewingVersion={viewingVersion}
          language={language}
          onChangeVersion={(version, analysisSnapshot) => {
            if (!analysisSnapshot) {
              setViewingVersion(null);
              setViewedAnalysis(null);
            } else {
              setViewingVersion(version);
              setViewedAnalysis(analysisSnapshot);
            }
          }}
        />

        <CaseHeader
          caseDoc={displayedCase}
          country={country}
          language={language}
          documentCount={documentCount}
        />

        <JurisdictionMismatchBanner
          caseDoc={caseDoc}
          language={language}
          onUpdated={(updated) => {
            setCaseDoc(updated);
            // Always refetch to pick up any derived fields the endpoint didn't echo.
            fetchCase();
          }}
        />

        {/* Feature 3 — Explain Simply button */}
        <ExplainSimplyButton caseId={caseId} caseDoc={caseDoc} language={language} />

        <AttorneyStatusBanner status={caseDoc?.attorney_status} language={language} />

        {/* Sprint E — Live Counsel: booking flow if paid, else CTA */}
        {caseDoc?.payment_status === 'paid' && caseDoc?.live_counsel_active ? (
          <LiveCounselBookingFlow caseId={caseId} language={language} />
        ) : (
          <LiveCounselCTA
            caseId={caseId}
            hasExistingLiveCounsel={!!caseDoc?.live_counsel_active}
            language={language}
          />
        )}

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

        {/* Generated letter display */}
        {letterGenerating && (
          <div data-testid="letter-generating" style={{
            background: '#eff6ff', borderRadius: 14, padding: 24, marginBottom: 20,
            border: '1px solid #bfdbfe', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>
              {language === 'fr' ? 'Archer rédige votre lettre...' : 'Archer is drafting your letter...'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {language === 'fr' ? 'Cela prend 15-30 secondes.' : 'This takes 15-30 seconds.'}
            </div>
          </div>
        )}
        {generatedLetter && !letterGenerating && (
          <div data-testid="generated-letter" style={{
            background: '#ffffff', borderRadius: 14, padding: 24, marginBottom: 20,
            border: '1px solid #e2e0db', position: 'relative',
          }}>
            <button
              onClick={() => setGeneratedLetter(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: '#f4f4f1', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 14 }}
            >
              ✕
            </button>
            {generatedLetter.error ? (
              <div style={{ color: '#dc2626', fontSize: 13 }}>{generatedLetter.error}</div>
            ) : (
              <>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#1a56db', letterSpacing: 1, marginBottom: 8 }}>
                  {language === 'fr' ? 'LETTRE GÉNÉRÉE' : 'GENERATED LETTER'}
                </div>
                {generatedLetter.subject && (
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0f', marginBottom: 12 }}>{generatedLetter.subject}</div>
                )}
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
                  {generatedLetter.body}
                </div>
                {generatedLetter.legal_citations?.length > 0 && (
                  <div style={{ fontSize: 11, color: '#6b7280', borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                    <strong>{language === 'fr' ? 'Références :' : 'References:'}</strong> {generatedLetter.legal_citations.join(' · ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    onClick={() => {
                      const blob = new Blob([generatedLetter.body], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'lettre-archer.txt'; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ padding: '8px 16px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {language === 'fr' ? 'Télécharger' : 'Download'}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedLetter.body); }}
                    style={{ padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #e2e0db', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {language === 'fr' ? 'Copier' : 'Copy'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Sprint 2 sections ──────────────────────────────────────── */}
        <BattleSection
          battle={battle}
          opponentLabel={opponentLabel}
          language={language}
        />

        <AdversarialCounterArgsSection
          adversarial={displayedCase?.adversarial_attack}
          language={language}
        />

        <FindingsSection
          type="critical"
          findings={criticalFindings}
          country={country}
          language={language}
        />

        <FindingsSection
          type="strong"
          findings={strongFindings}
          country={country}
          language={language}
        />

        <DocumentsSection
          documents={documents}
          isFreemiumExhausted={freemiumExhausted}
          onAddDocument={handleAddDocument}
          onUpgrade={handleUpgrade}
          language={language}
        />

        <ScoreHistoryGraph
          scoreHistory={scoreHistory}
          language={language}
        />

        {/* Answer feedback toast */}
        {answerFeedback && !answerFeedback.error && (
          <div data-testid="answer-feedback" style={{
            background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)',
            border: '1px solid #86efac', borderRadius: 12,
            padding: '16px 20px', marginBottom: 16,
            animation: 'battleFadeIn 0.3s ease-out',
          }}>
            <style>{`@keyframes battleFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>
              {language === 'fr' ? 'Analyse mise à jour' : 'Analysis updated'}
            </div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 8 }}>
              {answerFeedback.impact}
            </div>
            {answerFeedback.oldScore !== answerFeedback.newScore && (
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                Risk score: {answerFeedback.oldScore} → <strong style={{ color: answerFeedback.newScore > answerFeedback.oldScore ? '#dc2626' : '#16a34a' }}>{answerFeedback.newScore}</strong>
              </div>
            )}
            {answerFeedback.hasMore && (
              <div style={{ fontSize: 11, color: '#1a56db', fontWeight: 600, marginTop: 8 }}>
                {language === 'fr' ? 'Nouvelles questions ci-dessous...' : 'New questions below...'}
              </div>
            )}
          </div>
        )}

        {answerLoading && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
            padding: '16px 20px', marginBottom: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
              {language === 'fr' ? 'Archer affine l\'analyse...' : 'Archer is refining the analysis...'}
            </div>
          </div>
        )}

        <ArcherQuestionsSection
          questions={archerQuestions}
          onAnswer={handleAnswerQuestion}
          language={language}
        />

        {/* ── Sprint 3 sections ──────────────────────────────────────── */}
        <LegalNewsSection news={legalNews} language={language} />

        <SimilarCasesSection
          caseId={caseId}
          stats={similarCases}
          country={country}
          language={language}
        />

        <AskArcherCompact onSubmit={handleAskArcher} language={language} />

        {/* Refine-analysis section — post-analysis free-text input, versioned */}
        <RefineAnalysisSection
          caseDoc={caseDoc}
          language={language}
          onRefined={() => {
            // After a successful refine, drop back to the live view and re-fetch.
            setViewingVersion(null);
            setViewedAnalysis(null);
            fetchCase();
          }}
        />
      </div>
    </div>
  );
}
