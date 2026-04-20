import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FolderOpen, FileText, MessageCircle, Users, Settings,
  Search, LogOut, Plus, ShieldCheck,
} from 'lucide-react';
import { useUiLanguage } from '../hooks/useUiLanguage';
import { useDashboardT } from '../hooks/useDashboardT';
import '../styles/sidebar-v3.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Keep it fuzzy — we don't have a backend counter endpoint, we just derive
// from the /api/cases list. Undefined → don't render a count pill.
function useSidebarCases() {
  const [cases, setCases] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    axios.get(`${API}/cases`, { withCredentials: true })
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.cases || []);
        setCases(list);
      })
      .catch(() => { /* silent — sidebar stays usable */ })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  return { cases, ready };
}

const CASE_EMOJI = {
  housing: '🏠', employment: '💼', debt: '💳', insurance: '🛡',
  contract: '📄', consumer: '🛒', family: '👨‍👩‍👧', court: '⚖',
  nda: '📄', penal: '⚖', commercial: '🏢', other: '📋',
};

const CASE_TYPE_LABEL = {
  fr: {
    housing: 'Logement', employment: 'Travail', debt: 'Dette',
    insurance: 'Assurance', contract: 'Contrat', consumer: 'Conso',
    family: 'Famille', court: 'Justice', nda: 'NDA', penal: 'Pénal',
    commercial: 'Commercial', other: 'Autre',
  },
  en: {
    housing: 'Housing', employment: 'Work', debt: 'Debt',
    insurance: 'Insurance', contract: 'Contract', consumer: 'Consumer',
    family: 'Family', court: 'Court', nda: 'NDA', penal: 'Criminal',
    commercial: 'Commercial', other: 'Other',
  },
  nl: {
    housing: 'Wonen', employment: 'Werk', debt: 'Schuld',
    insurance: 'Verz.', contract: 'Contract', consumer: 'Consu.',
    family: 'Familie', court: 'Recht', nda: 'NDA', penal: 'Straf',
    commercial: 'Commerc.', other: 'Overig',
  },
};

function dotToneForScore(score) {
  const s = Number(score) || 0;
  if (s >= 70) return 'red';
  if (s >= 40) return 'amber';
  return 'green';
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d - Date.now()) / 86400000);
}

