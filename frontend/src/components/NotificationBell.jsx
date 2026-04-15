import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

function timeAgo(iso, isFr) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return isFr ? 'à l\'instant' : 'just now';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return isFr ? `il y a ${m} min` : `${m} min ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return isFr ? `il y a ${h}h` : `${h}h ago`;
  }
  const d = Math.floor(diff / 86400);
  return isFr ? `il y a ${d}j` : `${d}d ago`;
}

const TYPE_ICON = {
  letter_ready: '📝',
  case_accepted: '✓',
  case_assigned: '🔔',
  live_counsel_reminder: '⏰',
  document_extracted: '📬',
  other: '🔔',
};

export default function NotificationBell({ language = 'fr' }) {
  const isFr = (language || 'fr').startsWith('fr');
  const nav = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const onItemClick = (n) => {
    if (!n.read) markAsRead(n.id);
    setOpen(false);
    if (n.action_url) nav(n.action_url);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={isFr ? 'Notifications' : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-label={isFr ? `${unreadCount} non lues` : `${unreadCount} unread`}
            style={{
              position: 'absolute', top: 4, right: 4,
              minWidth: 16, height: 16, borderRadius: 8,
              background: '#dc2626', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #fff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8,
            width: 360, maxHeight: 480, overflowY: 'auto',
            background: '#fff', borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            border: '0.5px solid #e5e7eb',
            zIndex: 200,
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '0.5px solid #f0efed',
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
              {isFr ? 'Notifications' : 'Notifications'}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: '#1a56db',
                }}
              >
                {isFr ? 'Tout marquer comme lu' : 'Mark all read'}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              {isFr ? 'Aucune notification' : 'No notifications'}
            </div>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => onItemClick(n)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '12px 14px', border: 'none',
                  background: n.read ? '#fff' : '#eff6ff',
                  borderBottom: '0.5px solid #f0efed',
                  cursor: 'pointer',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                  {TYPE_ICON[n.type] || TYPE_ICON.other}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: n.read ? 400 : 600,
                    color: '#111827', marginBottom: 2,
                  }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    {timeAgo(n.created_at, isFr)}
                  </div>
                </div>
                {!n.read && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#1a56db', flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
