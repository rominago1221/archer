import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

/**
 * Phase 2 — Prominent banner shown at the top of the client dashboard when
 * the most recent unread notification is `letter_ready`. Disappears after
 * the user clicks the CTA (which also marks it read) or the X.
 */
export default function LetterReadyBanner({ language = 'fr' }) {
  const isFr = (language || 'fr').startsWith('fr');
  const nav = useNavigate();
  const { firstUnread, markAsRead } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  const notif = firstUnread('letter_ready');
  if (!notif || dismissed) return null;

  const cta = isFr ? 'Voir et télécharger ma lettre →' : 'View and download my letter →';
  const heading = isFr ? '🎉 Votre lettre d\'avocat est prête !' : '🎉 Your attorney letter is ready!';

  const onCta = () => {
    markAsRead(notif.id);
    if (notif.action_url) nav(notif.action_url);
  };

  const onDismiss = () => {
    markAsRead(notif.id);
    setDismissed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: '#eff6ff',
        border: '1px solid #1a56db',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={isFr ? 'Fermer' : 'Dismiss'}
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'transparent', border: 'none',
          cursor: 'pointer', color: '#6b7280',
          fontSize: 18, lineHeight: 1, padding: 4,
        }}
      >
        ×
      </button>
      <div style={{ fontSize: 17, fontWeight: 600, color: '#1e3a8a', marginBottom: 8 }}>
        {heading}
      </div>
      <div style={{ fontSize: 14, color: '#1e40af', marginBottom: 16, paddingRight: 24 }}>
        {notif.message}
      </div>
      <button
        type="button"
        onClick={onCta}
        style={{
          background: '#1a56db', color: '#fff',
          border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 14, fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {cta}
      </button>
    </div>
  );
}
