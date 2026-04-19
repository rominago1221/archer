/**
 * CodeWindow — dark code panel with char-by-char typing + appended logs.
 *
 * Triggers once when the window scrolls into view (IntersectionObserver via
 * useInView). `code` is an array of { t, speed } fragments where `t` may
 * contain pre-coloured spans (cl-keyword, cl-string, cl-fn, …). `logs` is
 * an array of { delay, html } that appear in a stacked pane below the code
 * after typing completes.
 *
 * The HTML inside code/log fragments comes from the page's own source, not
 * user input — safe to render via innerHTML. All timers are cleared on
 * unmount so a navigation mid-animation doesn't leak.
 */
import React, { useEffect, useRef } from 'react';
import { useInView } from '../../hooks/useInView';

export default function CodeWindow({ codePath, codeStatus, code, logs }) {
  const [rootRef, inView] = useInView({ threshold: 0.3 });
  const bodyRef = useRef(null);
  const logRef = useRef(null);
  const timersRef = useRef([]);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!inView || playedRef.current) return;
    playedRef.current = true;

    const schedule = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
      return id;
    };

    const bodyEl = bodyRef.current;
    const logEl = logRef.current;
    if (!bodyEl) return;

    let idx = 0;
    let charIdx = 0;
    let html = '';
    const cursorHtml = '<span class="code-cursor"></span>';

    const playLogs = () => {
      if (!logEl) return;
      logEl.classList.add('show');
      logEl.innerHTML = '';
      let cumulative = 0;
      logs.forEach((log) => {
        cumulative += log.delay;
        schedule(() => {
          logEl.insertAdjacentHTML('beforeend', log.html);
        }, cumulative);
      });
    };

    const type = () => {
      if (idx >= code.length) {
        bodyEl.innerHTML = html + cursorHtml;
        schedule(playLogs, 500);
        return;
      }
      const chunk = code[idx];
      const text = chunk.t;
      const speed = chunk.speed || 6;

      if (charIdx < text.length) {
        const char = text[charIdx];
        if (char === '<') {
          const endTag = text.indexOf('>', charIdx);
          if (endTag !== -1) {
            html += text.substring(charIdx, endTag + 1);
            charIdx = endTag + 1;
          } else {
            html += char;
            charIdx += 1;
          }
        } else {
          html += char;
          charIdx += 1;
        }
        bodyEl.innerHTML = html + cursorHtml;
        schedule(type, speed);
      } else {
        idx += 1;
        charIdx = 0;
        schedule(type, 40);
      }
    };

    type();

    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, [inView, code, logs]);

  return (
    <div className="code-window" ref={rootRef}>
      <div className="code-head">
        <div className="code-dots">
          <div className="code-dot red" />
          <div className="code-dot amber" />
          <div className="code-dot green" />
        </div>
        <div className="code-path">{codePath}</div>
        <div className="code-status">{codeStatus}</div>
      </div>
      <div className="code-body" ref={bodyRef} />
      <div className="code-log" ref={logRef} />
    </div>
  );
}
