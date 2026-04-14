import React, { useEffect } from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';
import { formatCurrency } from '../../../utils/dashboard/formatCurrency';
import { PRICING } from '../../../config/pricing';

// Props:
//   isOpen, onClose
//   onChoiceSelect(choice: 'basic'|'signed'|'combo')
//   country, language
export default function GenerateLetterPopup({
  isOpen,
  onClose,
  onChoiceSelect,
  country = 'BE',
  language = 'fr',
}) {
  const t = useDashboardT(language);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    // Lock body scroll while modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const prices = PRICING[country] || PRICING.US;
  const attorneyPrice = prices.attorney_letter.amount;
  const liveCounselPrice = prices.live_counsel.amount;
  const comboPrice = attorneyPrice + liveCounselPrice;

  const options = [
    {
      key: 'basic',
      icon: '📄',
      iconBg: '#fafaf8',
      iconColor: '#6b7280',
      name: t('generate_letter.option_basic_name'),
      desc: t('generate_letter.option_basic_desc'),
      chances: '35%',
      delay: t('generate_letter.delay_basic'),
      price: t('generate_letter.option_basic_price'),
      priceLabel: t('generate_letter.option_basic_price_label'),
      priceIsFree: true,
      recommended: false,
    },
    {
      key: 'signed',
      icon: '⚖️',
      iconBg: '#eff6ff',
      iconColor: '#1a56db',
      name: t('generate_letter.option_signed_name'),
      desc: t('generate_letter.option_signed_desc'),
      chances: '62%',
      delay: t('generate_letter.delay_signed'),
      price: formatCurrency(attorneyPrice, country, language),
      priceLabel: t('generate_letter.option_signed_price_label'),
      priceIsFree: false,
      recommended: true,
    },
    {
      key: 'combo',
      icon: '🎯',
      iconBg: '#f0fdf4',
      iconColor: '#15803d',
      name: t('generate_letter.option_combo_name'),
      desc: t('generate_letter.option_combo_desc'),
      chances: '78%',
      delay: t('generate_letter.delay_combo'),
      price: formatCurrency(comboPrice, country, language),
      priceLabel: t('generate_letter.option_combo_price_label'),
      priceIsFree: false,
      recommended: false,
    },
  ];

  return (
    <div
      data-testid="letter-popup-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,10,15,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 18,
          maxWidth: 720,
          width: '100%',
          padding: '32px 36px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          data-testid="letter-popup-close"
          onClick={onClose}
          aria-label="close"
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32,
            background: '#f4f4f1', border: 'none', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6b7280', cursor: 'pointer', fontSize: 16,
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#1a56db', letterSpacing: 1.5, marginBottom: 8 }}>
            {t('generate_letter.popup_label')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 6 }}>
            {t('generate_letter.popup_title')}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            {t('generate_letter.popup_subtitle')}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              data-testid={`letter-option-${opt.key}`}
              onClick={() => onChoiceSelect?.(opt.key)}
              style={{
                border: opt.recommended ? '2px solid #1a56db' : '0.5px solid #e2e0db',
                borderRadius: 14,
                padding: '18px 22px',
                cursor: 'pointer',
                background: opt.recommended ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' : '#ffffff',
                boxShadow: opt.recommended ? '0 8px 24px rgba(26,86,219,0.1)' : 'none',
                display: 'flex', alignItems: 'center', gap: 18,
                position: 'relative',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              {opt.recommended && (
                <div style={{
                  position: 'absolute', top: -10, left: 22,
                  background: '#1a56db', color: '#ffffff',
                  fontSize: 9, fontWeight: 800,
                  padding: '4px 12px', borderRadius: 30, letterSpacing: 0.5,
                }}>
                  {t('generate_letter.option_signed_badge')}
                </div>
              )}

              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: opt.iconBg, color: opt.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 22,
              }}>
                {opt.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0f', marginBottom: 4, lineHeight: 1.3 }}>
                  {opt.name}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                  {opt.desc}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <strong style={{ fontWeight: 800, color: '#15803d' }}>{opt.chances}</strong> {t('generate_letter.stat_chances')}
                  </div>
                  <div style={{ fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {t('generate_letter.stat_delay')} : <strong style={{ fontWeight: 800, color: '#1a56db' }}>{opt.delay}</strong>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-end', gap: 4, flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 22, fontWeight: 900,
                  color: opt.priceIsFree ? '#16a34a' : '#0a0a0f',
                  letterSpacing: -0.5,
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                }}>
                  {opt.price}
                </div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>
                  {opt.priceLabel}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{
          textAlign: 'center', fontSize: 11, color: '#9ca3af',
          paddingTop: 18, borderTop: '0.5px solid #f4f4f1', lineHeight: 1.5,
        }}>
          {t('generate_letter.popup_footer')}
        </div>
      </div>
    </div>
  );
}
