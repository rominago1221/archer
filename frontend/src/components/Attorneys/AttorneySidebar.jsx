import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';


function LanguageToggle() {
  const current = (typeof window !== 'undefined' && localStorage.getItem('ui_language')) || 'fr';
  const pick = async (lang) => {
    if (lang === current) return;
    localStorage.setItem('ui_language', lang);
    try { await attorneyApi.patch('/attorneys/profile', { preferred_language: lang }); }
    catch (_) { /* non-blocking */ }
    window.location.reload();
  };
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-neutral-500 border-t border-neutral-200">
      <button
        type="button" onClick={() => pick('fr')}
        className={`px-1.5 py-0.5 rounded ${current === 'fr' ? 'text-neutral-900 font-medium' : 'hover:text-neutral-900'}`}
        aria-label="Switch to French"
      >FR</button>
      <span className="opacity-50">·</span>
      <button
        type="button" onClick={() => pick('en')}
        className={`px-1.5 py-0.5 rounded ${current === 'en' ? 'text-neutral-900 font-medium' : 'hover:text-neutral-900'}`}
        aria-label="Switch to English"
      >EN</button>
    </div>
  );
}

function Group({ label, children }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold tracking-widest text-neutral-400 px-3 mb-2">{label}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function Item({ to, children, disabled }) {
  const cls = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm transition ${
      disabled ? 'text-neutral-400 cursor-not-allowed' :
      isActive ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
    }`;
  if (disabled) return <span className={cls({ isActive: false })}>{children}</span>;
  return <NavLink to={to} className={cls}>{children}</NavLink>;
}

export default function AttorneySidebar({ attorney, onLogout }) {
  const { t } = useAttorneyT();
  const initials = `${(attorney?.first_name || '?')[0]}${(attorney?.last_name || '?')[0]}`.toUpperCase();
  const fullName = `${attorney?.first_name || ''} ${attorney?.last_name || ''}`.trim() || attorney?.email;

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-neutral-200 h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-5 border-b border-neutral-200">
        <div className="font-serif text-xl text-neutral-900">Archer</div>
        <div className="text-[11px] tracking-widest text-neutral-500">ATTORNEY PORTAL</div>
      </div>

      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <Group label={t.sidebar.cases}>
          <Item to="/attorneys/desk">{t.sidebar.desk || 'Desk'}</Item>
          <Item to="/attorneys/inbox">{t.sidebar.inbox}</Item>
          <Item to="/attorneys/my-cases">{t.sidebar.myCases}</Item>
          <Item to="/attorneys/completed">{t.sidebar.completed}</Item>
        </Group>
        <Group label={t.sidebar.consultations}>
          <Item to="/attorneys/live-counsel">{t.sidebar.liveCounsel}</Item>
        </Group>
        <Group label={t.sidebar.business}>
          <Item to="/attorneys/earnings">{t.sidebar.earnings}</Item>
          <Item to="/attorneys/profile">{t.sidebar.profile}</Item>
        </Group>

        {attorney && !attorney.stripe_onboarding_completed && (
          <div className="mx-2 mb-3">
            <NavLink
              to="/attorneys/onboarding/stripe"
              className={({ isActive }) =>
                `flex items-start gap-2 px-3 py-2.5 rounded-md text-sm border transition ${
                  isActive
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                }`
              }
            >
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <span className="flex-1 min-w-0">
                <div className="font-medium">Action requise</div>
                <div className="text-xs opacity-90">Configurer Stripe pour recevoir des paiements</div>
              </span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-neutral-900 text-white text-sm font-medium flex items-center justify-center">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-neutral-900 truncate">{fullName}</div>
            <div className="text-[11px] text-neutral-500 truncate">
              {attorney?.available_for_cases ? t.dashboard.available : t.dashboard.unavailable}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full text-left px-2 py-1.5 mt-1 text-xs text-neutral-500 hover:text-neutral-900"
        >
          {t.sidebar.logout}
        </button>
      </div>
      <LanguageToggle />
    </aside>
  );
}
