import React from 'react';
import CodeWindow from './CodeWindow';

const STAGE_TIMINGS = ['~2.1s', '~1.8s', '~0.2s', '~4.6s', '~6.2s', '~3.4s', '~2.1s'];

function StageIcon({ n }) {
  switch (n) {
    case 1:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 12 2 21 6 21 18 12 22 3 18 3 6"/><line x1="3" y1="6" x2="12" y2="10"/><line x1="12" y1="10" x2="21" y2="6"/><line x1="12" y1="10" x2="12" y2="22"/></svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
      );
    case 4:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
      );
    case 5:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><line x1="8" y1="6" x2="16" y2="10"/></svg>
      );
    case 6:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      );
    case 7:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
      );
    default:
      return null;
  }
}

const PIPELINE_CODE = [
  { t: '<span class="cl-comment"># Each case runs through 7 sequential passes.</span>\n', speed: 4 },
  { t: '<span class="cl-comment"># Every pass has its own model, prompt, and output schema.</span>\n\n', speed: 4 },
  { t: '<span class="cl-keyword">async def</span> <span class="cl-fn">analyze_case</span>(case: Case) -&gt; <span class="cl-keyword">Analysis</span>:\n', speed: 8 },
  { t: '    facts      = <span class="cl-keyword">await</span> <span class="cl-fn">pass_1_extract</span>(case.documents)          <span class="cl-comment"># ~2.1s</span>\n', speed: 6 },
  { t: '    domain     = <span class="cl-keyword">await</span> <span class="cl-fn">pass_2_qualify</span>(facts)                     <span class="cl-comment"># ~1.8s</span>\n', speed: 6 },
  { t: '    precedents = <span class="cl-keyword">await</span> <span class="cl-fn">pass_3_retrieve</span>(facts, domain, k=<span class="cl-number">12</span>)    <span class="cl-comment"># ~0.2s</span>\n', speed: 6 },
  { t: '    risk       = <span class="cl-keyword">await</span> <span class="cl-fn">pass_4_assess_risk</span>(facts, precedents)    <span class="cl-comment"># ~4.6s</span>\n', speed: 6 },
  { t: '    challenge  = <span class="cl-keyword">await</span> <span class="cl-fn">pass_5_adversarial</span>(risk, precedents)    <span class="cl-comment"># ~6.2s</span>\n', speed: 6 },
  { t: '    strategy   = <span class="cl-keyword">await</span> <span class="cl-fn">pass_6_strategy</span>(facts, risk, challenge)  <span class="cl-comment"># ~3.4s</span>\n', speed: 6 },
  { t: '    validated  = <span class="cl-keyword">await</span> <span class="cl-fn">pass_7_validate</span>(strategy, precedents)    <span class="cl-comment"># ~2.1s</span>\n\n', speed: 6 },
  { t: '    <span class="cl-keyword">return</span> <span class="cl-prop">Analysis</span>(\n', speed: 8 },
  { t: '        confidence=validated.<span class="cl-prop">confidence_score</span>,\n', speed: 6 },
  { t: '        outcome_probabilities=risk.<span class="cl-prop">distribution</span>,\n', speed: 6 },
  { t: '        citations=validated.<span class="cl-prop">citations</span>,\n', speed: 6 },
  { t: '        action_plan=strategy.<span class="cl-prop">steps</span>,\n', speed: 6 },
  { t: '        risk_flags=challenge.<span class="cl-prop">flags</span>,\n', speed: 6 },
  { t: '    )', speed: 8 },
];

const PIPELINE_LOGS = [
  { delay: 400, html: '<div class="code-log-line"><span class="code-log-time">12:04:33.102</span><span class="code-log-info">[pass_1]</span> extracted 42 facts, 7 actors, timeline built</div>' },
  { delay: 600, html: '<div class="code-log-line"><span class="code-log-time">12:04:33.941</span><span class="code-log-info">[pass_2]</span> domain=real_estate · jurisdiction=BE-BRU</div>' },
  { delay: 700, html: '<div class="code-log-line"><span class="code-log-time">12:04:34.132</span><span class="code-log-info">[pass_3]</span> retrieved top-12 sources in 184ms</div>' },
  { delay: 800, html: '<div class="code-log-line"><span class="code-log-time">12:04:38.704</span><span class="code-log-info">[pass_4]</span> risk: 64% win ± 8%, 19% settle, 17% loss</div>' },
  { delay: 900, html: '<div class="code-log-line"><span class="code-log-time">12:04:44.891</span><span class="code-log-warn">[pass_5]</span> 2 weaknesses found, strategy revised</div>' },
  { delay: 800, html: '<div class="code-log-line"><span class="code-log-time">12:04:48.241</span><span class="code-log-info">[pass_6]</span> action_plan: 4 steps, letter drafted</div>' },
  { delay: 700, html: '<div class="code-log-line"><span class="code-log-time">12:04:50.344</span><span class="code-log-ok">[pass_7]</span> 14/14 citations validated · ready ✓</div>' },
];

export default function PipelineCards({ t }) {
  const stages = ['01', '02', '03', '04', '05', '06', '07'];
  return (
    <section className="section" data-testid="engine-pipeline">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('pipeline.eyebrow')}</div>
          <h2 className="section-h">{t('pipeline.title')}</h2>
          <p className="section-sub">{t('pipeline.subtitle')}</p>
        </div>

        <div className="pipe-cards">
          {stages.map((key, i) => (
            <div className="pipe-card" key={key}>
              <div className="pipe-card-top">
                <div className="pipe-icon"><StageIcon n={i + 1} /></div>
                <div className="pipe-badge">
                  <div className="pipe-stage-num">{t('pipeline.stage_label')} {key}</div>
                  <div className="pipe-card-timing">{STAGE_TIMINGS[i]}</div>
                </div>
              </div>
              <div className="pipe-card-title">{t(`pipeline.stages.${key}.title`)}</div>
              <div className="pipe-card-desc">{t(`pipeline.stages.${key}.desc`)}</div>
            </div>
          ))}

          <div className="pipe-card total">
            <div className="pipe-total-tag">{t('pipeline.total_tag')}</div>
            <div className="pipe-total-big">20<span className="pipe-total-u">{t('pipeline.total_unit')}</span></div>
            <div className="pipe-total-desc">{t('pipeline.total_desc')}</div>
          </div>
        </div>

        <CodeWindow
          codePath={t('pipeline.code_path')}
          codeStatus={t('pipeline.code_status')}
          code={PIPELINE_CODE}
          logs={PIPELINE_LOGS}
        />
      </div>
    </section>
  );
}
