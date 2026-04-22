import React from 'react';
import WinWallSection from '../components/WinWallSection';
import PublicHeader from '../components/PublicHeader';
import { getStoredLocale } from '../data/landingTranslations';

export default function WinningCases() {
  const stored = getStoredLocale();
  const jurisdiction = stored.startsWith('be') ? 'BE' : 'US';
  const language = stored.split('-')[1] || stored.split('-')[0] || 'en';

  return (
    <div>
      <PublicHeader />
      <div style={{ paddingTop: 72 }}>
        <WinWallSection jurisdiction={jurisdiction} language={language} />
      </div>
    </div>
  );
}
