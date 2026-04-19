import React from 'react';

function EmbeddingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function LatencyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function CitationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
function ObsoleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const FEATURES = [
  { key: 'embeddings', Icon: EmbeddingsIcon },
  { key: 'latency',    Icon: LatencyIcon },
  { key: 'citation',   Icon: CitationIcon },
  { key: 'obsolete',   Icon: ObsoleteIcon },
];

export default function LegalRAG({ t }) {
  return (
    <section className="section" data-testid="engine-rag">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('rag.eyebrow')}</div>
          <h2 className="section-h">{t('rag.title')}</h2>
          <p className="section-sub">{t('rag.subtitle')}</p>
        </div>

        <div className="rag-flow">
          <div className="rag-box">
            <div className="rag-box-label">{t('rag.flow.input_label')}</div>
            <div className="rag-box-title">{t('rag.flow.input_title')}</div>
            <div className="rag-box-meta">{t('rag.flow.input_meta')}</div>
          </div>
          <div className="rag-arrow">→</div>
          <div className="rag-box highlight">
            <div className="rag-box-label">{t('rag.flow.search_label')}</div>
            <div className="rag-box-title">{t('rag.flow.search_title')}</div>
            <div className="rag-box-meta">{t('rag.flow.search_meta')}</div>
          </div>
          <div className="rag-arrow">→</div>
          <div className="rag-box">
            <div className="rag-box-label">{t('rag.flow.output_label')}</div>
            <div className="rag-box-title">{t('rag.flow.output_title')}</div>
            <div className="rag-box-meta">{t('rag.flow.output_meta')}</div>
          </div>
        </div>

        <div className="features-grid" style={{ marginTop: 48 }}>
          {FEATURES.map(({ key, Icon }) => (
            <div className="feature-card" key={key}>
              <div className="feature-icon"><Icon /></div>
              <div>
                <div className="feature-title">{t(`rag.features.${key}.title`)}</div>
                <div className="feature-desc">{t(`rag.features.${key}.desc`)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
