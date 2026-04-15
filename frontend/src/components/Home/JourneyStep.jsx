import React from 'react';

// Inline SVG icons for the 4 steps. 22×22 in a 44×44 rounded square.
const ICONS = {
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" width="14" height="14">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

// Props:
//   num           '01' | '02' | '03' | '04'
//   iconName      upload | search | star | send
//   title         string
//   descParts     { main?, highlight?, after? } — rendered in order with highlight coloured
//   features      array of { text, isLive? } (isLive replaces the check with a pulsing green dot)
//   isFinal       boolean — green glass variant (step 4)
export default function JourneyStep({
  num,
  iconName,
  title,
  descParts = {},
  features = [],
  isFinal = false,
}) {
  const [hovered, setHovered] = React.useState(false);

  const glass = isFinal
    ? {
        base: 'rgba(220, 252, 231, 0.6)',
        hover: 'rgba(220, 252, 231, 0.8)',
        border: 'rgba(134, 239, 172, 0.8)',
        shadowBase: '0 8px 32px rgba(34, 197, 94, 0.12)',
        shadowHover: '0 16px 48px rgba(34, 197, 94, 0.18)',
      }
    : {
        base: 'rgba(255, 255, 255, 0.6)',
        hover: 'rgba(255, 255, 255, 0.8)',
        border: 'rgba(255, 255, 255, 0.8)',
        shadowBase: '0 8px 32px rgba(31, 38, 135, 0.08)',
        shadowHover: '0 16px 48px rgba(31, 38, 135, 0.15)',
      };

  const numColor = isFinal ? '#15803d' : '#1a56db';
  const iconGradient = isFinal
    ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
    : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)';
  const iconShadow = isFinal
    ? '0 4px 16px rgba(34, 197, 94, 0.35)'
    : '0 4px 16px rgba(59, 130, 246, 0.35)';
  const highlightColor = isFinal ? '#15803d' : '#1a56db';
  const featureBg = isFinal ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.5)';
  const featureBorder = isFinal ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.7)';
  const checkColor = isFinal ? '#15803d' : '#1a56db';

  return (
    <div
      data-testid={`journey-step-${num}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? glass.hover : glass.base,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${glass.border}`,
        borderRadius: 24,
        padding: '32px 24px 28px',
        boxShadow: hovered ? glass.shadowHover : glass.shadowBase,
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        position: 'relative',
      }}
    >
      {/* num + icon row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 22,
      }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: numColor,
          background: 'rgba(255,255,255,0.7)',
          padding: '6px 12px', borderRadius: 30,
          letterSpacing: 1,
          border: '1px solid rgba(255,255,255,0.9)',
        }}>
          {num}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: iconGradient,
          color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: iconShadow,
        }}>
          {ICONS[iconName] || ICONS.upload}
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 24, fontWeight: 900, color: '#0a0a0f',
        textAlign: 'left', marginBottom: 12,
        letterSpacing: -0.7, lineHeight: 1.1,
      }}>
        {title}
      </div>

      {/* Description — main / highlight / after rendered in the spec order */}
      <div style={{
        fontSize: 14, color: '#4b5563',
        textAlign: 'left', lineHeight: 1.6,
        fontWeight: 500,
      }}>
        {descParts.main && <>{descParts.main} </>}
        {descParts.highlight && (
          <span style={{ color: highlightColor, fontWeight: 800 }}>
            {descParts.highlight}
          </span>
        )}
        {descParts.after && <> {descParts.after}</>}
      </div>

      {/* Features */}
      <div style={{
        paddingTop: 0, marginTop: 22,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 12, color: '#0a0a0f',
              fontWeight: 600, textAlign: 'left', lineHeight: 1.3,
              padding: '8px 12px',
              background: featureBg,
              borderRadius: 8,
              border: `1px solid ${featureBorder}`,
            }}
          >
            {f.isLive ? (
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#16a34a', marginRight: 4, flexShrink: 0,
                boxShadow: '0 0 0 0 rgba(22, 163, 74, 0.7)',
                animation: 'liveDotPulse 1.6s ease-in-out infinite',
              }} />
            ) : (
              <span style={{
                width: 16, height: 16,
                color: checkColor, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {ICONS.check}
              </span>
            )}
            <span>{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
