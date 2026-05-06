import React, { useEffect, useState, useRef, useMemo } from 'react';

/**
 * Progressive document scan with synchronized findings list.
 *
 * Renders the REAL uploaded document on the left (or a 'Reading…' placeholder
 * with the filename if the extraction is not yet finished). A scan cursor
 * walks down the page, highlighting one line every `intervalMs` (800ms).
 *
 * On the right, the findings list is built as items arrive: legal references
 * surfaced by Pass 1 first, then upgraded to real Pass 2 findings if they
 * land while the scene is still on screen.
 *
 * No hardcoded sample text. Self-contained — no external state. Owns its
 * setInterval and cleans up on unmount.
 */

const SCAN_INTERVAL_MS = 800;
const POST_SCAN_DWELL_MS = 1500;

// Soft visual lines used ONLY when no real document text is available yet
// (extraction in progress). They never claim to be the user's document —
// they're greyed shimmer placeholders showing the system is reading.
function makePlaceholderLines(fileName, language) {
  const isFr = language === 'fr';
  const label = fileName
    ? (isFr ? `Lecture de ${fileName}…` : `Reading ${fileName}…`)
    : (isFr ? 'Lecture du document en cours…' : 'Reading the document…');
  // 12 dim shimmer rows + the label on top.
  return [label, '', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
}

export default function DocumentScanAnimation({
  language = 'fr',
  lines: realLines,
  fileName,
  items,
  onComplete,
}) {
  const isFr = language === 'fr';
  const hasRealText = Array.isArray(realLines) && realLines.length > 0;
  const lines = useMemo(
    () => (hasRealText ? realLines : makePlaceholderLines(fileName, language)),
    [hasRealText, realLines, fileName, language],
  );

  // Pick a few lines to highlight as "interesting" while the scan walks. We
  // do this deterministically (every 5th non-empty line, starting from index
  // 3) so the visual feels coherent without trying to do real NLP mapping.
  const highlightLineSet = useMemo(() => {
    const set = new Set();
    let nonEmptySeen = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] && lines[i].trim()) {
        nonEmptySeen++;
        if (nonEmptySeen >= 4 && (nonEmptySeen - 4) % 5 === 0) set.add(i);
      }
    }
    return set;
  }, [lines]);

  const [scanIndex, setScanIndex] = useState(-1);
  const completedRef = useRef(false);

  useEffect(() => {
    setScanIndex(0);
    const interval = setInterval(() => {
      setScanIndex((i) => (i >= lines.length - 1 ? i : i + 1));
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [lines.length]);

  useEffect(() => {
    if (scanIndex >= lines.length - 1 && !completedRef.current) {
      completedRef.current = true;
      const t = setTimeout(() => onComplete && onComplete(), POST_SCAN_DWELL_MS);
      return () => clearTimeout(t);
    }
  }, [scanIndex, lines.length, onComplete]);

  // Right-column items: use whatever the parent feeds us. Fallback to a
  // single "Reading…" hint while we wait. We reveal items progressively
  // (one every ~1.2s) for cinematic effect.
  const itemList = Array.isArray(items) ? items.filter(Boolean) : [];
  const [itemsShown, setItemsShown] = useState(0);
  useEffect(() => {
    if (itemList.length === 0) {
      setItemsShown(0);
      return undefined;
    }
    setItemsShown(0);
    const id = setInterval(() => {
      setItemsShown((n) => (n < itemList.length ? n + 1 : n));
    }, 1200);
    return () => clearInterval(id);
  }, [itemList.length]);

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
          maxHeight: 560,
          overflow: 'hidden',
        }}
      >
        {hasRealText && fileName && (
          <div style={{
            fontFamily: '"SF Mono", Monaco, monospace',
            fontSize: 10,
            fontWeight: 700,
            color: '#9ca3af',
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '0.5px dashed #e2e0db',
          }}>
            {fileName}
          </div>
        )}
        {lines.map((line, i) => {
          const isHighlighted = scanIndex >= i && highlightLineSet.has(i);
          const isCurrent = scanIndex === i;
          const isPlaceholderShimmer = !hasRealText && line === ' ';
          return (
            <div
              key={i}
              style={{
                background: isHighlighted ? '#fef08a' : (isPlaceholderShimmer ? '#f4f4f1' : 'transparent'),
                padding: isHighlighted ? '1px 4px' : 0,
                height: isPlaceholderShimmer ? 14 : 'auto',
                borderRadius: isPlaceholderShimmer ? 4 : 2,
                marginBottom: isPlaceholderShimmer ? 8 : (line === '' ? 4 : 0),
                transition: 'background 0.4s ease',
                opacity: line === '' ? 0 : (isPlaceholderShimmer ? 0.6 : 1),
                outline: isCurrent && !isHighlighted && !isPlaceholderShimmer ? '0.5px solid rgba(26,86,219,0.15)' : 'none',
                fontWeight: i === 0 && hasRealText ? 700 : 400,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {line || ' '}
            </div>
          );
        })}
      </div>

      {/* === RIGHT: Items detected, revealed progressively === */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.7px',
          textTransform: 'uppercase', fontFamily: '"SF Mono", Monaco, monospace', marginBottom: 4,
        }}>
          {isFr ? 'Éléments détectés en temps réel' : 'Items detected in real time'}
        </div>

        {itemList.length === 0 || itemsShown === 0 ? (
          <div style={{
            fontSize: 12, color: '#9ca3af', fontStyle: 'italic', padding: '12px 14px',
            border: '1px dashed #e2e0db', borderRadius: 8, background: '#fafaf8',
          }}>
            {isFr ? 'Lecture en cours…' : 'Reading…'}
          </div>
        ) : (
          itemList.slice(0, itemsShown).map((it, idx) => (
            <div
              key={`${idx}-${(it.text || it.label || '').slice(0, 20)}`}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px',
                background: '#fff', border: '0.5px solid #e2e0db',
                borderLeft: `2px solid ${it.tone === 'risk' ? '#b91c1c' : '#16a34a'}`,
                borderRadius: 8, animation: `fadeUp 0.35s ease ${idx * 0.05}s both`,
                boxShadow: '0 1px 2px rgba(22,163,74,0.06)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={it.tone === 'risk' ? '#b91c1c' : '#15803d'} strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                {it.tone === 'risk'
                  ? <><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="m10.29 3.86-8.47 14a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></>
                  : <polyline points="20 6 9 17 4 12" />}
              </svg>
              <span style={{ fontSize: 12, color: '#1f2937', fontWeight: 500 }}>
                {it.text || it.label || ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
