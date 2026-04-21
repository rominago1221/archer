import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Video, Gift, Loader2, Phone } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Colors cycled through when rendering avatar fallbacks. Keeps the rail
// looking alive even when all we have is initials.
const AVATAR_BG = ['#1a56db', '#a855f7', '#16a34a'];

// Demo attorney avatars used when the backend returns zero live
// attorneys (fresh install, DB not seeded, is_live flag never flipped).
// Matches the mockup visual — three professional portraits from the
// design-system asset pool (already used on /attorneys).
const DEMO_ATTORNEYS = [
  {
    id: 'demo-pd',
    initials: 'PD',
    photo_url: 'https://images.unsplash.com/photo-1585240975858-7264fd020798?w=96&h=96&q=80&auto=format&fit=crop',
  },
  {
    id: 'demo-ml',
    initials: 'ML',
    photo_url: 'https://images.unsplash.com/photo-1644268756851-3f69ffb9553f?w=96&h=96&q=80&auto=format&fit=crop',
  },
  {
    id: 'demo-sa',
    initials: 'SA',
    photo_url: 'https://images.unsplash.com/photo-1685760259914-ee8d2c92d2e0?w=96&h=96&q=80&auto=format&fit=crop',
  },
];

// Rail CTA card. Marketing-style panel above the rest of the rail.
// Clicking the CTA opens the Live Counsel Stripe checkout directly —
// the legacy LiveCounselCTA banner was removed from the header zone, so
// this is now the canonical pre-purchase entry point.
// Falls back to /lawyers on any error.
export default function LawyerRailCTA({ caseId, t }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [liveList, setLiveList] = useState({ total: 0, attorneys: [] });

  // Fetch the live attorney snapshot on mount. Fail silent — the card
  // falls back to the static 3-avatar demo set if the endpoint 404s
  // (backend rollout in progress on Emergent preview, etc.).
  useEffect(() => {
    let alive = true;
    axios.get(`${API}/attorneys/live?limit=6`, { withCredentials: true })
      .then((res) => { if (alive) setLiveList(res.data || { total: 0, attorneys: [] }); })
      .catch(() => { /* silent */ });
    return () => { alive = false; };
  }, []);

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
      <div className="rail-head">
        <div className="rail-head-icon"><Phone size={13} aria-hidden /></div>
        <div className="rail-head-title">Avocats</div>
        <span className="rail-head-aux">
          <span className="lawyer-live-dot" style={{ display: 'inline-block', marginRight: 5, verticalAlign: 'middle' }} />
          {t('v3.right_rail.lawyer.ready_count', { count: liveList.total || 8 })}
        </span>
      </div>

      <div className="lawyer-h">{t('v3.right_rail.lawyer.title')}</div>
      <div className="lawyer-p">{t('v3.right_rail.lawyer.desc')}</div>

      <div className="lawyer-avatars" aria-hidden>
        <div className="lawyer-avs">
          {(() => {
            // Use backend data when we have it, else the demo photo set.
            // Never ship placeholder initials as the primary visual —
            // that was the whole bug the user kept flagging.
            const source = (liveList.attorneys && liveList.attorneys.length > 0)
              ? liveList.attorneys
              : DEMO_ATTORNEYS;
            return source.slice(0, 3).map((a, i) => {
              const url = a.photo_url && a.photo_url.startsWith('http')
                ? a.photo_url
                : a.photo_url ? `${process.env.REACT_APP_BACKEND_URL || ''}${a.photo_url}` : null;
              if (url) {
                return (
                  <img
                    key={a.id || i}
                    className="lawyer-av"
                    src={url}
                    alt={a.initials || ''}
                    onError={(e) => {
                      // If the image fails, swap to a coloured initials span
                      const span = document.createElement('span');
                      span.className = 'lawyer-av';
                      span.style.background = AVATAR_BG[i % AVATAR_BG.length];
                      span.textContent = a.initials || '??';
                      e.currentTarget.replaceWith(span);
                    }}
                  />
                );
              }
              return (
                <span
                  key={a.id || i}
                  className="lawyer-av"
                  style={{ background: AVATAR_BG[i % AVATAR_BG.length] }}
                >
                  {a.initials || '??'}
                </span>
              );
            });
          })()}
        </div>
        <span className="lawyer-avs-txt">
          {t('v3.right_rail.lawyer.available', { count: liveList.total || 3 })}
        </span>
      </div>

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

      <div className="lawyer-members-note">
        {t('v3.right_rail.lawyer.members_note')}
        <Link to="/plans" data-testid="rail-lawyer-members-link">
          {t('v3.right_rail.lawyer.members_link')}
        </Link>
      </div>
    </div>
  );
}
