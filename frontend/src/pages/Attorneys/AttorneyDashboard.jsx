import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import LawyerSubscriptionSection from '../../components/Attorneys/LawyerSubscriptionSection';
import { useAttorneyAuth } from '../../hooks/attorneys/useAttorneyAuth';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';
import '../../styles/credits.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Toggle: "Je suis disponible pour les appels" — maps to attorney.is_live.
// When true, the attorney shows up in the client-side Avocats rail card.
function LiveStatusToggle({ initialIsLive, lang }) {
  const [isLive, setIsLive] = useState(Boolean(initialIsLive));
  const [busy, setBusy] = useState(false);

  useEffect(() => { setIsLive(Boolean(initialIsLive)); }, [initialIsLive]);

  const copy = lang === 'en' ? {
    on: '🟢 I am available for calls', off: '⚫ Unavailable',
  } : lang === 'nl' ? {
    on: '🟢 Ik ben beschikbaar voor oproepen', off: '⚫ Niet beschikbaar',
  } : {
    on: '🟢 Je suis disponible pour les appels', off: '⚫ Indisponible',
  };

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !isLive;
    try {
      await axios.patch(`${API}/attorneys/profile/live-status`, { is_live: next }, { withCredentials: true });
      setIsLive(next);
    } catch (err) {
      // keep previous state on failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: isLive ? '#EAF3DE' : '#F1EFE8',
      borderRadius: 8, marginBottom: 16,
    }} data-testid="attorney-live-toggle">
      <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 22, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isLive}
          onChange={toggle}
          disabled={busy}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute', cursor: 'pointer',
          top: 0, left: 0, right: 0, bottom: 0,
          background: isLive ? '#16a34a' : '#c9c7bd',
          borderRadius: 22, transition: '0.2s',
        }} />
        <span style={{
          position: 'absolute',
          content: '""',
          height: 18, width: 18,
          left: isLive ? 22 : 2,
          top: 2,
          background: '#fff',
          borderRadius: '50%',
          transition: '0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </label>
      <span style={{
        fontSize: 14, fontWeight: 500,
        color: isLive ? '#3B6D11' : '#5F5E5A',
      }}>
        {isLive ? copy.on : copy.off}
      </span>
    </div>
  );
}

export default function AttorneyDashboard() {
  const { attorney } = useAttorneyAuth();
  const { t, lang } = useAttorneyT();
  const name = `${attorney?.first_name || ''} ${attorney?.last_name || ''}`.trim();
  const welcome = t.dashboard.welcome.replace('{{name}}', name);

  return (
    <AttorneyLayout>
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl text-neutral-900 mb-2">{welcome}</h1>
        <p className="text-neutral-600 mb-8">{t.dashboard.placeholder}</p>

        <LiveStatusToggle initialIsLive={attorney?.is_live} lang={lang} />

        {/* Credits sprint — Archer Partner subscription status + Welcome counsels counter */}
        <LawyerSubscriptionSection language={lang} />

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
