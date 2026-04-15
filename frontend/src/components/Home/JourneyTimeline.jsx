import React from 'react';
import JourneyStep from './JourneyStep';
import { useHomeT } from '../../hooks/useHomeT';
import { formatCurrency } from '../../utils/dashboard/formatCurrency';

export default function JourneyTimeline({ language = 'en', country = 'BE' }) {
  const t = useHomeT(language);
  const attorneyPrice = formatCurrency(49.99, country, language);

  const steps = [
    {
      num: t('steps.step1.label'),
      iconName: 'upload',
      title: t('steps.step1.title'),
      descParts: {
        main: t('steps.step1.desc_main'),
        highlight: t('steps.step1.desc_highlight'),
      },
      features: [
        { text: t('steps.step1.feature1') },
        { text: t('steps.step1.feature2') },
      ],
      isFinal: false,
    },
    {
      num: t('steps.step2.label'),
      iconName: 'search',
      title: t('steps.step2.title'),
      descParts: {
        main: t('steps.step2.desc_main'),
        highlight: t('steps.step2.desc_highlight'),
      },
      features: [
        { text: t('steps.step2.feature1'), isLive: true },
        { text: t('steps.step2.feature2') },
      ],
      isFinal: false,
    },
    {
      num: t('steps.step3.label'),
      iconName: 'star',
      title: t('steps.step3.title'),
      descParts: {
        highlight: t('steps.step3.desc_highlight'),
        after: t('steps.step3.desc_after'),
      },
      features: [
        { text: t('steps.step3.feature1') },
        { text: t('steps.step3.feature2') },
      ],
      isFinal: false,
    },
    {
      num: t('steps.step4.label'),
      iconName: 'send',
      title: t('steps.step4.title'),
      descParts: {
        main: t('steps.step4.desc_main'),
        highlight: t('steps.step4.desc_highlight'),
      },
      features: [
        { text: t('steps.step4.feature1') },
        { text: t('steps.step4.feature2_template', { price: attorneyPrice }) },
      ],
      isFinal: true,
    },
  ];

  return (
    <div data-testid="journey-timeline" style={{ position: 'relative', padding: '30px 0 40px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 16,
        position: 'relative',
        zIndex: 1,
      }}>
        {steps.map((s) => (
          <JourneyStep
            key={s.num}
            num={s.num}
            iconName={s.iconName}
            title={s.title}
            descParts={s.descParts}
            features={s.features}
            isFinal={s.isFinal}
          />
        ))}
      </div>
    </div>
  );
}
