import React from 'react';
import { Video, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Rail CTA card. Marketing-style panel above the rest of the rail. Clicking
// the CTA jumps to the existing Live Counsel CTA that lives in the header
// zone — we don't duplicate the Stripe/Calendly flow here.
export default function LawyerRailCTA({ t }) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Scroll to the top-of-page LiveCounselCTA so the user lands on the real
    // booking flow. Fallback: navigate to /lawyers.
    const el = document.querySelector('[data-testid="live-counsel-cta"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    navigate('/lawyers');
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

      <button type="button" className="lawyer-cta-btn" onClick={handleClick} data-testid="rail-lawyer-cta-btn">
        <Video size={13} aria-hidden /> {t('v3.right_rail.lawyer.cta')}
      </button>
    </div>
  );
}
