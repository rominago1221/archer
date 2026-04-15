import React from 'react';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import LiveCounselStats from '../../components/Attorneys/LiveCounselStats';
import UpcomingCallsList from '../../components/Attorneys/UpcomingCallsList';
import CalendlyIntegrationCard from '../../components/Attorneys/CalendlyIntegrationCard';
import { useAttorneyAuth } from '../../hooks/attorneys/useAttorneyAuth';
import { useLiveCounsel } from '../../hooks/attorneys/useLiveCounsel';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

export default function LiveCounsel() {
  const { attorney, refresh } = useAttorneyAuth();
  const { stats, upcoming, loading, error, join } = useLiveCounsel();
  const { t } = useAttorneyT();
  const tx = t.live_counsel_ext || {};

  if (loading || !attorney) {
    return (
      <AttorneyLayout>
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-neutral-200 rounded" />
          <div className="h-56 bg-neutral-200 rounded" />
        </div>
      </AttorneyLayout>
    );
  }

  const nextCallAt = upcoming.length ? upcoming[0].scheduled_at : null;

  return (
    <AttorneyLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl text-neutral-900">{tx.title}</h1>
            <p className="text-sm text-neutral-500 mt-1">{tx.subtitle}</p>
          </div>
          {attorney.calendly_url && (
            <a
              href={attorney.calendly_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            >
              📅 {tx.open_my_calendly}
            </a>
          )}
        </div>

        {!attorney.calendly_url && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-medium text-amber-900 mb-1">
              ⚠️ {tx.calendly_not_connected_title}
            </div>
            <div className="text-xs text-amber-800">
              {tx.calendly_not_connected_body}
            </div>
          </div>
        )}

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <LiveCounselStats stats={stats} nextCallAt={nextCallAt} />

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 mt-8">
          <UpcomingCallsList calls={upcoming} onJoin={join} />
          <CalendlyIntegrationCard attorney={attorney} onChange={refresh} />
        </div>
      </div>
    </AttorneyLayout>
  );
}
