import React, { useState } from 'react';
import { X, FileText, Shield, Scale, Check, Clock, BadgeCheck } from 'lucide-react';

const T = {
  en: {
    title: 'Generate your dispute letter',
    subtitle: 'Choose how you want to send this letter',
    opt1Title: 'Letter in my name',
    opt1Badge: 'Included in your plan',
    opt1Desc: (authority) => `Archer drafts the complete letter. You sign it and send it yourself to ${authority || 'the recipient'}.`,
    opt1Btn: 'Generate my letter',
    divider: 'or for more impact',
    opt2Badge: 'Recommended',
    opt2Title: 'Letter signed by partner attorney',
    opt2Desc: 'Archer drafts the letter. A licensed partner attorney reviews it, signs it with their official bar number, and sends it on law firm letterhead.',
    opt2Btn: (price) => `Order — ${price}`,
    oneTime: 'one-time payment',
    pills: ['Licensed attorney', 'Official bar number', 'Firm letterhead', 'Response 2-4h'],
    disclaimer: 'Attorney signature constitutes limited scope representation. The signing attorney assumes professional responsibility. Non-refundable after attorney validation.',
  },
  fr: {
    title: 'Générer votre lettre de contestation',
    subtitle: 'Choisissez comment vous souhaitez envoyer cette lettre',
    opt1Title: 'Lettre en mon nom',
    opt1Badge: 'Inclus dans votre plan',
    opt1Desc: (authority) => `Archer rédige la lettre complète. Vous la signez et l'envoyez vous-même${authority ? ` au ${authority}` : ''}.`,
    opt1Btn: 'Générer ma lettre',
    divider: 'ou pour plus d\'impact',
    opt2Badge: 'Recommandé',
    opt2Title: 'Lettre signée par un avocat partenaire',
    opt2Desc: 'Archer rédige la lettre. Un avocat partenaire agréé la révise, la signe avec son numéro de barreau officiel, et l\'envoie sous en-tête de cabinet.',
    opt2Btn: (price) => `Commander — ${price}`,
    oneTime: 'paiement unique',
    pills: ['Avocat agréé', 'N° barreau officiel', 'En-tête cabinet', 'Réponse 2-4h'],
    disclaimer: 'La signature constitue une représentation limitée (unbundled legal service). L\'avocat est responsable du contenu qu\'il signe. Paiement non remboursable après validation.',
  },
  nl: {
    title: 'Genereer uw betwistingsbrief',
    subtitle: 'Kies hoe u deze brief wilt verzenden',
    opt1Title: 'Brief op mijn naam',
    opt1Badge: 'Inbegrepen in uw plan',
    opt1Desc: (authority) => `Archer stelt de volledige brief op. U ondertekent en verstuurt deze zelf${authority ? ` naar ${authority}` : ''}.`,
    opt1Btn: 'Genereer mijn brief',
    divider: 'of voor meer impact',
    opt2Badge: 'Aanbevolen',
    opt2Title: 'Brief ondertekend door partneradvocaat',
    opt2Desc: 'Archer stelt de brief op. Een erkende partneradvocaat herziet, ondertekent met officieel balienummer en verstuurt op briefhoofd van kantoor.',
    opt2Btn: (price) => `Bestellen — ${price}`,
    oneTime: 'eenmalige betaling',
    pills: ['Erkende advocaat', 'Officieel balienummer', 'Briefhoofd kantoor', 'Antwoord 2-4u'],
    disclaimer: 'De ondertekening vormt een beperkte vertegenwoordiging. De ondertekende advocaat neemt beroepsverantwoordelijkheid. Niet-terugbetaalbaar na validatie.',
  },
};

