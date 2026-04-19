import React from 'react';

const ITEMS = ['criminal', 'ma', 'arbitration', 'courtroom', 'immigration', 'training'];

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function HeadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export default function RadicalTransparency({ t }) {
  return (
    <section className="section" data-testid="engine-transparency">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('transparency.eyebrow')}</div>
          <h2 className="section-h">{t('transparency.title')}</h2>
          <p className="section-sub">{t('transparency.subtitle')}</p>
        </div>

        <div className="dont-section">
          <div className="dont-head">
            <div className="dont-icon"><HeadIcon /></div>
            <div>
              <div className="dont-title">{t('transparency.card_title')}</div>
              <div className="dont-sub">{t('transparency.card_subtitle')}</div>
            </div>
          </div>

          <ul className="dont-list">
            {ITEMS.map((k) => (
              <li key={k}>
                <XIcon />
                <span>
                  <strong>{t(`transparency.items.${k}.strong`)}</strong>{' '}
                  {t(`transparency.items.${k}.text`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
