import React from 'react';

/**
 * Benchmark values are expressed EN — they're numerical + short unit glyphs
 * that read the same in FR except for the "Yes/No/Partial" cell on the
 * adversarial row, which swaps to t('benchmarks.values.*').
 */
const ROWS = [
  { key: 'accuracy',      archer: '94.7%',       chatbot: '78.2%',         jr: '89.1%',         firm: '96.3%',       archerCls: 'archer', chatbotCls: 'bad', jrCls: 'mid',    firmCls: 'mid' },
  { key: 'citation',      archer: '98.2%',       chatbot: '62.4%',         jr: '94.8%',         firm: '99.1%',       archerCls: 'archer', chatbotCls: 'bad', jrCls: 'mid',    firmCls: 'mid' },
  { key: 'time',          archer: '34 s',        chatbot: '~15 s',         jr: '~45 min',       firm: '~3 days',     archerCls: 'archer', chatbotCls: 'mid', jrCls: 'bad',    firmCls: 'bad' },
  { key: 'hallucination', archer: '< 3%',        chatbot: '~12%',          jr: '< 1%',          firm: '< 1%',        archerCls: 'archer', chatbotCls: 'bad', jrCls: 'archer', firmCls: 'archer' },
  { key: 'adversarial',   archer: 'yes',         chatbot: 'no',            jr: 'partial',       firm: 'yes',         archerCls: 'archer', chatbotCls: 'na',  jrCls: 'mid',    firmCls: 'archer', enumCell: true },
  { key: 'price',         archer: '€49.99',      chatbot: '€0 (unusable)', jr: '€200–400',      firm: '€800–1,500',  archerCls: 'archer', chatbotCls: 'mid', jrCls: 'bad',    firmCls: 'bad' },
];

function cellValue(v, isEnum, t) {
  if (!isEnum) return v;
  if (v === 'yes')     return t('benchmarks.values.adversarial_yes');
  if (v === 'no')      return t('benchmarks.values.adversarial_no');
  if (v === 'partial') return t('benchmarks.values.adversarial_partial');
  return v;
}

export default function Benchmarks({ t }) {
  return (
    <section className="section dark" data-testid="engine-benchmarks">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('benchmarks.eyebrow')}</div>
          <h2 className="section-h">{t('benchmarks.title')}</h2>
          <p className="section-sub">{t('benchmarks.subtitle')}</p>
        </div>

        <div className="bench-table">
          <div className="bench-row header">
            <div>{t('benchmarks.columns.metric')}</div>
            <div>{t('benchmarks.columns.archer')}</div>
            <div>{t('benchmarks.columns.chatbot')}</div>
            <div>{t('benchmarks.columns.jr')}</div>
            <div>{t('benchmarks.columns.firm')}</div>
          </div>

          {ROWS.map((r) => (
            <div className="bench-row data" key={r.key}>
              <div>
                <div className="bench-metric">{t(`benchmarks.rows.${r.key}.metric`)}</div>
                <div className="bench-metric-sub">{t(`benchmarks.rows.${r.key}.sub`)}</div>
              </div>
              <div className={`bench-val ${r.archerCls}`}>{cellValue(r.archer,    r.enumCell, t)}</div>
              <div className={`bench-val ${r.chatbotCls}`}>{cellValue(r.chatbot, r.enumCell, t)}</div>
              <div className={`bench-val ${r.jrCls}`}>{cellValue(r.jr,            r.enumCell, t)}</div>
              <div className={`bench-val ${r.firmCls}`}>{cellValue(r.firm,        r.enumCell, t)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
