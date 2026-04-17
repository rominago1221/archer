import React, { useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const JURISDICTION_LABELS = {
  BE: { fr: 'droit belge', en: 'Belgian law', nl: 'Belgisch recht' },
  US: { fr: 'droit américain', en: 'U.S. law', nl: 'Amerikaans recht' },
};

const PROFILE_LABELS = {
  BE: { fr: 'la Belgique', en: 'Belgium', nl: 'België' },
  US: { fr: 'les États-Unis', en: 'the United States', nl: 'de Verenigde Staten' },
};

function getCopy(lang, detected, current) {
  const isFr = String(lang || '').toLowerCase().startsWith('fr');
  const isNl = String(lang || '').toLowerCase().startsWith('nl');
  const detectedLabel = JURISDICTION_LABELS[detected] || JURISDICTION_LABELS.BE;
  const profileLabel = PROFILE_LABELS[current] || PROFILE_LABELS.US;

  if (isFr) {
    return {
      title: 'Juridiction détectée différente',
      body: `Ce document semble être soumis au ${detectedLabel.fr}, mais votre profil est configuré pour ${profileLabel.fr}. Voulez-vous analyser ce document selon le ${detectedLabel.fr} ?`,
      accept: `Oui, analyser en ${detectedLabel.fr}`,
      decline: `Non, garder le ${(JURISDICTION_LABELS[current] || JURISDICTION_LABELS.US).fr}`,
      reanalyzing: 'Nouvelle analyse en cours...',
      error: 'Erreur lors du changement de juridiction. Réessayez.',
    };
  }
  if (isNl) {
    return {
      title: 'Afwijkende jurisdictie gedetecteerd',
      body: `Dit document lijkt onder het ${detectedLabel.nl} te vallen, maar uw profiel is ingesteld op ${profileLabel.nl}. Wilt u dit document analyseren volgens het ${detectedLabel.nl}?`,
      accept: `Ja, analyseer onder ${detectedLabel.nl}`,
      decline: `Nee, behoud ${(JURISDICTION_LABELS[current] || JURISDICTION_LABELS.US).nl}`,
      reanalyzing: 'Nieuwe analyse bezig...',
      error: 'Fout bij het wisselen van jurisdictie. Probeer opnieuw.',
    };
  }
  return {
    title: 'Different jurisdiction detected',
    body: `This document appears to be governed by ${detectedLabel.en}, but your profile is set to ${profileLabel.en}. Would you like to analyze this document under ${detectedLabel.en}?`,
    accept: `Yes, analyze under ${detectedLabel.en}`,
    decline: `No, keep ${(JURISDICTION_LABELS[current] || JURISDICTION_LABELS.US).en}`,
    reanalyzing: 'Re-analyzing...',
    error: 'Jurisdiction switch failed. Please try again.',
  };
}

export default function JurisdictionMismatchBanner({ caseDoc, language, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!caseDoc?.jurisdiction_mismatch) return null;
  const detected = caseDoc.detected_jurisdiction;
  const current = caseDoc.jurisdiction || caseDoc.country;
  if (!detected || detected === current) return null;

  const copy = getCopy(language, detected, current);

  const accept = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await axios.post(
        `${API}/cases/${caseDoc.case_id}/switch-jurisdiction`,
        {},
        { withCredentials: true }
      );
      onUpdated && onUpdated(res.data);
    } catch (e) {
      setErr(copy.error);
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    setErr(null);
    try {
      await axios.post(
        `${API}/cases/${caseDoc.case_id}/dismiss-jurisdiction-mismatch`,
        {},
        { withCredentials: true }
      );
      onUpdated && onUpdated({ ...caseDoc, jurisdiction_mismatch: false });
    } catch (e) {
      setErr(copy.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="jurisdiction-mismatch-banner"
      style={{
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1 }}>⚖️</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>
          {copy.title}
        </div>
        <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.55, marginBottom: 14 }}>
          {busy ? copy.reanalyzing : copy.body}
        </div>
        {err && (
          <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 10 }}>{err}</div>
        )}
        {!busy && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              data-testid="jurisdiction-switch-accept"
              onClick={accept}
              disabled={busy}
              style={{
                padding: '9px 16px',
                background: '#1a56db',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {copy.accept}
            </button>
            <button
              data-testid="jurisdiction-switch-decline"
              onClick={decline}
              disabled={busy}
              style={{
                padding: '9px 16px',
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {copy.decline}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
