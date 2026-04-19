import React from 'react';
import CodeWindow from './CodeWindow';

const AGENTS = [
  { key: 'analyst',    variant: '' },
  { key: 'prosecutor', variant: 'prosecutor' },
  { key: 'defender',   variant: 'defender' },
  { key: 'judge',      variant: 'judge' },
];

const DEBATE_CODE = [
  { t: '<span class="cl-keyword">async def</span> <span class="cl-fn">debate</span>(case: Case, max_rounds: <span class="cl-keyword">int</span> = <span class="cl-number">12</span>) -&gt; <span class="cl-keyword">Verdict</span>:\n', speed: 8 },
  { t: '    agents = [<span class="cl-prop">Analyst</span>(), <span class="cl-prop">Prosecutor</span>(), <span class="cl-prop">Defender</span>(), <span class="cl-prop">Judge</span>()]\n\n', speed: 6 },
  { t: '    <span class="cl-keyword">for</span> round_n <span class="cl-keyword">in</span> <span class="cl-fn">range</span>(max_rounds):\n', speed: 8 },
  { t: '        opinions = <span class="cl-keyword">await</span> <span class="cl-fn">asyncio.gather</span>(*[a.<span class="cl-fn">evaluate</span>(case) <span class="cl-keyword">for</span> a <span class="cl-keyword">in</span> agents])\n', speed: 5 },
  { t: '        agreement = <span class="cl-fn">measure_consensus</span>(opinions)\n\n', speed: 6 },
  { t: '        <span class="cl-keyword">if</span> agreement &gt;= <span class="cl-number">0.97</span>:\n', speed: 8 },
  { t: '            <span class="cl-keyword">return</span> <span class="cl-fn">synthesize_verdict</span>(opinions)\n\n', speed: 6 },
  { t: '        <span class="cl-comment"># Agents read each other\'s arguments &amp; revise</span>\n', speed: 4 },
  { t: '        <span class="cl-keyword">for</span> agent <span class="cl-keyword">in</span> agents:\n', speed: 8 },
  { t: '            <span class="cl-keyword">await</span> agent.<span class="cl-fn">read_rebuttals</span>(opinions)\n\n', speed: 6 },
  { t: '    <span class="cl-keyword">raise</span> <span class="cl-prop">ConsensusNotReached</span>(<span class="cl-string">"Case flagged for human review"</span>)', speed: 8 },
];

const DEBATE_LOGS = [
  { delay: 500, html: '<div class="code-log-line"><span class="code-log-time">round_01</span><span class="code-log-info">[analyst]</span> 42 facts · <span class="code-log-info">[prosecutor]</span> 3 holes · <span class="code-log-info">[defender]</span> 5 args · <span class="code-log-info">[judge]</span> 58% ± 12%</div>' },
  { delay: 600, html: '<div class="code-log-line"><span class="code-log-time">round_01</span><span class="code-log-warn">[consensus]</span> agreement=0.73 · threshold=0.97 · continuing</div>' },
  { delay: 700, html: '<div class="code-log-line"><span class="code-log-time">round_02</span><span class="code-log-info">[judge]</span> revised: 61% ± 10% · <span class="code-log-warn">[consensus]</span> 0.84</div>' },
  { delay: 800, html: '<div class="code-log-line"><span class="code-log-time">round_03</span><span class="code-log-info">[defender]</span> +2 citations · <span class="code-log-info">[judge]</span> 64% ± 8%</div>' },
  { delay: 700, html: '<div class="code-log-line"><span class="code-log-time">round_03</span><span class="code-log-ok">[consensus]</span> 0.98 ✓ verdict synthesized · ready</div>' },
];

export default function MultiAgent({ t }) {
  return (
    <section className="section dark" data-testid="engine-agents">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('multi_agent.eyebrow')}</div>
          <h2 className="section-h">{t('multi_agent.title')}</h2>
          <p className="section-sub">{t('multi_agent.subtitle')}</p>
        </div>

        <div className="agents-board">
          <div className="agents-grid">
            {AGENTS.map((a) => (
              <div className={`agent-card ${a.variant}`} key={a.key}>
                <div className="agent-head">
                  <div className="agent-icon">{t(`multi_agent.agents.${a.key}.code`)}</div>
                  <div>
                    <div className="agent-name">{t(`multi_agent.agents.${a.key}.name`)}</div>
                    <div className="agent-role">{t(`multi_agent.agents.${a.key}.role`)}</div>
                  </div>
                </div>
                <div className="agent-desc">{t(`multi_agent.agents.${a.key}.desc`)}</div>
                <div className="agent-example">
                  <span className="tag">{t(`multi_agent.agents.${a.key}.example_tag`)}</span>{' '}
                  {t(`multi_agent.agents.${a.key}.example_text`)}
                </div>
              </div>
            ))}
          </div>

          <div className="agents-consensus">
            <div className="consensus-dot" />
            <div className="consensus-txt">
              <strong>{t('multi_agent.consensus_strong')}</strong>{' '}
              {t('multi_agent.consensus_text')}
            </div>
          </div>
        </div>

        <CodeWindow
          codePath={t('multi_agent.code_path')}
          codeStatus={t('multi_agent.code_status')}
          code={DEBATE_CODE}
          logs={DEBATE_LOGS}
        />
      </div>
    </section>
  );
}
