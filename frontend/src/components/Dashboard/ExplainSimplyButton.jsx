import React, { useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Props:
//   caseId: string
//   caseDoc: case object (for cached simple_explanation)
//   language: 'fr' | 'en'
//   variant: 'gold' (default, legacy standalone) | 'ghost' (compact, fits the V3 quickbar)
export default function ExplainSimplyButton({ caseId, caseDoc, language = 'fr', variant = 'gold' }) {
  const [showModal, setShowModal] = useState(false);
  const [explanation, setExplanation] = useState(caseDoc?.simple_explanation || null);
  const [loading, setLoading] = useState(false);

  const generate = async (regenerate = false) => {
    if (!regenerate && explanation) {
      setShowModal(true);
      return;
    }
    setShowModal(true);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/cases/${caseId}/explain-simply`, {
        regenerate,
      }, { withCredentials: true });
      setExplanation(res.data.explanation);
    } catch (err) {
      setExplanation(language === 'fr'
        ? 'Archer n\'a pas pu g\u00e9n\u00e9rer la version simplifi\u00e9e. R\u00e9essayez.'
        : 'Archer could not generate the simple version. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't show if no analysis yet
  if (!caseDoc?.ai_summary && !(caseDoc?.ai_findings?.length > 0)) return null;

  const isGhost = variant === 'ghost';
  const wrapperStyle = isGhost
    ? { display: 'inline-flex' }
    : { marginBottom: 16, display: 'flex', justifyContent: 'flex-end' };
  const btnStyle = isGhost
    ? null  // quickbar styles via .quick-btn CSS class
    : {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        color: '#92400e',
        border: '1px solid #fcd34d',
        padding: '8px 18px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
      };

  return (
    <>
      <div style={wrapperStyle}>
        <button
          type="button"
          data-testid="explain-simply-btn"
          onClick={() => generate(false)}
          className={isGhost ? 'quick-btn' : undefined}
          style={btnStyle || undefined}
          onMouseEnter={isGhost ? undefined : e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(252,211,77,0.4)'; }}
          onMouseLeave={isGhost ? undefined : e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          {isGhost && (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          {language === 'fr' ? 'Explique-moi simplement' : 'Explain simply'}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          data-testid="explain-simply-overlay"
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10,10,15,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: 18,
              maxWidth: 600, width: '100%',
              padding: '32px 36px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
              position: 'relative',
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 32, height: 32, background: '#f4f4f1', border: 'none',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#6b7280', cursor: 'pointer', fontSize: 16,
              }}
            >
              {'\u2715'}
            </button>

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#b45309', letterSpacing: 1.5, marginBottom: 6 }}>
                {language === 'fr' ? 'VERSION SIMPLE' : 'SIMPLE VERSION'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.5 }}>
                {language === 'fr' ? 'Votre dossier, en clair' : 'Your case, in plain terms'}
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>
                  {'\u2728'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#b45309' }}>
                  {language === 'fr' ? 'Archer reformule pour vous...' : 'Archer is simplifying for you...'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {language === 'fr' ? '15-30 secondes' : '15-30 seconds'}
                </div>
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
              </div>
            ) : (
              <>
                <div
                  data-testid="simple-explanation-text"
                  style={{
                    fontSize: 16, lineHeight: 1.7, color: '#0a0a0f',
                    whiteSpace: 'pre-wrap',
                    fontFamily: '-apple-system, system-ui, sans-serif',
                  }}
                >
                  {explanation}
                </div>

                {/* Footer actions */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 24, paddingTop: 16,
                  borderTop: '0.5px solid #f4f4f1',
                }}>
                  <button
                    type="button"
                    onClick={() => generate(true)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, color: '#6b7280',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {'\ud83d\udd04'} {language === 'fr' ? 'Re-g\u00e9n\u00e9rer' : 'Re-generate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '8px 20px', background: '#1a56db', color: '#fff',
                      border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'fr' ? 'Retour \u00e0 l\'analyse' : 'Back to analysis'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
