import React from 'react';

const CARDS = [
  { key: 'docs',     num: '2.5', unit: 'M' },
  { key: 'statutes', num: '900', unit: 'K' },
  { key: 'codes',    num: '27',  unit: '' },
  { key: 'refresh',  num: '24',  unit: 'h' },
];

export default function KnowledgeBase({ t }) {
  return (
    <section className="section soft" data-testid="engine-knowledge">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('knowledge_base.eyebrow')}</div>
          <h2 className="section-h">{t('knowledge_base.title')}</h2>
          <p className="section-sub">{t('knowledge_base.subtitle')}</p>
        </div>

        <div className="kb-grid">
          {CARDS.map((c) => (
            <div className="kb-card" key={c.key}>
              <div className="kb-num">
                {c.num}{c.unit && <span className="kb-unit">{c.unit}</span>}
              </div>
              <div className="kb-label">{t(`knowledge_base.cards.${c.key}.label`)}</div>
              <div className="kb-desc">{t(`knowledge_base.cards.${c.key}.desc`)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
