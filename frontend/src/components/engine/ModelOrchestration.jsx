import React from 'react';

function DeepIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function FastIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export default function ModelOrchestration({ t }) {
  return (
    <section className="section" data-testid="engine-orchestration">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('orchestration.eyebrow')}</div>
          <h2 className="section-h">{t('orchestration.title')}</h2>
          <p className="section-sub">{t('orchestration.subtitle')}</p>
        </div>

        <div className="orch-card">
          <div className="orch-inner">
            <div className="orch-layer-label">{t('orchestration.layer_label')}</div>
            <div className="orch-layer-title">{t('orchestration.layer_title')}</div>

            <div className="orch-row">
              <div className="orch-lane">
                <div className="orch-lane-head">
                  <div className="orch-lane-icon"><DeepIcon /></div>
                  <div>
                    <div className="orch-lane-name">{t('orchestration.deep.name')}</div>
                    <div className="orch-lane-role">{t('orchestration.deep.role')}</div>
                  </div>
                </div>
                <div className="orch-lane-purpose">{t('orchestration.deep.purpose')}</div>
                <div className="orch-lane-spec">{t('orchestration.deep.spec')}</div>
              </div>

              <div className="orch-lane">
                <div className="orch-lane-head">
                  <div className="orch-lane-icon"><FastIcon /></div>
                  <div>
                    <div className="orch-lane-name">{t('orchestration.fast.name')}</div>
                    <div className="orch-lane-role">{t('orchestration.fast.role')}</div>
                  </div>
                </div>
                <div className="orch-lane-purpose">{t('orchestration.fast.purpose')}</div>
                <div className="orch-lane-spec">{t('orchestration.fast.spec')}</div>
              </div>
            </div>

            <div className="orch-meta">
              <strong>{t('orchestration.meta_strong_1')}</strong>
              {t('orchestration.meta_text_1')}
              <strong>{t('orchestration.meta_strong_2')}</strong>
              {t('orchestration.meta_text_2')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
