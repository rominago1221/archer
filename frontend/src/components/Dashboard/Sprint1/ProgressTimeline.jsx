import React from 'react';
import { useDashboardT } from '../../../hooks/useDashboardT';

// 6-step horizontal progress timeline. Props:
//   currentStep: 1..6 (int) — inclusive: step N is "current", steps < N are "done"
//   language: 'fr' | 'en'
export default function ProgressTimeline({ currentStep = 2, language = 'fr' }) {
  const t = useDashboardT(language);

  const steps = [
    { num: 1, labelKey: 'timeline.step1' },
    { num: 2, labelKey: 'timeline.step2' },
    { num: 3, labelKey: 'timeline.step3' },
    { num: 4, labelKey: 'timeline.step4' },
    { num: 5, labelKey: 'timeline.step5' },
    { num: 6, labelKey: 'timeline.step6' },
  ];

  return (
    <div
      data-testid="progress-timeline"
      style={{
        background: '#ffffff',
        border: '0.5px solid #e2e0db',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 20,
      }}
    >
      <div style={{
        fontSize: 9, fontWeight: 800, color: '#9ca3af',
        letterSpacing: '1.2px', marginBottom: 14,
      }}>
        {t('timeline.label')}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, position: 'relative' }}>
        {steps.map((s, i) => {
          const isDone = s.num < currentStep;
          const isCurrent = s.num === currentStep;
          const circleBg = isDone ? '#16a34a' : isCurrent ? '#1a56db' : '#e2e0db';
          const circleColor = (isDone || isCurrent) ? '#ffffff' : '#9ca3af';
          const labelColor = isDone ? '#16a34a' : isCurrent ? '#1a56db' : '#9ca3af';
          const labelWeight = (isDone || isCurrent) ? 700 : 500;
          const lineBg = isDone ? '#16a34a' : '#e2e0db';
          const isLast = i === steps.length - 1;

          return (
            <div
              key={s.num}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  top: 11,
                  left: 'calc(50% + 12px)',
                  right: 'calc(-50% + 12px)',
                  height: 2,
                  background: lineBg,
                  zIndex: 1,
                }} />
              )}
              <div
                data-testid={`progress-step-${s.num}`}
                data-state={isDone ? 'done' : isCurrent ? 'current' : 'upcoming'}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  margin: '0 auto 8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  background: circleBg, color: circleColor,
                  border: '2px solid #ffffff',
                  position: 'relative', zIndex: 2,
                  boxShadow: isCurrent ? '0 0 0 4px rgba(26,86,219,0.15)' : 'none',
                }}
              >
                {isDone ? '\u2713' : s.num}
              </div>
              <div
                style={{
                  fontSize: 10, lineHeight: 1.2,
                  color: labelColor,
                  fontWeight: labelWeight,
                  wordBreak: 'break-word',
                  padding: '0 4px',
                }}
                dangerouslySetInnerHTML={{ __html: t(s.labelKey) }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
