import React from 'react';

/**
 * Sprint C — Banner shown on the client's CaseDetail page while their case
 * is waiting for (or hasn't yet found) an attorney.
 *
 * Drop it near the top of the case page:
 *   <AttorneyStatusBanner status={caseDoc?.attorney_status} language={language} />
 *
 * It renders nothing when the case is already assigned (or status is null).
 */
const COPY = {
  en: {
    waiting_title: '🔍 Finding the right attorney for your case',
    waiting_body: 'This usually takes less than 30 minutes. You will be notified as soon as an attorney has accepted.',
    unmatched_title: '⏳ Attorney search in progress',
    unmatched_body: 'Our team is actively looking for the best attorney for your case. You will be contacted within 24h.',
  },
  fr: {
    waiting_title: '🔍 Nous cherchons l\'avocat parfait pour votre dossier',
    waiting_body: 'Cela prend généralement moins de 30 minutes. Vous serez notifié dès qu\'un avocat aura accepté.',
    unmatched_title: '⏳ Recherche d\'avocat en cours',
    unmatched_body: 'Notre équipe travaille activement à trouver le meilleur avocat pour votre cas. Vous serez contacté sous 24h.',
  },
};

export default function AttorneyStatusBanner({ status, language = 'en' }) {
  if (status !== 'waiting_assignment' && status !== 'unassigned_no_match') return null;
  const lang = COPY[language] ? language : 'en';
  const c = COPY[lang];
  const isWaiting = status === 'waiting_assignment';
  const title = isWaiting ? c.waiting_title : c.unmatched_title;
  const body = isWaiting ? c.waiting_body : c.unmatched_body;
  const styles = isWaiting
    ? { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }
    : { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...styles,
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 24,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, opacity: 0.9 }}>{body}</div>
    </div>
  );
}