const StampIcon = () => (
  <div style={{
    width: 72, height: 72, borderRadius: '50%', border: '2px dashed #1a56db',
    transform: 'rotate(-12deg)', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{
      width: 60, height: 60, borderRadius: '50%', border: '1px solid #1a56db',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
    }}>
      <span style={{ fontSize: 6.5, fontWeight: 500, color: '#1a56db', lineHeight: 1 }}>VALIDÉ &</span>
      <span style={{ fontSize: 14, lineHeight: 1 }}>&#x2696;&#xFE0F;</span>
      <span style={{ fontSize: 5.5, color: '#1a56db', textAlign: 'center', lineHeight: 1.3 }}>SIGNÉ PAR<br />AVOCAT</span>
    </div>
  </div>
);

const AttorneyLetterModal = ({ caseData, lang, jurisdiction, onClose, onGenerateFree, onOrderAttorney, opposingPartyName }) => {
  const t = T[lang] || T.en;
  const isBelgium = jurisdiction === 'BE';
  const price = isBelgium ? '39€' : '$49';

  return (
    <div data-testid="attorney-letter-modal" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16,
        border: '0.5px solid #e2e0db', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid #e2e0db', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#0a0a0f' }}>{t.title}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t.subtitle}</div>
          </div>
          <button data-testid="attorney-letter-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#9ca3af" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ═══ OPTION 1 — Free Letter ═══ */}
          <div data-testid="option-free-letter" style={{
            border: '0.5px solid #e2e0db', borderRadius: 10, padding: 14,
            cursor: 'pointer', transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f4f4f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={18} color="#6b7280" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0f', marginBottom: 4 }}>{t.opt1Title}</div>
                <span style={{ background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #86efac', fontSize: 10, borderRadius: 10, padding: '2px 8px' }}>
                  {t.opt1Badge}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.55, marginBottom: 10 }}>
              {t.opt1Desc(opposingPartyName)}
            </div>
            <button data-testid="generate-free-letter" onClick={onGenerateFree} style={{
              width: '100%', padding: '9px', borderRadius: 8, border: '0.5px solid #d1d5db',
              background: '#fff', fontSize: 12, fontWeight: 500, color: '#0a0a0f', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              {t.opt1Btn}
            </button>
          </div>

          {/* ═══ Divider ═══ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 0.5, background: '#e2e0db' }} />
            <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{t.divider}</span>
            <div style={{ flex: 1, height: 0.5, background: '#e2e0db' }} />
          </div>

          {/* ═══ OPTION 2 — Attorney Letter ═══ */}
          <div data-testid="option-attorney-letter" style={{
            border: '1.5px solid #1a56db', borderRadius: 10, background: '#f8faff', overflow: 'hidden',
          }}>
            {/* Recommended badge — own row */}
            <div style={{ padding: '10px 14px 0' }}>
              <span style={{ background: '#1a56db', color: '#fff', fontSize: 9, fontWeight: 500, borderRadius: 10, padding: '2px 8px', display: 'inline-block' }}>
                {t.opt2Badge}
              </span>
            </div>

            {/* Card body */}
            <div style={{ padding: '8px 14px 14px' }}>
              {/* Main row: icon + title/price + stamp */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Shield size={18} color="#1a56db" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0c3275', marginBottom: 4 }}>{t.opt2Title}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 22, fontWeight: 500, color: '#1a56db' }}>{price}</span>
                    <span style={{ fontSize: 10, color: '#6b7280' }}>{t.oneTime}</span>
                  </div>
                </div>
                <StampIcon />
              </div>

              {/* Description */}
              <div style={{ fontSize: 11, color: '#1e40af', lineHeight: 1.55, marginBottom: 10 }}>
                {t.opt2Desc}
              </div>

              {/* Trust pills */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                {t.pills.map((pill) => (
                  <span key={pill} style={{
                    background: '#eff6ff', color: '#1a56db', border: '0.5px solid #bfdbfe',
                    fontSize: 9, fontWeight: 500, padding: '2px 7px', borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <Check size={8} strokeWidth={3} /> {pill}
                  </span>
                ))}
              </div>

              {/* Order button */}
              <button data-testid="order-attorney-letter" onClick={onOrderAttorney} style={{
                width: '100%', padding: '9px', borderRadius: 8, border: 'none',
                background: '#1a56db', color: '#fff', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1547b8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1a56db'; }}
              >
                {t.opt2Btn(price)}
              </button>
            </div>
          </div>
        </div>

        {/* Footer disclaimer */}
        <div style={{ borderTop: '0.5px solid #e2e0db', padding: '10px 20px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.5 }}>{t.disclaimer}</div>
        </div>
      </div>
    </div>
  );
};

export default AttorneyLetterModal;
