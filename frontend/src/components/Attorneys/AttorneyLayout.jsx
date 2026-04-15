import React from 'react';
import AttorneySidebar from './AttorneySidebar';
import AttorneyTopbar from './AttorneyTopbar';
import { ToastProvider } from './Toasts';
import { useAttorneyAuth } from '../../hooks/attorneys/useAttorneyAuth';

export default function AttorneyLayout({ children }) {
  const { attorney, logout, setAvailability } = useAttorneyAuth();
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-neutral-50">
        <AttorneySidebar attorney={attorney} onLogout={logout} />
        <main className="flex-1 flex flex-col min-w-0">
          <AttorneyTopbar attorney={attorney} onAvailabilityChange={setAvailability} />
          <div className="flex-1 p-8 overflow-y-auto">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
