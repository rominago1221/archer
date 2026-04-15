import React from 'react';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import { useAttorneyAuth } from '../../hooks/attorneys/useAttorneyAuth';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

export default function AttorneyDashboard() {
  const { attorney } = useAttorneyAuth();
  const { t } = useAttorneyT();
  const name = `${attorney?.first_name || ''} ${attorney?.last_name || ''}`.trim();
  const welcome = t.dashboard.welcome.replace('{{name}}', name);

  return (
    <AttorneyLayout>
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl text-neutral-900 mb-2">{welcome}</h1>
        <p className="text-neutral-600 mb-8">{t.dashboard.placeholder}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="text-sm font-medium text-neutral-900 mb-2">{t.dashboard.editProfile}</div>
            <div className="text-xs text-neutral-500 mb-4">{t.dashboard.comingSoon}</div>
            <button
              disabled
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-200 text-neutral-400 cursor-not-allowed"
            >
              {t.dashboard.editProfile}
            </button>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="text-sm font-medium text-neutral-900 mb-2">{t.dashboard.availability}</div>
            <div className="text-xs text-neutral-500 mb-4">
              {attorney?.available_for_cases ? t.dashboard.available : t.dashboard.unavailable}
            </div>
            <div className="text-[11px] text-neutral-400">Toggle via le topbar ↑</div>
          </div>
        </div>
      </div>
    </AttorneyLayout>
  );
}
