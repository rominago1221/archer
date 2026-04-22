/**
 * QrScanModal — desktop-side modal for the "Scan via phone" flow.
 *
 * Flow:
 *   1. onOpen: POST /api/scan-sessions → { token, mobile_url, expires_at }
 *   2. Render a QR code (via api.qrserver.com image proxy) encoding `mobile_url`
 *   3. Poll GET /api/scan-sessions/:token every 2s
 *   4. When `status === 'uploaded'`, decode file_b64 → File object, fire
 *      `onFileReceived(file)` and close.
 *
 * Localized via `copy` prop — both AnalyzeDocument and ContractGuard pass
 * their own `t.qrModalTitle` / `.qrModalSub` / etc.
 *
 * External dep: `api.qrserver.com` for QR image generation (zero npm deps).
 * If that service is unreachable, the mobile_url is still shown as plain
 * text so the user can manually enter it.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_INTERVAL_MS = 2000;
const QR_IMG_BASE = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=';

function base64ToFile(b64, name, mime) {
  try {
    const binary = atob(b64);
    const len = binary.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
    return new File([arr], name || 'scan.jpg', { type: mime || 'image/jpeg' });
  } catch {
    return null;
  }
}

export default function QrScanModal({ open, onClose, onFileReceived, copy }) {
  const [state, setState] = useState('idle'); // idle | loading | waiting | received | error
  const [mobileUrl, setMobileUrl] = useState('');
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef(null);
  const openRef = useRef(open);

  // Labels fallback — keeps the component usable even when no copy is passed.
  const t = copy || {
    qrModalTitle: 'Scan via phone',
    qrModalSub: 'Scan this QR code with your phone to send a photo.',
    qrModalWaiting: 'Waiting for a photo from your phone…',
    qrModalReceived: 'Photo received.',
    qrModalClose: 'Close',
    qrModalError: 'Could not generate the mobile link.',
  };

  // Keep a ref so the poll closure sees the latest `open` value.
  useEffect(() => { openRef.current = open; }, [open]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async (currentToken) => {
    if (!openRef.current || !currentToken) return;
    try {
      const res = await axios.get(`${API}/scan-sessions/${currentToken}`, { withCredentials: true });
      if (res.data?.expired) {
        setState('error');
        setErrorMsg(t.qrModalError);
        stopPoll();
        return;
      }
      if (res.data?.status === 'uploaded' && res.data?.file_b64) {
        stopPoll();
        const file = base64ToFile(res.data.file_b64, res.data.file_name, res.data.file_mime);
        if (file) {
          setState('received');
          onFileReceived && onFileReceived(file);
          // Close shortly after success so the user sees confirmation.
          setTimeout(() => { if (openRef.current) onClose && onClose(); }, 900);
        } else {
          setState('error');
          setErrorMsg(t.qrModalError);
        }
      }
    } catch {
      // Single poll failure is not fatal — next tick may succeed.
    }
  }, [onClose, onFileReceived, stopPoll, t.qrModalError]);

  // Create session when the modal opens.
  useEffect(() => {
    if (!open) {
      stopPoll();
      return;
    }
    setState('loading');
    setErrorMsg('');
    axios.post(`${API}/scan-sessions`, {}, { withCredentials: true })
      .then((r) => {
        const nextToken = r.data?.token;
        const nextUrl = r.data?.mobile_url;
        if (!nextToken || !nextUrl) throw new Error('missing token');
        setToken(nextToken);
        setMobileUrl(nextUrl);
        setState('waiting');
        // Start polling.
        stopPoll();
        pollRef.current = setInterval(() => pollOnce(nextToken), POLL_INTERVAL_MS);
      })
      .catch(() => {
        setState('error');
        setErrorMsg(t.qrModalError);
      });
    return stopPoll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const qrSrc = mobileUrl ? `${QR_IMG_BASE}${encodeURIComponent(mobileUrl)}` : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.qrModalTitle}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,10,15,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 18,
          padding: 28,
          maxWidth: 380, width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          fontFamily: "'Inter Tight', -apple-system, sans-serif",
          color: '#0a0a0f',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.qrModalClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: 8,
            background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#8a8a95',
          }}
          data-testid="qr-modal-close"
        >
          <X size={18} />
        </button>

        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8 }}>
          {t.qrModalTitle}
        </div>
        <div style={{ fontSize: 13, color: '#5a5a65', lineHeight: 1.5, marginBottom: 20 }}>
          {t.qrModalSub}
        </div>

        {state === 'loading' && (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8a95', fontSize: 13 }}>
            …
          </div>
        )}

        {state === 'waiting' && qrSrc && (
          <>
            <div style={{
              background: '#faf5ff',
              border: '1px solid #ede9fe',
              borderRadius: 16,
              padding: 14,
              display: 'inline-block',
              marginBottom: 14,
            }}>
              <img
                src={qrSrc}
                alt="QR code"
                width="220"
                height="220"
                style={{ display: 'block', borderRadius: 8 }}
                data-testid="qr-code-img"
              />
            </div>
            <div style={{
              fontSize: 12, color: '#5a5a65',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginBottom: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#22c55e',
                animation: 'qr-pulse 1.5s ease-in-out infinite',
              }} />
              <span>{t.qrModalWaiting}</span>
            </div>
            <div style={{ fontSize: 10.5, color: '#8a8a95', wordBreak: 'break-all', marginTop: 6 }}>
              {mobileUrl}
            </div>
          </>
        )}

        {state === 'received' && (
          <div style={{
            height: 240, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 30, fontWeight: 700,
              boxShadow: '0 6px 20px rgba(34,197,94,0.3)',
            }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#16a34a' }}>
              {t.qrModalReceived}
            </div>
          </div>
        )}

        {state === 'error' && (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 13, fontWeight: 600, padding: 20, textAlign: 'center' }}>
            {errorMsg || t.qrModalError}
          </div>
        )}

        <style>{`
          @keyframes qr-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
        `}</style>
      </div>
    </div>
  );
}
