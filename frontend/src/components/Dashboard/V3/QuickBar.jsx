import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Mail } from 'lucide-react';
import ExplainSimplyButton from '../ExplainSimplyButton';

// Sticky top bar for /cases/:id. Breadcrumb + version pill + 2 CTAs.
// "Envoyer ma lettre" scrolls the page to the StrCard (Act 2) where the 3
// inline send options live.
export default function QuickBar({
  caseId,
  caseDoc,
  language,
  t,
  currentVersion,
  viewingVersion,
  onOpenVersionPicker,
}) {
  const navigate = useNavigate();

  const scrollToStrCard = () => {
    const el = document.querySelector('[data-testid="act2-str-card"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const version = viewingVersion || currentVersion || 1;
  const versionLabel = viewingVersion
    ? `V${version}`
    : `V${version} LATEST`;

  const title = caseDoc?.title || caseDoc?.name || t('common.back_to_cases');
  const sendLetterLabel = language === 'fr'
    ? 'Envoyer ma lettre'
    : language === 'nl' ? 'Brief versturen'
    : 'Send my letter';

  return (
    <div className="quickbar" data-testid="v3-quickbar">
      <div className="breadcrumb">
        <a
          href="/dashboard"
          onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
          data-testid="quickbar-breadcrumb-cases"
        >
          {t('common.back_to_cases')}
        </a>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{title}</span>
      </div>
      <div className="quick-actions">
        <button
          type="button"
          className="version-pill"
          onClick={onOpenVersionPicker}
          data-testid="quickbar-version-pill"
        >
          {versionLabel}
          <ChevronDown size={10} strokeWidth={2.5} aria-hidden />
        </button>
        <ExplainSimplyButton
          caseId={caseId}
          caseDoc={caseDoc}
          language={language}
          variant="ghost"
        />
        <button
          type="button"
          className="quick-btn primary"
          onClick={scrollToStrCard}
          data-testid="quickbar-send-letter"
        >
          <Mail size={12} aria-hidden />
          {sendLetterLabel}
        </button>
      </div>
    </div>
  );
}
