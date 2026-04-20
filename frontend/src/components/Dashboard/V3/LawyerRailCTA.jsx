import React, { useState } from 'react';
import axios from 'axios';
import { Video, Gift, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Rail CTA card. Marketing-style panel above the rest of the rail.
// Clicking the CTA opens the Live Counsel Stripe checkout directly —
// the legacy LiveCounselCTA banner was removed from the header zone, so
// this is now the canonical pre-purchase entry point.
// Falls back to /lawyers on any error.
export default function LawyerRailCTA({ caseId, t }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const handleClick = async () => {
    if (loading) return;
    if (!caseId) return navigate('/lawyers');
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.post(
        `${API}/cases/${caseId}/checkout/live-counsel`,
        {},
        { withCredentials: true },
      );
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }
      // No URL returned → fall back
      navigate('/lawyers');
    } catch (e) {
      const code = e?.response?.data?.code;
      if (code === 'NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL') {
        setErr(code);
      } else {
        navigate('/lawyers');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lawyer-cta-card" data-testid="rail-lawyer-cta">
      <div className="lawyer-live-row">
        <span className="lawyer-live-dot" />
        <span className="lawyer-live-txt">{t('v3.right_rail.lawyer.live_label')}</span>
        <span className="lawyer-online">{t('v3.right_rail.lawyer.ready_count', { count: 8 })}</span>
      </div>

      <div className="lawyer-h">{t('v3.right_rail.lawyer.title')}</div>
      <div className="lawyer-p">{t('v3.right_rail.lawyer.desc')}</div>

      <div className="lawyer-free-banner">
        <div className="lawyer-free-icon"><Gift size={11} aria-hidden /></div>
        <div className="lawyer-free-txt">
          <div className="lawyer-free-title">{t('v3.right_rail.lawyer.free_title')}</div>
          <div className="lawyer-free-sub">{t('v3.right_rail.lawyer.free_sub')}</div>
        </div>
      </div>

      <button
        type="button"
        className="lawyer-cta-btn"
        onClick={handleClick}
        disabled={loading}
        data-testid="rail-lawyer-cta-btn"
      >
        {loading
          ? <><Loader2 size={13} className="animate-spin" aria-hidden /> {t('v3.right_rail.lawyer.cta')}</>
          : <><Video size={13} aria-hidden /> {t('v3.right_rail.lawyer.cta')}</>}
      </button>

      {err === 'NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL' && (
        <div style={{
          marginTop: 10,
          fontSize: 11, color: 'var(--amber)',
          textAlign: 'center',
        }}>
          {/* TODO(i18n): add v3.right_rail.lawyer.no_attorney_error */}
          Aucun avocat disponible pour le moment.
        </div>
      )}
    </div>
  );
}
