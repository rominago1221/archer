/**
 * MobileScan — /m/scan/:token — unauthenticated mobile landing page.
 *
 * Desktop user creates a scan session and shows the user a QR code that
 * encodes this page's URL. User opens the URL on their phone (no login
 * required — the token is the shared secret), uses the device camera to
 * take a photo, and submits. Backend stores the photo; desktop picks it
 * up via polling.
 *
 * Single-use: once a photo is uploaded, the session flips to "uploaded"
 * and further attempts are rejected with 409.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COPY = {
  fr: {
    title: 'Scanner un document',
    subtitle: 'Prenez une photo ou choisissez une image depuis votre pellicule — elle apparaîtra immédiatement sur votre écran.',
    take: 'Prendre une photo',
    choose: 'Choisir depuis la pellicule',
    sending: 'Envoi en cours…',
    success: 'Photo envoyée ✓',
    successHint: 'Vous pouvez fermer cet onglet et retourner à votre ordinateur.',
    error: 'Envoi échoué. Réessayez.',
    expired: 'Session expirée — retournez à votre ordinateur pour en générer une nouvelle.',
    already: 'Cette session a déjà reçu une photo.',
    checking: 'Vérification du lien…',
    notFound: 'Lien invalide — retournez à votre ordinateur pour en générer un nouveau.',
  },
  nl: {
    title: 'Een document scannen',
    subtitle: 'Maak een foto of kies een afbeelding uit je galerij — hij verschijnt meteen op je scherm.',
    take: 'Foto nemen',
    choose: 'Kies uit galerij',
    sending: 'Versturen…',
    success: 'Foto verzonden ✓',
    successHint: 'Je kan dit tabblad sluiten en terugkeren naar je computer.',
    error: 'Verzenden mislukt. Probeer opnieuw.',
    expired: 'Sessie verlopen — ga terug naar je computer om een nieuwe te maken.',
    already: 'Deze sessie heeft al een foto ontvangen.',
    checking: 'Link controleren…',
    notFound: 'Ongeldige link — ga terug naar je computer om een nieuwe te maken.',
  },
  en: {
    title: 'Scan a document',
    subtitle: 'Take a photo or choose an image from your library — it appears on your screen immediately.',
    take: 'Take a photo',
    choose: 'Choose from library',
    sending: 'Sending…',
    success: 'Photo sent ✓',
    successHint: 'You can close this tab and go back to your computer.',
    error: 'Upload failed. Try again.',
    expired: 'Session expired — go back to your computer to generate a new one.',
    already: 'This session already received a photo.',
    checking: 'Checking link…',
    notFound: 'Invalid link — go back to your computer to generate a new one.',
  },
};

function pickLang() {
  const nav = (navigator.language || 'fr').toLowerCase().split('-')[0];
  if (nav === 'fr' || nav === 'nl' || nav === 'en') return nav;
  return 'fr';
}

export default function MobileScan() {
  const { token } = useParams();
  const t = COPY[pickLang()];

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const [sessionState, setSessionState] = useState('checking'); // 'checking' | 'ready' | 'expired' | 'already' | 'not_found'
  const [uploadState, setUploadState] = useState('idle'); // 'idle' | 'uploading' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setSessionState('not_found'); return; }
    axios.get(`${API}/scan-sessions/${token}/public-check`)
      .then((r) => {
        if (r.data?.valid) setSessionState('ready');
        else if (r.data?.reason === 'expired') setSessionState('expired');
        else if (r.data?.reason === 'already_uploaded') setSessionState('already');
        else setSessionState('not_found');
      })
      .catch(() => setSessionState('not_found'));
  }, [token]);

  const handleFile = useCallback(async (f) => {
    if (!f || uploadState === 'uploading') return;
    setUploadState('uploading');
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      await axios.post(`${API}/scan-sessions/${token}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadState('done');
    } catch (e) {
      setUploadState('error');
      const detail = e?.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : t.error);
    }
  }, [token, uploadState, t.error]);

  // Common styles — mobile-first
  const wrapStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    background: '#f8f8f5',
    fontFamily: "'Inter Tight', -apple-system, sans-serif",
    color: '#0a0a0f',
  };
  const cardStyle = {
    width: '100%', maxWidth: 420,
    background: 'white',
    border: '1px solid #ececea',
    borderRadius: 20,
    padding: 28,
    boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
    textAlign: 'center',
  };
  const titleStyle = { fontSize: 22, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 10 };
  const subStyle = { fontSize: 14, color: '#5a5a65', lineHeight: 1.5, marginBottom: 22 };
  const btnPrimary = {
    display: 'block', width: '100%',
    padding: '14px 18px', marginBottom: 10,
    background: '#1a56db', color: 'white', border: 'none',
    borderRadius: 12, fontFamily: 'inherit',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(26,86,219,0.25)',
  };
  const btnSecondary = {
    display: 'block', width: '100%',
    padding: '13px 18px',
    background: 'white', color: '#2a2a35',
    border: '1px solid #ececea',
    borderRadius: 12, fontFamily: 'inherit',
    fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
  };
  const errorStyle = { marginTop: 12, fontSize: 13, color: '#dc2626', fontWeight: 600 };
  const successIconStyle = {
    width: 68, height: 68, margin: '0 auto 16px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: 32,
    boxShadow: '0 6px 20px rgba(34,197,94,0.3)',
  };

  if (sessionState === 'checking') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ color: '#8a8a95' }}>{t.checking}</div>
        </div>
      </div>
    );
  }
  if (sessionState === 'expired') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={titleStyle}>⏱️</div>
          <div style={subStyle}>{t.expired}</div>
        </div>
      </div>
    );
  }
  if (sessionState === 'already') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={titleStyle}>✅</div>
          <div style={subStyle}>{t.already}</div>
        </div>
      </div>
    );
  }
  if (sessionState === 'not_found') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={titleStyle}>⚠️</div>
          <div style={subStyle}>{t.notFound}</div>
        </div>
      </div>
    );
  }

  if (uploadState === 'done') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={successIconStyle}>✓</div>
          <div style={titleStyle}>{t.success}</div>
          <div style={subStyle}>{t.successHint}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>📷 {t.title}</div>
        <div style={subStyle}>{t.subtitle}</div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <button
          type="button"
          style={btnPrimary}
          onClick={() => cameraRef.current?.click()}
          disabled={uploadState === 'uploading'}
        >
          {uploadState === 'uploading' ? t.sending : t.take}
        </button>
        <button
          type="button"
          style={btnSecondary}
          onClick={() => galleryRef.current?.click()}
          disabled={uploadState === 'uploading'}
        >
          {t.choose}
        </button>

        {uploadState === 'error' && <div style={errorStyle}>{errorMsg || t.error}</div>}
      </div>
    </div>
  );
}
