import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutGrid, Folder, FileText, MessageSquare, Phone, Settings,
  Search, LogOut, Plus, ShieldCheck,
  Home, Briefcase, CreditCard, Shield, FileSignature, ShoppingBag,
  Users, Scale, Gavel, Building2, FolderInput,
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

// Per-type icon (lucide). Rendered at 13px inline with the type label so
// each case gets a visual cue matching its domain. Includes every type
// string the backend has ever produced (incl. aliases like "eviction",
// "criminal", and any capitalised variants).
const CASE_TYPE_ICON = {
  housing: Home,
  eviction: Home,
  logement: Home,
  employment: Briefcase,
  work: Briefcase,
  travail: Briefcase,
  debt: CreditCard,
  dette: CreditCard,
  insurance: Shield,
  assurance: Shield,
  contract: FileSignature,
  contrat: FileSignature,
  consumer: ShoppingBag,
  conso: ShoppingBag,
  family: Users,
  famille: Users,
  court: Scale,
  justice: Scale,
  nda: FileSignature,
  penal: Gavel,
  criminal: Gavel,
  commercial: Building2,
  other: FolderInput,
  autre: FolderInput,
};

const CASE_TYPE_LABEL = {
  fr: {
    housing: 'Logement', eviction: 'Logement', logement: 'Logement',
    employment: 'Travail', work: 'Travail', travail: 'Travail',
    debt: 'Dette', dette: 'Dette',
    insurance: 'Assurance', assurance: 'Assurance',
    contract: 'Contrat', contrat: 'Contrat',
    consumer: 'Conso', conso: 'Conso',
    family: 'Famille', famille: 'Famille',
    court: 'Justice', justice: 'Justice',
    nda: 'NDA',
    penal: 'Pénal', criminal: 'Pénal',
    commercial: 'Commercial',
    other: 'Autre', autre: 'Autre',
  },
  en: {
    housing: 'Housing', eviction: 'Housing', logement: 'Housing',
    employment: 'Work', work: 'Work', travail: 'Work',
    debt: 'Debt', dette: 'Debt',
    insurance: 'Insurance', assurance: 'Insurance',
    contract: 'Contract', contrat: 'Contract',
    consumer: 'Consumer', conso: 'Consumer',
    family: 'Family', famille: 'Family',
    court: 'Court', justice: 'Court',
    nda: 'NDA',
    penal: 'Criminal', criminal: 'Criminal',
    commercial: 'Commercial',
    other: 'Other', autre: 'Other',
  },
  nl: {
    housing: 'Wonen', eviction: 'Wonen', logement: 'Wonen',
    employment: 'Werk', work: 'Werk', travail: 'Werk',
    debt: 'Schuld', dette: 'Schuld',
    insurance: 'Verz.', assurance: 'Verz.',
    contract: 'Contract', contrat: 'Contract',
    consumer: 'Consu.', conso: 'Consu.',
    family: 'Familie', famille: 'Familie',
    court: 'Recht', justice: 'Recht',
    nda: 'NDA',
    penal: 'Straf', criminal: 'Straf',
    commercial: 'Commerc.',
    other: 'Overig', autre: 'Overig',
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
  // Normalise the type key: lower-case + strip accents so "Autre",
  // "AUTRE", "autre", "eviction", "Criminal" all land on the same
  // bucket. Fall back to "other" when the label/icon map doesn't
  // recognise the backend string.
  const rawType = String(c.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const typeKey = rawType || 'other';
  const typeLabel = CASE_TYPE_LABEL[lang]?.[typeKey]
    || CASE_TYPE_LABEL.en[typeKey]
    || (typeKey.charAt(0).toUpperCase() + typeKey.slice(1));
  const TypeIcon = CASE_TYPE_ICON[typeKey] || CASE_TYPE_ICON.other;
  const days = daysUntil(c.deadline);
  const isWon = String(c.status || '').toLowerCase() === 'won';
  // Status pill tone: won → green, otherwise based on urgency.
  let pillTone = null;
  let pillLabel = null;
  if (isWon) {
    pillTone = 'green';
    pillLabel = lang === 'fr' ? 'Gagné' : lang === 'nl' ? 'Gewonnen' : 'Won';
  } else if (days != null) {
    pillTone = days <= 3 ? 'red' : days <= 14 ? 'amber' : 'green';
    pillLabel = days <= 0 ? '0j' : `${days}j`;
  }

  return (
    <button
      type="button"
      className={`case-mini${active ? ' active' : ''}`}
      onClick={onClick}
      data-testid={`sidebar-case-${c.case_id || c.id}`}
    >
      <div className="case-mini-row-top">
        <div className={`case-mini-dot ${dotTone}`} />
        <div className="case-mini-name">{c.title || '—'}</div>
      </div>
      <div className="case-mini-row-bottom">
        <span className="case-mini-score">{c.risk_score || '—'}</span>
        <span className="case-mini-sep">·</span>
        <span className="case-mini-type">
          <TypeIcon size={12} strokeWidth={1.8} aria-hidden /> {typeLabel}
        </span>
        {pillLabel && (
          <span className={`case-mini-pill ${pillTone}`}>{pillLabel}</span>
        )}
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
    dashboard: 'Mon bureau',
    cases: 'Mes dossiers',
    documents: 'Documents',
    upload: 'Déposer un document',
    chat: 'Chat juridique',
    lawyers: 'Appels avocats',
    settings: 'Paramètres',
  } : lang === 'nl' ? {
    dashboard: 'Mijn bureau',
    cases: 'Mijn dossiers',
    documents: 'Documenten',
    upload: 'Document uploaden',
    chat: 'Juridische chat',
    lawyers: 'Advocaat-gesprekken',
    settings: 'Instellingen',
  } : {
    dashboard: 'My desk',
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
  // Label without the "+" — the button already renders a <Plus> icon
  // before the text. Having both was producing "+ + Ouvrir…".
  const newCaseLabel = lang === 'fr' ? 'Ouvrir un nouveau dossier'
    : lang === 'nl' ? 'Nieuw dossier openen'
    : 'Open a new case';
  const signOutLabel = lang === 'fr' ? 'Déconnexion'
    : lang === 'nl' ? 'Afmelden'
    : 'Sign out';

  const topCases = cases.slice(0, 2);
  const activeCount = cases.filter((c) => c.status !== 'closed' && c.status !== 'archived').length;
  const documentsPath = location.pathname.startsWith('/documents');

  // 6 items per mockup + screenshot. Icon choice:
  //  - LayoutGrid: 4-square grid that reads "Dashboard"
  //  - Folder: closed-folder glyph matching "Mes dossiers" pictogram
  //  - FileText: document/page icon
  //  - MessageSquare: rounded-square chat bubble
  //  - Phone: handset
  //  - Settings: gear
  const navItems = [
    { path: '/dashboard', label: navLabels.dashboard, icon: LayoutGrid },
    { path: '/cases', label: navLabels.cases, icon: Folder, count: activeCount > 0 ? activeCount : null },
    { path: '/documents', label: navLabels.documents, icon: FileText, active: documentsPath },
    { path: '/chat', label: navLabels.chat, icon: MessageSquare },
    { path: '/lawyers', label: navLabels.lawyers, icon: Phone },
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
