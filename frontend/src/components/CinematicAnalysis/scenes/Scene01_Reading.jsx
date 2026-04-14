import React, { useEffect, useState, useRef } from 'react';
import { useCinematicT } from '../hooks/useCinematicT';

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

  return (
    <div data-testid="scene-01" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', padding: '0 32px',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '280px 1fr', gap: 64,
        alignItems: 'center', maxWidth: 960, width: '100%',
        animation: 'fadeIn 0.4s ease forwards',
      }}>
        {/* Document mockup — bigger */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 280, height: 360, background: '#fff', border: '0.5px solid #e2e0db',
            borderRadius: 16, padding: '32px 28px', boxShadow: '0 24px 60px rgba(10,10,15,0.1)',
            display: 'flex', flexDirection: 'column', gap: 7,
          }}>
            <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 11, color: '#1a56db', fontWeight: 800 }}>PDF</div>
            {/* Document lines with some highlighted */}
            {[
              { w: '70%', bg: '#0a0a0f', h: 5 },
              { w: '90%', bg: '#e2e0db', h: 3 },
              { w: '80%', bg: '#fef3c7', h: 3, hl: true },
              { w: '60%', bg: '#e2e0db', h: 3 },
              { w: '85%', bg: '#fef3c7', h: 3, hl: true },
              { w: '75%', bg: '#e2e0db', h: 3 },
              { w: '90%', bg: '#e2e0db', h: 3 },
              { w: '50%', bg: '#fef3c7', h: 3, hl: true },
              { w: '65%', bg: '#e2e0db', h: 3 },
              { w: '80%', bg: '#e2e0db', h: 3 },
              { w: '70%', bg: '#e2e0db', h: 3 },
              { w: '55%', bg: '#e2e0db', h: 3 },
            ].map((l, i) => (
              <div key={i} style={{
                height: l.h, width: l.w, background: l.bg, borderRadius: 1,
                boxShadow: l.hl ? '0 0 0 2px rgba(253,230,138,0.25)' : 'none',
              }} />
            ))}
          </div>
          {/* Mini Archer avatar on document */}
          <div style={{
            position: 'absolute', bottom: -20, right: -20, width: 56, height: 56,
            borderRadius: '50%', background: 'linear-gradient(135deg, #1a56db, #1e40af)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, fontWeight: 800, border: '4px solid #fafaf8',
            boxShadow: '0 12px 28px rgba(26,86,219,0.25)',
          }}>
            A
          </div>
        </div>

        {/* Facts list — bigger text */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block',
            }} />
            <span style={{
              fontSize: 12, fontWeight: 800, color: '#15803d', letterSpacing: '0.8px',
              fontFamily: '"SF Mono", Monaco, monospace',
            }}>
              {t('scene01.facts_label', { count: displayFacts.length })}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {displayFacts.map((fact, i) => (
              <FactItem key={i} text={fact} delay={i * 600} />
            ))}
            <FactItem text={readingText} delay={displayFacts.length * 600} isLast />
          </div>
        </div>
      </div>
    </div>
  );
}
