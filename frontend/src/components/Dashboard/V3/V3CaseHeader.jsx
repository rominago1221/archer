import React from 'react';
import { Check, Lock } from 'lucide-react';
import { deriveProgressStep } from '../../../utils/dashboard/progressStep';

// Matches the mockup's .case-header. Eyebrow row + title row + 6-step timeline.
// Steps 4 and 5 are paywalled (locked) for free users — clicking navigates
// to /plans.
const STEP_LABELS = {
  fr: [
    'Analyser le dossier',
    'Bâtir la stratégie',
    'Rédiger la réponse',
    'Rencontrer un avocat',
    'Planifier la visio',
    'Clôturer le dossier',
  ],
  en: [
    'Analyse the case',
    'Build the strategy',
    'Draft the response',
    'Meet an attorney',
    'Schedule the call',
    'Close the case',
  ],
  nl: [
    'Dossier analyseren',
    'Strategie opbouwen',
    'Antwoord opstellen',
    'Een advocaat ontmoeten',
    'Videogesprek plannen',
    'Dossier afsluiten',
  ],
};

const LOCKED_STEPS = new Set([4, 5]); // TODO(product): gate by user.plan
const NOW_SUFFIX = {
  fr: ' · NOW',
  en: ' · NOW',
  nl: ' · NU',
};

function resolveLang(lang) {
  const l = String(lang || 'en').slice(0, 2).toLowerCase();
  return l === 'fr' || l === 'nl' ? l : 'en';
}

function formatCaseType(type, country, language) {
  const map = {
    fr: {
      housing: 'DOSSIER LOGEMENT', employment: 'DOSSIER TRAVAIL',
      debt: 'DOSSIER DETTE', insurance: 'DOSSIER ASSURANCE',
      contract: 'DOSSIER CONTRAT', consumer: 'DOSSIER CONSOMMATEUR',
      family: 'DOSSIER FAMILLE', court: 'DOSSIER JUDICIAIRE',
      nda: 'NDA', penal: 'DOSSIER PÉNAL',
      commercial: 'DOSSIER COMMERCIAL', other: 'DOSSIER LÉGAL',
    },
    en: {
      housing: 'HOUSING CASE', employment: 'EMPLOYMENT CASE',
      debt: 'DEBT CASE', insurance: 'INSURANCE CASE',
      contract: 'CONTRACT CASE', consumer: 'CONSUMER CASE',
      family: 'FAMILY CASE', court: 'COURT CASE',
      nda: 'NDA', penal: 'CRIMINAL CASE',
      commercial: 'COMMERCIAL CASE', other: 'LEGAL CASE',
    },
    nl: {
      housing: 'HUISVESTINGSDOSSIER', employment: 'ARBEIDSDOSSIER',
      debt: 'SCHULDDOSSIER', insurance: 'VERZEKERINGSDOSSIER',
      contract: 'CONTRACTDOSSIER', consumer: 'CONSUMENTENDOSSIER',
      family: 'FAMILIEDOSSIER', court: 'GERECHTELIJK DOSSIER',
      nda: 'NDA', penal: 'STRAFRECHTELIJK DOSSIER',
      commercial: 'HANDELSDOSSIER', other: 'JURIDISCH DOSSIER',
    },
  };
  const table = map[resolveLang(language)];
  const base = table[type] || table.other;
  const flag = country === 'BE' ? ' · BELGIQUE' : country === 'US' ? ' · USA' : '';
  return base + flag;
}

function formatDate(iso, language) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const lang = resolveLang(language);
  const fmt = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-BE' : lang === 'nl' ? 'nl-BE' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  return fmt.format(d).toUpperCase().replace(/\./g, '');
}

function TimelineStep({ n, label, state, isLastLocked, language, onLockClick }) {
  const common = {
    className: `tl-step ${state}`.trim(),
    'data-testid': `v3-timeline-step-${n}`,
  };
  const stepLabel = `STEP ${n}${state === 'current' ? NOW_SUFFIX[resolveLang(language)] : ''}`;

  if (state === 'locked') {
    return (
      <div
        {...common}
        role="button"
        tabIndex={0}
        aria-label={`${label} — locked`}
        onClick={onLockClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLockClick(); } }}
      >
        <div className="tl-row">
          <div className="tl-lock"><Lock size={11} strokeWidth={2.4} aria-hidden /></div>
          <div className="tl-num">{stepLabel}</div>
        </div>
        <div className="tl-label">{label}</div>
        <div className="tl-lock-overlay">
          <Lock size={13} strokeWidth={2.2} aria-hidden />
          <span>
            {resolveLang(language) === 'fr' ? "S'abonner pour débloquer"
             : resolveLang(language) === 'nl' ? 'Abonneer om te ontgrendelen'
             : 'Subscribe to unlock'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div {...common}>
      <div className="tl-row">
        {state === 'done'
          ? <div className="tl-check"><Check size={10} strokeWidth={3} aria-hidden /></div>
          : <div className="tl-dot" />}
        <div className="tl-num">{stepLabel}</div>
      </div>
      <div className="tl-label">{label}</div>
    </div>
  );
}

export default function V3CaseHeader({
  caseDoc, country, language, documentCount, letters = [],
  userPlan, onLockClick,
}) {
  const lang = resolveLang(language);
  const currentStep = deriveProgressStep(caseDoc, letters);
  const labels = STEP_LABELS[lang];

  const docCount = documentCount ?? (caseDoc?.document_count ?? 0);
  const isFree = userPlan === 'free';

  return (
    <div className="case-header" data-testid="v3-case-header">
      <div className="case-header-inner">
        <div className="case-eyebrow-row">
          <div className="case-eyebrow">{formatCaseType(caseDoc?.type, country, language)}</div>
          <div className="case-meta-live">
            {lang === 'fr' ? 'MISE À JOUR' : lang === 'nl' ? 'BIJGEWERKT' : 'UPDATED JUST NOW'}
          </div>
        </div>

        <div className="case-title-row">
          <h1 className="case-title">{caseDoc?.title || caseDoc?.name || '—'}</h1>
          <div className="case-meta">
            {lang === 'fr' ? 'OUVERT' : lang === 'nl' ? 'GEOPEND' : 'OPENED'} {formatDate(caseDoc?.created_at, language) || ''} · {docCount} DOC{docCount > 1 ? 'S' : ''}
          </div>
        </div>

        <div className="timeline">
          <div className="timeline-inner">
            {labels.map((label, i) => {
              const n = i + 1;
              const isLocked = LOCKED_STEPS.has(n) && isFree;
              const state = isLocked
                ? 'locked'
                : n < currentStep ? 'done'
                : n === currentStep ? 'current'
                : '';
              return (
                <TimelineStep
                  key={n}
                  n={n}
                  label={label}
                  state={state}
                  language={language}
                  onLockClick={onLockClick}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
