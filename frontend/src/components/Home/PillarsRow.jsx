import React from 'react';
import { useHomeT } from '../../hooks/useHomeT';
import { formatCurrency } from '../../utils/dashboard/formatCurrency';

// Splits a formatted currency like "49,99€" or "$49.99" into {lead, suffix}
// so the first segment can sit in the big blue number and the trailing
// units stay in the smaller suffix slot, matching the mockup typography.
function splitCurrencyDisplay(amount, country, language) {
  const formatted = formatCurrency(amount, country, language);
  if (!formatted) return { lead: '', suffix: '' };
  // BE/fr: "49,99€" → lead "49", suffix ",99€"
  if (country === 'BE') {
    const match = formatted.match(/^(-?\d+)(.*)$/);
    if (match) return { lead: match[1], suffix: match[2] };
  }
  // US/en: "$49.99" → lead "$49", suffix ".99"
  const match = formatted.match(/^(\$?-?\d+)(.*)$/);
  if (match) return { lead: match[1], suffix: match[2] };
  return { lead: formatted, suffix: '' };
}

function Pillar({ number, suffix, label, sub, isLast }) {
  return (
    <div style={{
      padding: '44px 32px',
      textAlign: 'center',
      position: 'relative',
      borderRight: isLast ? 'none' : '0.5px solid #e2e0db',
    }}>
      <div style={{
        fontSize: 56, fontWeight: 900, letterSpacing: -3,
        lineHeight: 1, marginBottom: 12,
        background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontVariantNumeric: 'tabular-nums',
        display: suffix ? 'inline-flex' : 'block',
        alignItems: 'baseline', gap: 2,
      }}>
        {number}
        {suffix && (
          <span style={{
            fontSize: 24, fontWeight: 800,
            color: '#1a56db', letterSpacing: -1,
            WebkitTextFillColor: '#1a56db',
          }}>
            {suffix}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 800, color: '#0a0a0f',
        letterSpacing: 0.3, textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 12, color: '#6b7280',
        lineHeight: 1.4, fontWeight: 500,
      }}>
        {sub}
      </div>
    </div>
  );
}

export default function PillarsRow({ language = 'en', country = 'BE' }) {
  const t = useHomeT(language);
  const priceParts = splitCurrencyDisplay(49.99, country, language);

  const pillars = [
    {
      number: t('pillars.pillar1.number'),
      suffix: '',
      label: t('pillars.pillar1.label'),
      sub: t('pillars.pillar1.sub'),
    },
    {
      number: t('pillars.pillar2.number'),
      suffix: t('pillars.pillar2.suffix'),
      label: t('pillars.pillar2.label'),
      sub: t('pillars.pillar2.sub'),
    },
    {
      number: priceParts.lead,
      suffix: priceParts.suffix,
      label: t('pillars.pillar3.label'),
      sub: t('pillars.pillar3.sub'),
    },
    {
      number: t('pillars.pillar4.number'),
      suffix: t('pillars.pillar4.suffix'),
      label: t('pillars.pillar4.label'),
      sub: t('pillars.pillar4.sub'),
    },
  ];

  return (
    <div
      data-testid="home-pillars-row"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 0,
        background: '#ffffff',
        borderRadius: 24,
        padding: 0,
        marginTop: 100,
        boxShadow: '0 4px 24px rgba(10,10,15,0.04)',
        border: '0.5px solid #e2e0db',
        overflow: 'hidden',
      }}
    >
      {pillars.map((p, i) => (
        <Pillar
          key={i}
          number={p.number}
          suffix={p.suffix}
          label={p.label}
          sub={p.sub}
          isLast={i === pillars.length - 1}
        />
      ))}
    </div>
  );
}
