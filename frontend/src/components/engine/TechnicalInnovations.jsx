import React from 'react';

function I1() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>); }
function I2() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>); }
function I3() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>); }
function I4() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>); }
function I5() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 12l-4-4-4 4M12 16V8"/></svg>); }
function I6() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>); }
function I7() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>); }
function I8() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>); }
function I9() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>); }
function I10() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>); }
function I11() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h4"/></svg>); }
function I12() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>); }

const ITEMS = [
  { key: 'adversarial',  Icon: I1 },
  { key: 'confidence',   Icon: I2 },
  { key: 'explain',      Icon: I3 },
  { key: 'compare',      Icon: I4 },
  { key: 'intervals',    Icon: I5 },
  { key: 'refine',       Icon: I6 },
  { key: 'jurisdiction', Icon: I7 },
  { key: 'extraction',   Icon: I8 },
  { key: 'plan',         Icon: I9 },
  { key: 'risk',         Icon: I10 },
  { key: 'sentiment',    Icon: I11 },
  { key: 'negotiation',  Icon: I12 },
];

export default function TechnicalInnovations({ t }) {
  return (
    <section className="section soft" data-testid="engine-innovations">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('innovations.eyebrow')}</div>
          <h2 className="section-h">{t('innovations.title')}</h2>
          <p className="section-sub">{t('innovations.subtitle')}</p>
        </div>

        <div className="features-compact">
          {ITEMS.map(({ key, Icon }) => (
            <div className="feature-compact" key={key}>
              <div className="feature-compact-icon"><Icon /></div>
              <div className="feature-compact-text">
                <div className="feature-compact-title">{t(`innovations.items.${key}.title`)}</div>
                <div className="feature-compact-desc">{t(`innovations.items.${key}.desc`)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
