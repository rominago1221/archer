import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';

// Props:
//   strategy: { intro_text, arguments: [{number, title, angle, impact}], objectives: {primary, fallback, avoided} }
//   language: 'fr' | 'en'
export default function StrategySection({ strategy, language = 'fr' }) {
  const t = useDashboardT(language);
  if (!strategy) return null;

  const args = Array.isArray(strategy.arguments) ? strategy.arguments : [];
  const objectives = strategy.objectives || {};

  return (
    <div
      data-testid="strategy-section"
      style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 60%)',
        border: '1px solid #1a56db',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 28,
        boxShadow: '0 12px 32px rgba(26,86,219,0.08)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a56db, #1e40af)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', fontSize: 18, fontWeight: 800,
          boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
        }}>
          A
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#1a56db', letterSpacing: '1.2px', marginBottom: 4 }}>
            {t('strategy.label')}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.5, lineHeight: 1.2 }}>
            {t('strategy.title')}
          </div>
        </div>
      </div>

      {/* Intro */}
      {strategy.intro_text && (
        <div
          data-testid="strategy-intro"
          style={{
            fontSize: 14, color: '#1e40af', lineHeight: 1.6,
            padding: '16px 20px',
            background: '#ffffff',
            borderRadius: 12,
            borderLeft: '3px solid #1a56db',
            marginBottom: 22,
          }}
          dangerouslySetInnerHTML={{ __html: strategy.intro_text }}
        />
      )}

      {/* Arguments */}
      {args.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#1a56db', letterSpacing: 1, marginBottom: 12 }}>
            {t('strategy.arguments_label')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {args.map((arg, i) => (
              <div
                key={i}
                data-testid={`strategy-argument-${arg.number || i + 1}`}
                style={{
                  background: '#ffffff',
                  border: '0.5px solid #c7d2fe',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#1a56db', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 900, flexShrink: 0,
                }}>
                  {arg.number || i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {arg.title && (
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0f', marginBottom: 6, lineHeight: 1.3 }}>
                      {arg.title}
                    </div>
                  )}
                  {arg.angle && (
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 8 }}>
                      {arg.angle}
                    </div>
                  )}
                  {arg.impact && (
                    <div style={{
                      fontSize: 11, background: '#f0fdf4', borderRadius: 6,
                      padding: '6px 10px', color: '#15803d',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      → <span dangerouslySetInnerHTML={{ __html: arg.impact }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Objectives */}
      {(objectives.primary || objectives.fallback || objectives.avoided) && (
        <div
          data-testid="strategy-objectives"
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '18px 22px',
            border: '0.5px solid #c7d2fe',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: '#1a56db', letterSpacing: 1, marginBottom: 12 }}>
            {t('strategy.objectives_label')}
          </div>
          {objectives.primary && (
            <ObjectiveItem
              variant="primary"
              title={t('strategy.objective_primary')}
              text={objectives.primary}
            />
          )}
          {objectives.fallback && (
            <ObjectiveItem
              variant="fallback"
              title={t('strategy.objective_fallback')}
              text={objectives.fallback}
            />
          )}
          {objectives.avoided && (
            <ObjectiveItem
              variant="avoided"
              title={t('strategy.objective_avoided')}
              text={objectives.avoided}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ObjectiveItem({ variant, title, text }) {
  const colors = {
    primary: { bg: '#dcfce7', fg: '#15803d', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="11" height="11"><polyline points="20 6 9 17 4 12" /></svg>
    ) },
    fallback: { bg: '#fef3c7', fg: '#b45309', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="11" height="11"><polyline points="3 12 8 12 11 5 13 19 16 12 21 12" /></svg>
    ) },
    avoided: { bg: '#fee2e2', fg: '#b91c1c', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    ) },
  }[variant];

  return (
    <div
      data-testid={`objective-${variant}`}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '8px 0',
        borderBottom: '0.5px solid #f4f4f1',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: colors.bg, color: colors.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2,
      }}>
        {colors.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: colors.fg, letterSpacing: 0.4, marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: '#0a0a0f', lineHeight: 1.4 }}>
          {text}
        </div>
      </div>
    </div>
  );
}
