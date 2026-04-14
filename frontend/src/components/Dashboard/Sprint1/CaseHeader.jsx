import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';
import { mapBackendCaseType, getCaseTypeTag } from '../../../utils/dashboard/caseType';

function formatDate(dateStr, language) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Top of page: colored type tag + title + meta line.
// Props: caseDoc, country, language, documentCount
export default function CaseHeader({ caseDoc = {}, country = 'BE', language = 'fr', documentCount = 0 }) {
  const t = useDashboardT(language);
  const caseTypeV7 = mapBackendCaseType(caseDoc.type);
  const tag = getCaseTypeTag(caseTypeV7, country, language);
  const title = caseDoc.title || '';
  const openedOn = formatDate(caseDoc.created_at, language);
  const docKey = documentCount === 1 ? 'common.document_count_one' : 'common.document_count_many';

  return (
    <div data-testid="case-header" style={{ marginBottom: 24 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', background: '#fef3c7', borderRadius: 6,
        fontSize: 9, fontWeight: 800, color: '#b45309',
        letterSpacing: '0.8px', marginBottom: 12,
      }}>
        <span>{tag.emoji}</span>
        <span>{tag.label}</span>
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: '#0a0a0f',
        letterSpacing: -1, lineHeight: 1.15, marginBottom: 8, margin: 0,
      }}>
        {title}
      </h1>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
        {openedOn && <>{t('common.opened_on', { date: openedOn })}</>}
        {openedOn && ' · '}
        {t(docKey, { count: documentCount })}
        {' · '}
        {t('common.updated_just_now')}
      </div>
    </div>
  );
}
