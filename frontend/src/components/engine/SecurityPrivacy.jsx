import React from 'react';

function EncryptionIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>); }
function RegionalIcon()   { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>); }
function CheckIcon()      { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>); }
function XIcon()          { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>); }
function TrashIcon()      { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>); }
function AuditIcon()      { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>); }
function IsoIcon()        { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>); }
function AnonIcon()       { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>); }

const JURISDICTION_KEYS = ['BE', 'US'];

function resolveJurisdictionKey(country) {
  if (!country) return 'unknown';
  const up = String(country).toUpperCase();
  return JURISDICTION_KEYS.includes(up) ? up : 'unknown';
}

const CARDS = [
  { key: 'encryption',    Icon: EncryptionIcon },
  { key: 'regional',      Icon: RegionalIcon,   dynamicDesc: true },
  { key: 'privacy_law',   Icon: CheckIcon,      dynamicTitle: true },
  { key: 'training',      Icon: XIcon },
  { key: 'deletion',      Icon: TrashIcon },
  { key: 'audit',         Icon: AuditIcon },
  { key: 'iso',           Icon: IsoIcon },
  { key: 'anonymization', Icon: AnonIcon },
];

export default function SecurityPrivacy({ t, country }) {
  const jk = resolveJurisdictionKey(country);

  return (
    <section className="section soft" data-testid="engine-security">
      <div className="section-inner">
        <div className="section-head">
          <div className="section-eyebrow">{t('security.eyebrow')}</div>
          <h2 className="section-h">{t(`security.title.${jk}`)}</h2>
          <p className="section-sub">{t('security.subtitle')}</p>
        </div>

        <div className="sec-grid">
          {CARDS.map(({ key, Icon, dynamicDesc, dynamicTitle }) => {
            const title = dynamicTitle
              ? t(`security.cards.${key}.title.${jk}`)
              : t(`security.cards.${key}.title`);
            const desc = dynamicDesc
              ? t(`security.cards.${key}.desc.${jk}`)
              : t(`security.cards.${key}.desc`);
            return (
              <div className="sec-card" key={key}>
                <div className="sec-icon"><Icon /></div>
                <div className="sec-title">{title}</div>
                <div className="sec-desc">{desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
