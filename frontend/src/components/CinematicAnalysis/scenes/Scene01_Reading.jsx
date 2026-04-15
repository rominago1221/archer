import React, { useEffect, useState, useRef } from 'react';
import { useCinematicT } from '../hooks/useCinematicT';
import DocumentScanAnimation from '../DocumentScanAnimation';

const Chk = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function FactItem({ text, delay, isLast }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!show) return null;

  if (isLast) {
    return (
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px',
        background: '#fff', border: '0.5px solid #e2e0db', borderLeft: '2px solid #1a56db',
        borderRadius: 8, opacity: 0.6, animation: 'fadeUp 0.3s ease forwards',
      }}>
        <div style={{
          width: 12, height: 12, border: '2px solid #1a56db', borderRadius: '50%',
          borderTopColor: 'transparent', marginTop: 2, flexShrink: 0,
          animation: 'counterSpin 1s linear infinite',
        }} />
        <span style={{ fontSize: 12, color: '#555', fontStyle: 'italic' }}>{text}</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px',
      background: '#fff', border: '0.5px solid #e2e0db', borderLeft: '2px solid #16a34a',
      borderRadius: 8, animation: 'fadeUp 0.3s ease forwards',
    }}>
      <Chk />
      <span style={{ fontSize: 13, color: '#0a0a0f', fontWeight: 600 }}>{text}</span>
    </div>
  );
}

export default function Scene01_Reading({ data, language }) {
  const t = useCinematicT(language);
  const facts = data?.facts_extracted?.facts;
  const isFr = language?.startsWith('fr');

  // Build displayable fact lines from the real extracted facts.
  const factLines = [];
  if (facts) {
    const docType = facts.type_document || facts.document_type || '';
    const region = facts.region_applicable || '';
    if (docType && docType !== 'other') {
      factLines.push(`${t('scene01.type_detected')} · ${docType}${region ? ` · ${region}` : ''}`);
    }

    const dates = facts.key_dates || facts.dates_cles || [];
    dates.forEach((d) => {
      if (d.date || d.description) factLines.push(d.description || d.date);
    });

    const amounts = facts.key_amounts || facts.montants_cles || [];
    amounts.forEach((a) => {
      if (a.description) factLines.push(`${a.description}: ${a.amount} ${a.currency || 'EUR'}`);
    });

    const refs = facts.legal_references || facts.references_legales_citees || [];
    refs.forEach((r) => {
      if (r.reference) factLines.push(r.reference);
    });
  }

  // Continuous placeholder activity while real facts have not yet landed.
  // We reveal the placeholder items one-by-one every 1.4s so the scene keeps
  // progressing even while Pass1-4 are still running on the backend.
  const placeholderLines = isFr ? [
    'Lecture du document en cours\u2026',
    'Identification des parties\u2026',
    'Extraction des dates clés\u2026',
    'Analyse des montants mentionnés\u2026',
    'Recherche des références légales\u2026',
    'Vérification des délais\u2026',
  ] : [
    'Reading the document\u2026',
    'Identifying the parties\u2026',
    'Extracting key dates\u2026',
    'Analyzing monetary figures\u2026',
    'Searching legal references\u2026',
    'Checking deadlines\u2026',
  ];

  const [placeholderShown, setPlaceholderShown] = useState(0);
  useEffect(() => {
    if (factLines.length > 0) return; // real data landed, stop placeholder reveal
    const tm = setInterval(() => {
      setPlaceholderShown((n) => (n < placeholderLines.length ? n + 1 : n));
    }, 1400);
    return () => clearInterval(tm);
  }, [factLines.length, placeholderLines.length]);

  const displayFacts = factLines.length > 0
    ? factLines.slice(0, 6)
    : placeholderLines.slice(0, placeholderShown);
  const readingText = t('scene01.reading_in_progress');

  // Bug 4 — Scene 01 is now driven by DocumentScanAnimation: the document on
  // the left has its lines progressively highlighted (one every 800ms), and
  // the right column builds a findings list as each violation line lights up.
  // The previous fact-list logic is preserved above (used by Scene02+) but the
  // visual rendered here is the cinematic scan animation.
  return (
    <div
      data-testid="scene-01"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafaf8',
        padding: '32px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 960, animation: 'fadeIn 0.4s ease forwards' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#16a34a',
            display: 'inline-block', animation: 'livepulse 1.4s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#15803d', letterSpacing: '0.8px',
            fontFamily: '"SF Mono", Monaco, monospace', textTransform: 'uppercase',
          }}>
            {readingText}
          </span>
        </div>
        <DocumentScanAnimation language={isFr ? 'fr' : 'en'} />
      </div>
    </div>
  );
}
