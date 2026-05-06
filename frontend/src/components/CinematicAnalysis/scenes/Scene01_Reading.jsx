import React from 'react';
import { useCinematicT } from '../hooks/useCinematicT';
import DocumentScanAnimation from '../DocumentScanAnimation';

export default function Scene01_Reading({ data, language }) {
  const t = useCinematicT(language);
  const facts = data?.facts_extracted?.facts;
  const findings = data?.findings_ready?.findings;
  const docPreview = data?.document_preview;
  const isFr = language?.startsWith('fr');

  // Right-column items: priority Pass 2 findings (richest) > Pass 1 legal
  // references > Pass 1 dates / amounts. Empty until backend data lands;
  // DocumentScanAnimation falls back to a "Reading…" placeholder.
  const items = [];
  if (Array.isArray(findings) && findings.length > 0) {
    findings.slice(0, 6).forEach((f) => {
      const text = f.text || f.title || '';
      if (!text) return;
      items.push({
        text,
        tone: f.type === 'risk' || f.type === 'deadline' ? 'risk' : 'positive',
      });
    });
  } else if (facts) {
    const refs = facts.legal_references || facts.references_legales_citees || [];
    refs.slice(0, 4).forEach((r) => {
      const text = r.reference || r.law || r.loi || '';
      if (text) items.push({ text, tone: 'positive' });
    });
    const dates = facts.key_dates || facts.dates_cles || [];
    dates.slice(0, 3).forEach((d) => {
      const text = d.description || d.date;
      if (text) items.push({ text, tone: d.est_deadline ? 'risk' : 'positive' });
    });
    const amounts = facts.key_amounts || facts.montants_cles || [];
    amounts.slice(0, 2).forEach((a) => {
      const desc = a.description || '';
      const amount = a.amount || a.montant;
      if (desc && amount) {
        items.push({
          text: `${desc}: ${amount} ${a.currency || a.devise || 'EUR'}`,
          tone: 'positive',
        });
      }
    });
  }

  const readingText = t('scene01.reading_in_progress');

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
        <DocumentScanAnimation
          language={isFr ? 'fr' : 'en'}
          lines={docPreview?.lines}
          fileName={docPreview?.file_name}
          items={items}
        />
      </div>
    </div>
  );
}
