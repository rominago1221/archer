import React, { useEffect, useState, useRef } from 'react';

/**
 * Bug 4 — Progressive document scan with synchronized findings list.
 *
 * Renders a faux legal document on the left (lines of text); a scan cursor
 * walks down the page, highlighting one line every `intervalMs` (default 800ms).
 * On the right, a findings list grows in real time: each finding appears the
 * moment its corresponding line is highlighted.
 *
 * Self-contained — no external state. Owns its setInterval and cleans up on
 * unmount. Calls `onComplete()` once after the last line + a small dwell.
 */

// Demo legal text used as the visual canvas. Real client documents are far too
// long for a 12s scan, and we don't want to leak content anyway. The visual
// "scanning" effect is what matters; the lines are anonymous filler.
const DEMO_LINES_FR = [
  'CONTRAT DE BAIL — RÉSIDENCE PRINCIPALE',
  'Entre les soussignés :',
  'M./Mme [BAILLEUR], propriétaire d\'un appartement situé au',
  '[ADRESSE], ci-après dénommé "le bailleur",',
  'Et M./Mme [PRENEUR], ci-après dénommé "le preneur",',
  '',
  'Article 1 — Objet du bail',
  'Le bailleur loue au preneur un appartement de [N] pièces,',
  'pour un usage strictement résidentiel.',
  '',
  'Article 2 — Durée du bail',
  'Le présent bail est consenti pour une durée de neuf (9) années,',
  'à compter du [DATE], renouvelable tacitement.',
  '',
  'Article 3 — Loyer et charges',
  'Le loyer mensuel est fixé à [MONTANT] EUR, payable d\'avance,',
  'au plus tard le 5 de chaque mois.',
  '',
  'Article 4 — État des lieux',
  'Un état des lieux contradictoire sera dressé à l\'entrée et à la sortie.',
  '',
  'Article 5 — Résiliation',
  'Le preneur peut résilier le bail moyennant préavis de trois mois.',
];

const DEMO_LINES_EN = [
  'RESIDENTIAL LEASE AGREEMENT',
  'Between the undersigned:',
  'Mr./Mrs. [LANDLORD], owner of an apartment located at',
  '[ADDRESS], hereinafter "the Landlord",',
  'And Mr./Mrs. [TENANT], hereinafter "the Tenant",',
  '',
  'Section 1 — Premises',
  'The Landlord leases to the Tenant a [N]-room apartment,',
  'for residential use only.',
  '',
  'Section 2 — Term',
  'This lease is granted for a term of nine (9) years,',
  'starting on [DATE], with automatic renewal.',
  '',
  'Section 3 — Rent and charges',
  'Monthly rent is set at [AMOUNT] EUR, payable in advance,',
  'no later than the 5th of each month.',
  '',
  'Section 4 — Inspection',
  'A move-in/move-out inspection will be conducted jointly.',
  '',
  'Section 5 — Termination',
  'Tenant may terminate this lease with three months\' written notice.',
];

// Generic "violation" labels. We attach 3 of them to specific line indices.
function buildViolations(lang) {
  const isFr = lang === 'fr';
  return [
    {
      lineIndex: 12,
      text: isFr
        ? 'Délai de préavis non conforme — art. 1762'
        : 'Notice period non-compliant — art. 1762',
    },
    {
      lineIndex: 16,
      text: isFr
        ? 'Clause de loyer indexable manquante'
        : 'Missing indexation clause for rent',
    },
    {
      lineIndex: 22,
      text: isFr
        ? 'Motif de résiliation insuffisamment caractérisé'
        : 'Termination grounds insufficiently characterized',
    },
  ];
}

const SCAN_INTERVAL_MS = 800;
const POST_SCAN_DWELL_MS = 1500;

export default function DocumentScanAnimation({ language = 'fr', onComplete }) {
  const lines = language === 'fr' ? DEMO_LINES_FR : DEMO_LINES_EN;
  const violations = buildViolations(language);
  const violationByLine = Object.fromEntries(violations.map((v) => [v.lineIndex, v]));

  const [scanIndex, setScanIndex] = useState(-1); // -1 = before scan starts
  const [revealedFindings, setRevealedFindings] = useState([]);
  const completedRef = useRef(false);

  useEffect(() => {
    setScanIndex(0); // start scanning the first line
    const interval = setInterval(() => {
      setScanIndex((i) => {
        if (i >= lines.length - 1) return i;
        return i + 1;
      });
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [lines.length]);

  // Add findings as we cross their line index
  useEffect(() => {
    if (scanIndex < 0) return;
    const v = violationByLine[scanIndex];
    if (v && !revealedFindings.find((r) => r.lineIndex === v.lineIndex)) {
      setRevealedFindings((prev) => [...prev, v]);
    }
    if (scanIndex >= lines.length - 1 && !completedRef.current) {
      completedRef.current = true;
      const t = setTimeout(() => onComplete && onComplete(), POST_SCAN_DWELL_MS);
      return () => clearTimeout(t);
    }
  }, [scanIndex, lines.length, violationByLine, revealedFindings, onComplete]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: 24,
        maxWidth: 960,
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* === LEFT: Document with progressive highlights === */}
      <div
        style={{
          background: '#fff',
          border: '0.5px solid #e2e0db',
          borderRadius: 8,
          padding: '24px 28px',
          fontFamily: '"Georgia", "Times New Roman", serif',
          fontSize: 13,
          lineHeight: 1.7,
          color: '#1f2937',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          minHeight: 380,
        }}
      >
        {lines.map((line, i) => {
          const isHighlighted = scanIndex >= i && violationByLine[i];
          const isCurrent = scanIndex === i;
          return (
            <div
              key={i}
              style={{
                background: isHighlighted ? '#fef08a' : 'transparent',
                padding: isHighlighted ? '1px 4px' : 0,
                borderRadius: 2,
                transition: 'background 0.4s ease',
                opacity: line === '' ? 0 : 1,
                outline: isCurrent && !isHighlighted ? '0.5px solid rgba(26,86,219,0.15)' : 'none',
                fontWeight: i === 0 ? 700 : 400,
                marginBottom: line === '' ? 4 : 0,
              }}
            >
              {line || '\u00A0'}
            </div>
          );
        })}
      </div>

      {/* === RIGHT: Findings list, built as the scan progresses === */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#9ca3af',
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
            fontFamily: '"SF Mono", Monaco, monospace',
            marginBottom: 4,
          }}
        >
          {language === 'fr' ? 'Violations détectées en temps réel' : 'Violations detected in real time'}
        </div>

        {revealedFindings.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: '#9ca3af',
              fontStyle: 'italic',
              padding: '12px 14px',
              border: '1px dashed #e2e0db',
              borderRadius: 8,
              background: '#fafaf8',
            }}
          >
            {language === 'fr' ? 'Lecture en cours…' : 'Reading…'}
          </div>
        ) : (
          revealedFindings.map((v, idx) => (
            <div
              key={v.lineIndex}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '10px 14px',
                background: '#fff',
                border: '0.5px solid #e2e0db',
                borderLeft: '2px solid #16a34a',
                borderRadius: 8,
                animation: `fadeUp 0.35s ease ${idx * 0.05}s both`,
                boxShadow: '0 1px 2px rgba(22,163,74,0.06)',
              }}
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="#15803d" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ marginTop: 2, flexShrink: 0 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: 12, color: '#1f2937', fontWeight: 500 }}>
                {v.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
