import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Shown on the client case-detail page after a successful Stripe checkout
 * for Live Counsel. Polls /booking-info until the assignment exists, then
 * embeds the Calendly iframe (with fallback open-in-new-tab).
 *
 * If the case already has `scheduled_at`, shows the "Join call" button flow
 * instead.
 */
const COPY = {
  en: {
    waiting: 'Finding the right attorney for you...',
    attorney_assigned: '{{attorney}} has been assigned to your case. Pick a time slot:',
    fallback: 'Iframe blocked? Open booking in a new tab',
    already_booked: 'Your consultation is scheduled for {{time}}.',
    join: 'Join the video call →',
    too_early: 'The call will be available 15 minutes before start.',
  },
  fr: {
    waiting: 'Nous trouvons le meilleur avocat pour vous...',
    attorney_assigned: 'Maître {{attorney}} a été assigné(e) à votre dossier. Choisissez un créneau :',
    fallback: "L'iframe ne s'affiche pas ? Ouvrir dans un nouvel onglet",
    already_booked: 'Votre consultation est programmée le {{time}}.',
    join: 'Rejoindre la consultation →',
    too_early: 'Le bouton de connexion sera actif 15 min avant le début.',
  },
};

function _replace(s, k, v) { return s.replace(k, v); }

export default function LiveCounselBookingFlow({ caseId, language = 'fr' }) {
  const t = COPY[language] || COPY.en;
  const [info, setInfo] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const pollRef = useRef(null);

  const fetchInfo = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${API}/cases/${caseId}/live-counsel/booking-info`,
        { withCredentials: true },
      );
      setInfo(data);
      if (data?.ready && data.scheduled_at) {
        // Already booked — stop polling
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (e) {
      // 404 or other; keep polling silently a few times
    }
  }, [caseId]);

  useEffect(() => {
    fetchInfo();
    pollRef.current = setInterval(fetchInfo, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchInfo]);

  const handleJoin = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      const { data } = await axios.post(
        `${API}/cases/${caseId}/live-counsel/join`,
        {},
        { withCredentials: true },
      );
      const url = `${data.room_url}?t=${encodeURIComponent(data.meeting_token)}&userName=${encodeURIComponent(data.user_name)}`;
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setJoinError(e.response?.data?.detail || 'Could not join.');
    } finally {
      setJoining(false);
    }
  };

  // --- Still waiting for webhook to create assignment
  if (!info || !info.ready) {
    return (
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 12, padding: 20, marginTop: 16,
        color: '#1e3a8a',
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          🔍 {t.waiting}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          (Cela peut prendre quelques secondes après le paiement.)
        </div>
      </div>
    );
  }

  const attorneyName = `${info.attorney?.first_name || ''} ${info.attorney?.last_name || ''}`.trim();

  // --- Already booked → show join button
  if (info.scheduled_at) {
    const scheduled = new Date(info.scheduled_at);
    const now = new Date();
    const diffMs = scheduled - now;
    const joinable = diffMs <= 15 * 60 * 1000 && diffMs >= -60 * 60 * 1000;
    const pretty = scheduled.toLocaleString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    });
    return (
      <div style={{
        background: '#f0fdf4', border: '1px solid #86efac',
        borderRadius: 12, padding: 20, marginTop: 16,
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#166534', marginBottom: 8 }}>
          ✓ {_replace(t.already_booked, '{{time}}', pretty)}
        </div>
        {joinable ? (
          <button
            type="button" onClick={handleJoin} disabled={joining}
            style={{
              background: '#16a34a', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 20px', fontSize: 14,
              fontWeight: 500, cursor: joining ? 'wait' : 'pointer',
              marginTop: 8,
            }}
          >
            {joining ? '...' : `🎥 ${t.join}`}
          </button>
        ) : (
          <div style={{ fontSize: 13, color: '#166534', opacity: 0.8, marginTop: 4 }}>
            {t.too_early}
          </div>
        )}
        {joinError && (
          <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 8 }}>{joinError}</div>
        )}
      </div>
    );
  }

  // --- Assignment ready but not yet booked → show Calendly iframe
  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb',
      borderRadius: 12, padding: 20, marginTop: 16,
    }}>
      <div style={{ fontSize: 15, marginBottom: 12, color: '#111827' }}>
        {_replace(t.attorney_assigned, '{{attorney}}', attorneyName || '—')}
      </div>
      <iframe
        src={info.calendly_booking_url}
        width="100%"
        height="700"
        frameBorder="0"
        title="Calendly booking"
        style={{ border: 'none', borderRadius: 8 }}
      />
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <a
          href={info.calendly_booking_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#1a56db', textDecoration: 'underline' }}
        >
          {t.fallback}
        </a>
      </div>
    </div>
  );
}
