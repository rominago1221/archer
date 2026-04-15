import React, { useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Client CTA to request a Live Counsel. Drop into the client case-detail page.
 * Hides itself when the case already has a live counsel in progress.
 *
 * Props:
 *   - caseId: string
 *   - hasExistingLiveCounsel?: boolean (hide if true)
 *   - language?: "fr" | "en"
 */
const COPY = {
  en: {
    title: 'Need to talk to a lawyer directly?',
    body: '30-minute video consultation with a partner attorney specialized in your case.',
    price: '€149 · 30 min',
    cta: 'Request consultation →',
    loading: '...',
    no_attorney: 'No attorney is currently available for this type of case. Please try again later.',
    error: 'Something went wrong. Please try again.',
  },
  fr: {
    title: 'Besoin de parler à un avocat en direct ?',
    body: 'Consultation vidéo de 30 min avec un avocat partenaire spécialisé dans votre cas.',
    price: '€149 · 30 min',
    cta: 'Demander une consultation →',
    loading: '...',
    no_attorney: "Aucun avocat n'est actuellement disponible pour ce type de dossier. Réessayez plus tard.",
    error: "Une erreur est survenue. Réessayez.",
  },
};

export default function LiveCounselCTA({ caseId, hasExistingLiveCounsel, language = 'fr' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const t = COPY[language] || COPY.en;

  if (hasExistingLiveCounsel) return null;

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(
        `${API}/cases/${caseId}/checkout/live-counsel`,
        { service_type: 'live_counsel' },
        { withCredentials: true },
      );
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (e) {
      const detail = e.response?.data?.detail || '';
      if (detail.includes('NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL')) {
        setError(t.no_attorney);
      } else {
        setError(t.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1a56db 100%)',
        color: 'white',
        borderRadius: 12,
        padding: 24,
        marginTop: 24,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
      <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 12 }}>{t.body}</div>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, opacity: 0.95 }}>
        {t.price}
      </div>
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(252,165,165,0.5)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          background: 'white',
          color: '#1a56db',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 500,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? t.loading : t.cta}
      </button>
    </div>
  );
}
