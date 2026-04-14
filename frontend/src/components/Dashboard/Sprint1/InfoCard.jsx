import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';
import { formatCurrency } from '../../../utils/dashboard/formatCurrency';

// Props:
//   deadline       { date: 'YYYY-MM-DD', days_remaining: number, description?: string }
//   amounts        { at_stake, max_risk, savings }    // numbers (or nulls)
//   analysisDepth  { articles_consulted, jurisprudences_verified, archer_confidence }
//   country        'BE' | 'US'
//   language       'fr' | 'en'
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

export default function InfoCard({
  deadline = {},
  amounts = {},
  analysisDepth = {},
  country = 'BE',
  language = 'fr',
}) {
  const t = useDashboardT(language);
  const daysRemaining = deadline?.days_remaining;
  const expired = daysRemaining !== null && daysRemaining !== undefined && daysRemaining < 0;

  return (
    <div
      data-testid="info-card"
      style={{
        background: '#ffffff',
        border: '0.5px solid #e2e0db',
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: '0 8px 32px rgba(10,10,15,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Deadline pill */}
      {(deadline?.date || daysRemaining !== null && daysRemaining !== undefined) && (
        <div
          data-testid="deadline-pill"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%)',
            border: '1px solid #fecaca',
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: '#b91c1c',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontSize: 14,
            }}>
              ⏰
            </div>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#b91c1c', letterSpacing: 0.5 }}>
              <span style={{
                fontSize: 19, fontWeight: 900, lineHeight: 1,
                display: 'block', marginBottom: 3, letterSpacing: -0.6,
              }}>
                {expired
                  ? t('hero.deadline_expired')
                  : `${Math.max(0, daysRemaining ?? 0)} ${t('hero.deadline_days_unit')}`}
              </span>
              {t('hero.deadline_label')}
            </div>
          </div>
          {deadline?.date && (
            <div style={{ fontSize: 9, color: '#b91c1c', textAlign: 'right' }}>
              <strong style={{ fontWeight: 800, display: 'block', fontSize: 10 }}>
                {formatDate(deadline.date, language)}
              </strong>
              {t('hero.deadline_before_label')}
            </div>
          )}
        </div>
      )}

      {/* Enjeu financier */}
      {(amounts?.at_stake != null || amounts?.max_risk != null) && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: '1.2px',
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            {t('hero.financial_label')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 8 }}>
            <FinancialCell label={t('hero.financial_amount')} value={amounts.at_stake} country={country} language={language} />
            <FinancialCell label={t('hero.financial_max_risk')} value={amounts.max_risk} country={country} language={language} variant="danger" />
            <FinancialCell label={t('hero.financial_savings')} value={amounts.savings} country={country} language={language} variant="savings" />
          </div>
        </div>
      )}

      {/* Profondeur */}
      <div>
        <div style={{
          fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: '1.2px',
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {t('hero.depth_label')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <DepthRow
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
            text={t('hero.depth_articles', { count: analysisDepth.articles_consulted || 0 })}
            boldPart={String(analysisDepth.articles_consulted || 0)}
          />
          <DepthRow
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM3 9h18M9 3v18" /></svg>}
            text={t('hero.depth_jurisprudences', { count: analysisDepth.jurisprudences_verified || 0 })}
            boldPart={String(analysisDepth.jurisprudences_verified || 0)}
          />
          <DepthRow
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>}
            text={t('hero.depth_confidence')}
            trailing={`${analysisDepth.archer_confidence || 0}%`}
          />
        </div>
      </div>
    </div>
  );
}

function FinancialCell({ label, value, country, language, variant }) {
  if (value == null) return <div />;
  const isSavings = variant === 'savings';
  const isDanger = variant === 'danger';
  return (
    <div
      data-testid={`financial-cell-${variant || 'default'}`}
      style={{
        background: isSavings ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : '#fafaf8',
        border: isSavings ? '0.5px solid #16a34a' : 'none',
        borderRadius: 8,
        padding: '10px 11px',
      }}
    >
      <div style={{
        fontSize: 8, fontWeight: 800, letterSpacing: 0.4, marginBottom: 3,
        color: isSavings ? '#15803d' : '#9ca3af',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: isSavings ? 17 : 16, fontWeight: 900,
        color: isSavings ? '#15803d' : isDanger ? '#b91c1c' : '#0a0a0f',
        letterSpacing: -0.4, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {formatCurrency(value, country, language)}
      </div>
    </div>
  );
}

function DepthRow({ icon, text, boldPart, trailing }) {
  // Split text at the bolded token so we can render the count in bold.
  let before = text;
  let after = '';
  if (boldPart && text.includes(boldPart)) {
    const idx = text.indexOf(boldPart);
    before = text.slice(0, idx);
    after = text.slice(idx + boldPart.length);
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '7px 11px', background: '#fafaf8', borderRadius: 8,
    }}>
      <div style={{
        width: 22, height: 22, background: '#eff6ff', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#1a56db', flexShrink: 0,
      }}>
        {React.cloneElement(icon, { width: 11, height: 11 })}
      </div>
      <div style={{ flex: 1, fontSize: 11, color: '#0a0a0f' }}>
        {boldPart ? (
          <>{before}<strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{boldPart}</strong>{after}</>
        ) : (
          text
        )}
      </div>
      {trailing && (
        <div style={{ fontSize: 11, fontWeight: 900, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
          {trailing}
        </div>
      )}
    </div>
  );
}
