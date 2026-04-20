import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useUiLanguage } from '../hooks/useUiLanguage';
import { useDashboardT } from '../hooks/useDashboardT';
import V3CaseHeader from '../components/Dashboard/V3/V3CaseHeader';
import QuickBar from '../components/Dashboard/V3/QuickBar';
import V3RailDocuments from '../components/Dashboard/V3/V3RailDocuments';
import V3RailQuestions from '../components/Dashboard/V3/V3RailQuestions';
import V3RailSimilarCases from '../components/Dashboard/V3/V3RailSimilarCases';
import V3RailNews from '../components/Dashboard/V3/V3RailNews';
import V3RailChat from '../components/Dashboard/V3/V3RailChat';
import V3RailRefine from '../components/Dashboard/V3/V3RailRefine';
import AttorneyStatusBanner from '../components/AttorneyStatusBanner';
import JurisdictionMismatchBanner from '../components/JurisdictionMismatchBanner';
import VersionPicker from '../components/VersionPicker';
import { useCaseBehaviorTracking } from '../hooks/useBehaviorTracking';
import LiveCounselBookingFlow from '../components/LiveCounselBookingFlow';
import { deriveProgressStep } from '../utils/dashboard/progressStep';
import { deriveStrategy } from '../utils/dashboard/strategyFallback';
import { deriveBattle } from '../utils/dashboard/battle';
import { deriveFindings } from '../utils/dashboard/findings';
import { deriveArcherQuestions } from '../utils/dashboard/archerQuestions';
import { deriveFreemiumExhausted } from '../utils/dashboard/documents';
import { mapBackendCaseType } from '../utils/dashboard/caseType';
import { getOpponentLabel } from '../utils/dashboard/opponent';
import { deriveLegalNews } from '../utils/dashboard/legalNews';
import { deriveSimilarCases } from '../utils/dashboard/similarCases';
import TsCard from '../components/Dashboard/V3/TsCard';
import StrCard from '../components/Dashboard/V3/StrCard';
import AccordionItem from '../components/Dashboard/V3/AccordionItem';
import BattleBlock from '../components/Dashboard/V3/BattleBlock';
import ArmsStack from '../components/Dashboard/V3/ArmsStack';
import CritBox from '../components/Dashboard/V3/CritBox';
import AtkList from '../components/Dashboard/V3/AtkList';
import LawyerRailCTA from '../components/Dashboard/V3/LawyerRailCTA';
import { Swords, Sword, AlertTriangle, Target } from 'lucide-react';
import '../styles/dashboard-v3.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CaseDetailV7() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  // Act 3 accordions — Set of open ids. Closed by default in prod.
  const [openAccordions, setOpenAccordions] = useState(() => new Set());
  const ACCORDION_IDS = React.useMemo(() => ['battle', 'arms', 'critical', 'anticipation'], []);
  const toggleAccordion = (id) => setOpenAccordions((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allOpen = openAccordions.size === ACCORDION_IDS.length;
  const toggleAllAccordions = () => setOpenAccordions((prev) => {
    if (prev.size === ACCORDION_IDS.length) return new Set();
    return new Set(ACCORDION_IDS);
  });

  // Behavior tracking — fires analysis_viewed, time_spent heartbeat, case_abandoned,
  // and scrolled_to_bottom when the sentinel at the bottom of the page becomes visible.
  const { bottomSentinelRef, markInteracted, fire: trackFire } = useCaseBehaviorTracking(caseId);

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

  // Purchase tracking — Stripe redirects to /cases/:id?payment=success for attorney-letter and
  // live-counsel flows. Fire the right event once caseDoc is loaded, then strip the query param.
  const purchaseFiredRef = useRef(false);
  useEffect(() => {
    if (purchaseFiredRef.current) return;
    if (!caseDoc) return;
    if (searchParams.get('payment') !== 'success') return;
    purchaseFiredRef.current = true;
    // Live counsel wins when active — otherwise attribute the purchase to attorney letter.
    const isLiveCounsel = !!caseDoc?.live_counsel_active;
    trackFire(isLiveCounsel ? 'purchased_live_counsel' : 'purchased_attorney_letter', {
      plan: user?.plan || 'free',
    });
    markInteracted();
    // Remove the query param so a refresh doesn't double-fire.
    const next = new URLSearchParams(searchParams);
    next.delete('payment');
    setSearchParams(next, { replace: true });
  }, [caseDoc, searchParams, setSearchParams, trackFire, markInteracted, user]);

  const handleChoiceSelect = async (choice) => {
    setPopupOpen(false);
    markInteracted();
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
      trackFire('clicked_attorney_letter');
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
    }
    // NOTE: the 'combo' branch (Live Counsel) has been removed from this popup.
    // Live Counsel retains its own dedicated LiveCounselCTA rendered higher in the page.
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

  // Case jurisdiction wins over the user's default for everything that
  // resolves legal sources (.law-ref pills, findings, attack refs, etc.).
  // A BE user viewing a US case must see Cornell / Justia, not ejustice.
  const caseCountry = (displayedCase?.jurisdiction || displayedCase?.country || country || 'BE').toUpperCase();

  // Sprint 2 derivations
  const caseTypeV7 = mapBackendCaseType(displayedCase.type);
  const opponentLabel = getOpponentLabel(caseTypeV7, caseCountry, language);
  const battle = deriveBattle(displayedCase);
  const { critical: criticalFindings, strong: strongFindings } = deriveFindings(displayedCase);
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
    <div data-testid="case-detail-v7" className="dashboard-v3">
      <QuickBar
        caseId={caseId}
        caseDoc={displayedCase}
        language={language}
        t={t}
        currentVersion={caseDoc.current_analysis_version || 1}
        viewingVersion={viewingVersion}
        onOpenVersionPicker={() => {
          // The legacy VersionPicker is rendered below the QuickBar; scroll to it.
          const el = document.querySelector('[data-testid="version-picker"]');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      <V3CaseHeader
        caseDoc={displayedCase}
        country={country}
        language={language}
        documentCount={documentCount}
        letters={letters}
        userPlan={user?.plan}
        onLockClick={() => navigate('/plans')}
      />

      {/* Banners + paid Live Counsel flow — kept as flush-width blocks under the header.
          The standalone <VersionPicker> block was removed: the QuickBar already
          surfaces "V{N} LATEST", and the old pill below duplicated it. Users
          viewing a historical refinement version would see the pill both places
          before. Behaviour still works on the QuickBar's version-pill click
          (scroll target removed — it now just shows the version label). */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 32px 0' }}>
        <JurisdictionMismatchBanner
          caseDoc={caseDoc}
          language={language}
          onUpdated={(updated) => {
            setCaseDoc(updated);
            fetchCase();
          }}
        />

        <AttorneyStatusBanner status={caseDoc?.attorney_status} language={language} />

        {caseDoc?.payment_status === 'paid' && caseDoc?.live_counsel_active && (
          <LiveCounselBookingFlow caseId={caseId} language={language} />
        )}
      </div>

      {/* ═══════════ V3 BODY — 2 columns: main + right rail ═══════════ */}
      <div className="v3-body">
        <div className="v3-main">
          {/* ── ACT 1 · TA SITUATION ─────────────────────────────────── */}
          <div className="act-divider" data-testid="act1-divider">
            <div className="act-divider-num a1">01</div>
            <div className="act-divider-txt">
              <div className="act-divider-eyebrow">{t('v3.act1.eyebrow')}</div>
              <div className="act-divider-title">{t('v3.act1.title')}</div>
            </div>
            <div className="act-divider-rule" />
          </div>
          <TsCard caseDoc={displayedCase} t={t} />

          {/* ── ACT 2 · LA STRATÉGIE ─────────────────────────────────── */}
          <div className="act-divider" data-testid="act2-divider">
            <div className="act-divider-num a2">02</div>
            <div className="act-divider-txt">
              <div className="act-divider-eyebrow">{t('v3.act2.eyebrow')}</div>
              <div className="act-divider-title">{t('v3.act2.title')}</div>
            </div>
            <div className="act-divider-rule" />
          </div>
          <StrCard
            caseDoc={displayedCase}
            strategy={strategy}
            userPlan={user?.plan}
            language={language}
            t={t}
            onDiy={() => handleChoiceSelect('basic')}
            onAttorney={() => handleChoiceSelect('signed')}
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

          {/* ── ACT 3 · TOUT LE DÉTAIL ───────────────────────────────── */}
          <div className="act-divider" data-testid="act3-divider">
            <div className="act-divider-num a3">03</div>
            <div className="act-divider-txt">
              <div className="act-divider-eyebrow">{t('v3.act3.eyebrow')}</div>
              <div className="act-divider-title">{t('v3.act3.title')}</div>
            </div>
            <div className="act-divider-rule" />
            <button
              type="button"
              className="act-divider-expand"
              data-testid="act3-expand-all"
              onClick={toggleAllAccordions}
            >
              {allOpen ? t('v3.act3.collapse_all') : t('v3.act3.expand_all')}
            </button>
          </div>

          <div className="accordion-list">
            <AccordionItem
              id="battle"
              iconTone="blue"
              Icon={Swords}
              title={t('v3.act3.battle.title')}
              sub={t('v3.act3.battle.sub')}
              isOpen={openAccordions.has('battle')}
              onToggle={() => toggleAccordion('battle')}
            >
              <BattleBlock caseDoc={displayedCase} t={t} />
            </AccordionItem>

            <AccordionItem
              id="arms"
              iconTone="green"
              Icon={Sword}
              title={t('v3.act3.arms.title')}
              sub={t('v3.act3.arms.sub')}
              badgeTone="green"
              badgeText={t('v3.act3.arms.badge', { count: Math.min(5, strongFindings.length) })}
              isOpen={openAccordions.has('arms')}
              onToggle={() => toggleAccordion('arms')}
            >
              <ArmsStack findings={strongFindings} country={caseCountry} t={t} />
            </AccordionItem>

            <AccordionItem
              id="critical"
              iconTone="red"
              Icon={AlertTriangle}
              title={t('v3.act3.critical.title')}
              sub={criticalFindings[0]?.title || ''}
              badgeTone="red"
              badgeText={criticalFindings.length > 0 ? t('v3.act3.critical.badge') : null}
              isOpen={openAccordions.has('critical')}
              onToggle={() => toggleAccordion('critical')}
            >
              <CritBox findings={criticalFindings} country={caseCountry} t={t} />
            </AccordionItem>

            <AccordionItem
              id="anticipation"
              iconTone="amber"
              Icon={Target}
              title={t('v3.act3.anticipation.title')}
              sub={t('v3.act3.anticipation.sub')}
              badgeTone="amber"
              badgeText={t('v3.act3.anticipation.threat_mid')}
              isOpen={openAccordions.has('anticipation')}
              onToggle={() => toggleAccordion('anticipation')}
            >
              <AtkList caseDoc={displayedCase} language={language} country={caseCountry} t={t} />
            </AccordionItem>
          </div>

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

        {/* Bottom sentinel for scrolled_to_bottom tracking */}
        <div ref={bottomSentinelRef} data-testid="scroll-sentinel" style={{ height: 1 }} />
        </div>

        {/* ═══════════ RIGHT RAIL ═══════════ */}
        <aside className="v3-rail" data-testid="v3-rail">
          <LawyerRailCTA caseId={caseId} t={t} />

          <V3RailRefine
            caseDoc={caseDoc}
            language={language}
            onSubmitStart={() => { markInteracted(); trackFire('refinement_started'); }}
            onRefined={() => {
              setViewingVersion(null);
              setViewedAnalysis(null);
              fetchCase();
            }}
          />

          <V3RailDocuments
            documents={documents}
            onAddDocument={handleAddDocument}
            language={language}
            t={t}
          />

          <V3RailQuestions
            questions={archerQuestions}
            onAnswer={handleAnswerQuestion}
            language={language}
          />

          <V3RailSimilarCases
            stats={similarCases}
            country={caseCountry}
            language={language}
          />

          <V3RailNews news={legalNews} language={language} />

          <V3RailChat onSubmit={handleAskArcher} language={language} />
        </aside>
      </div>
    </div>
  );
}