function MiniCase({ c, active, lang, onClick }) {
  const dotTone = dotToneForScore(c.risk_score);
  const typeKey = c.type || 'other';
  const typeLabel = CASE_TYPE_LABEL[lang]?.[typeKey] || CASE_TYPE_LABEL.en[typeKey] || typeKey;
  const emoji = CASE_EMOJI[typeKey] || CASE_EMOJI.other;
  const days = daysUntil(c.deadline);
  const deadlineTone = days != null && days <= 3 ? 'red' : days != null && days <= 14 ? 'amber' : 'green';

  return (
    <button
      type="button"
      className={`case-mini${active ? ' active' : ''}`}
      onClick={onClick}
      data-testid={`sidebar-case-${c.case_id || c.id}`}
    >
      <div className={`case-mini-dot ${dotTone}`} />
      <div className="case-mini-txt">
        <div className="case-mini-name">{c.title || '—'}</div>
        <div className="case-mini-meta">
          <span className="case-mini-score">{c.risk_score || '—'}</span>
          {' · '}
          <span>{emoji} {typeLabel}</span>
          {days != null && (
            <span className={`case-mini-deadline ${deadlineTone}`}>
              {' · '}{days <= 0 ? '0j' : `${days}j`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId: activeCaseId } = useParams();
  const language = useUiLanguage(user?.jurisdiction || 'BE');
  const t = useDashboardT(language);
  const lang = String(language || 'en').slice(0, 2);
  const { cases } = useSidebarCases();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const liveLabel = t('sidebar.live_status_label') || 'LIVE';
  const searchPlaceholder = lang === 'fr' ? 'Rechercher…'
    : lang === 'nl' ? 'Zoeken…'
    : 'Search…';
  const navLabels = lang === 'fr' ? {
    dashboard: 'Tableau de bord',
    cases: 'Mes dossiers',
    documents: 'Documents',
    upload: 'Déposer un document',
    chat: 'Chat juridique',
    lawyers: 'Appels avocats',
    settings: 'Paramètres',
  } : lang === 'nl' ? {
    dashboard: 'Dashboard',
    cases: 'Mijn dossiers',
    documents: 'Documenten',
    upload: 'Document uploaden',
    chat: 'Juridische chat',
    lawyers: 'Advocaat-gesprekken',
    settings: 'Instellingen',
  } : {
    dashboard: 'Dashboard',
    cases: 'My cases',
    documents: 'Documents',
    upload: 'Upload document',
    chat: 'Legal chat',
    lawyers: 'Lawyer calls',
    settings: 'Settings',
  };
  const activeCasesLabel = lang === 'fr' ? 'Dossiers actifs'
    : lang === 'nl' ? 'Actieve dossiers'
    : 'Active cases';
  const newCaseLabel = lang === 'fr' ? '+ Ouvrir un nouveau dossier'
    : lang === 'nl' ? '+ Nieuw dossier openen'
    : '+ Open a new case';
  const signOutLabel = lang === 'fr' ? 'Déconnexion'
    : lang === 'nl' ? 'Afmelden'
    : 'Sign out';

  const topCases = cases.slice(0, 5);
  const activeCount = cases.filter((c) => c.status !== 'closed' && c.status !== 'archived').length;
  const documentsPath = location.pathname.startsWith('/documents');

  const navItems = [
    { path: '/dashboard', label: navLabels.dashboard, icon: LayoutDashboard },
    { path: '/cases', label: navLabels.cases, icon: FolderOpen, count: activeCount > 0 ? activeCount : null },
    { path: '/documents', label: navLabels.documents, icon: FileText, active: documentsPath },
    { path: '/upload', label: navLabels.upload, icon: Plus },
    { path: '/chat', label: navLabels.chat, icon: MessageCircle },
    { path: '/lawyers', label: navLabels.lawyers, icon: Users },
    { path: '/settings', label: navLabels.settings, icon: Settings },
  ];

  return (
    <aside className="sidebar sidebar-v3" data-testid="sidebar">
      <div className="sb-logo-row" data-testid="sidebar-brand">
        <span className="sb-logo" onClick={() => navigate('/dashboard')}>Archer</span>
        <span className="sb-live">
          <span className="sb-live-dot" />
          {liveLabel}
        </span>
      </div>

      <div className="sidebar-search" data-testid="sidebar-search">
        <Search size={14} aria-hidden />
        <input
          type="text"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          disabled
          style={{ cursor: 'default' }}
        />
        <kbd>⌘K</kbd>
      </div>

      <nav className="nav" data-testid="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            className={({ isActive }) => `nav-item${isActive || item.active ? ' active' : ''}`}
          >
            <item.icon size={15} aria-hidden />
            <span>{item.label}</span>
            {item.count != null && <span className="count">{item.count}</span>}
          </NavLink>
        ))}
      </nav>

      {topCases.length > 0 && (
        <>
          <div className="nav-section-h">{activeCasesLabel}</div>
          <div className="cases-mini" data-testid="sidebar-cases">
            {topCases.map((c) => (
              <MiniCase
                key={c.case_id || c.id}
                c={c}
                lang={lang}
                active={c.case_id === activeCaseId || c.id === activeCaseId}
                onClick={() => navigate(`/cases/${c.case_id || c.id}`)}
              />
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        className="sb-new-case"
        onClick={() => navigate('/upload')}
        data-testid="sidebar-new-case"
      >
        <Plus size={13} aria-hidden /> {newCaseLabel}
      </button>

      <div className="trust-card" data-testid="sidebar-trust-badges">
        <div className="trust-card-h">{t('sidebar.trust_label')}</div>
        <ul className="trust-list">
          <li><ShieldCheck size={10} aria-hidden /> <span>{t('sidebar.trust_gdpr')}</span></li>
          <li><ShieldCheck size={10} aria-hidden /> <span>{t('sidebar.trust_encryption')}</span></li>
          <li><ShieldCheck size={10} aria-hidden /> <span>{t('sidebar.trust_attorneys')}</span></li>
        </ul>
      </div>

      <div className="user-card" data-testid="sidebar-user">
        <div className="user-avatar">
          {user?.picture
            ? <img src={user.picture} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : (user?.name?.charAt(0)?.toUpperCase() || 'U')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{user?.name || 'User'}</div>
          <div className="user-email">{user?.email || ''}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        data-testid="logout-btn"
        className="sb-logout"
      >
        <LogOut size={13} aria-hidden /> <span>{signOutLabel}</span>
      </button>
    </aside>
  );
};

export default Sidebar;
