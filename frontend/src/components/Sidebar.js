import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useUiLanguage } from '../hooks/useUiLanguage';
import { getCaseTypeIcon, getCaseTypeLabel } from '../utils/caseTypeIcons';
import '../styles/sidebar-v3.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function useSidebarCases() {
  const [cases, setCases] = useState([]);
  useEffect(() => {
    let alive = true;
    axios.get(`${API}/cases`, { withCredentials: true })
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.cases || []);
        setCases(list);
      })
      .catch(() => { /* silent — sidebar stays usable */ });
    return () => { alive = false; };
  }, []);
  return cases;
}

function getDaysUntilDeadline(deadline) {
  if (!deadline) return 999;
  const now = new Date();
  const dl = new Date(deadline);
  if (Number.isNaN(dl.getTime())) return 999;
  return Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
}

function getCaseStatusColor(caseItem) {
  const status = String(caseItem.status || '').toLowerCase();
  if (status === 'resolved' || status === 'won') return 'green';
  if ((Number(caseItem.risk_score) || 0) >= 61 || caseItem.is_urgent) return 'red';
  return 'amber';
}

function getCaseDeadlineColor(caseItem) {
  const status = String(caseItem.status || '').toLowerCase();
  if (status === 'resolved' || status === 'won') return 'green';
  const daysLeft = getDaysUntilDeadline(caseItem.deadline);
  if (daysLeft <= 3) return 'red';
  return 'amber';
}

function formatDeadline(caseItem) {
  const status = String(caseItem.status || '').toLowerCase();
  if (status === 'resolved') return 'Résolu';
  if (status === 'won') return 'Gagné';
  const daysLeft = getDaysUntilDeadline(caseItem.deadline);
  if (daysLeft <= 0) return 'Urgent';
  return `${daysLeft}j`;
}

function getInitials(user) {
  const source = user?.name || user?.email || 'U';
  const parts = String(source).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.charAt(0).toUpperCase();
}

function truncate(str, n) {
  if (!str) return '';
  const s = String(str);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId: activeCaseId } = useParams();
  const language = useUiLanguage(user?.jurisdiction || 'BE');
  const lang = String(language || 'en').slice(0, 2);
  const cases = useSidebarCases();

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const labels = lang === 'fr' ? {
    search: 'Rechercher…',
    dashboard: 'Tableau de bord',
    cases: 'Mes dossiers',
    documents: 'Documents',
    chat: 'Chat juridique',
    calls: 'Appels avocats',
    settings: 'Paramètres',
    activeCases: 'Dossiers actifs',
    newCase: '+ Ouvrir un nouveau dossier',
    trustGdpr: 'Conforme RGPD',
    trustCrypto: 'Chiffré AES-256',
    trustLawyers: 'Avocats inscrits BE & US',
    logout: 'Déconnexion',
  } : lang === 'nl' ? {
    search: 'Zoeken…',
    dashboard: 'Dashboard',
    cases: 'Mijn dossiers',
    documents: 'Documenten',
    chat: 'Juridische chat',
    calls: 'Advocaat-gesprekken',
    settings: 'Instellingen',
    activeCases: 'Actieve dossiers',
    newCase: '+ Nieuw dossier openen',
    trustGdpr: 'AVG-conform',
    trustCrypto: 'AES-256 versleuteld',
    trustLawyers: 'Advocaten BE & US',
    logout: 'Afmelden',
  } : {
    search: 'Search…',
    dashboard: 'Dashboard',
    cases: 'My cases',
    documents: 'Documents',
    chat: 'Legal chat',
    calls: 'Lawyer calls',
    settings: 'Settings',
    activeCases: 'Active cases',
    newCase: '+ Open a new case',
    trustGdpr: 'GDPR compliant',
    trustCrypto: 'AES-256 encrypted',
    trustLawyers: 'Attorneys BE & US',
    logout: 'Sign out',
  };

  const activeCases = cases
    .filter((c) => {
      const s = String(c.status || '').toLowerCase();
      return s !== 'closed' && s !== 'archived';
    })
    .slice(0, 5);

  const casesCount = cases.filter((c) => {
    const s = String(c.status || '').toLowerCase();
    return s !== 'closed' && s !== 'archived';
  }).length;

  // Derive a document count from the cases list. Each case exposes
  // `document_count` on the dashboard cases endpoint; if the field is
  // missing we omit the count pill rather than guess.
  const documentsCount = cases.reduce((acc, c) => acc + (Number(c.document_count) || 0), 0);

  return (
    <aside className="sidebar" data-testid="sidebar">
      {/* Logo */}
      <div className="sb-logo-row" data-testid="sidebar-brand">
        <div className="sb-logo" onClick={() => navigate('/dashboard')}>Archer</div>
        <span className="sb-live">
          <span className="sb-live-dot" />
          Live
        </span>
      </div>

      {/* Search (placeholder — no input yet) */}
      <div className="sb-search" data-testid="sidebar-search">
        <span>🔍</span>
        <span>{labels.search}</span>
        <span className="sb-search-key">⌘K</span>
      </div>

      {/* Navigation principale */}
      <nav className="sb-nav" data-testid="sidebar-nav">
        <a
          className={`sb-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
          data-testid="nav-dashboard"
        >
          <span className="icon">⊞</span> {labels.dashboard}
        </a>
        <a
          className={`sb-nav-item ${isActive('/cases') ? 'active' : ''}`}
          onClick={() => navigate('/cases')}
          data-testid="nav-cases"
        >
          <span className="icon">📁</span> {labels.cases}
          {casesCount > 0 && <span className="count">{casesCount}</span>}
        </a>
        <a
          className={`sb-nav-item ${isActive('/documents') ? 'active' : ''}`}
          onClick={() => navigate('/documents')}
          data-testid="nav-documents"
        >
          <span className="icon">📄</span> {labels.documents}
          {documentsCount > 0 && <span className="count">{documentsCount}</span>}
        </a>
        <a
          className={`sb-nav-item ${isActive('/chat') ? 'active' : ''}`}
          onClick={() => navigate('/chat')}
          data-testid="nav-chat"
        >
          <span className="icon">💬</span> {labels.chat}
        </a>
        <a
          className={`sb-nav-item ${isActive('/lawyers') ? 'active' : ''}`}
          onClick={() => navigate('/lawyers')}
          data-testid="nav-lawyers"
        >
          <span className="icon">📞</span> {labels.calls}
        </a>
        <a
          className={`sb-nav-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={() => navigate('/settings')}
          data-testid="nav-settings"
        >
          <span className="icon">⚙</span> {labels.settings}
        </a>
      </nav>

      {/* Dossiers actifs */}
      {activeCases.length > 0 && (
        <>
          <div className="sb-section-title">{labels.activeCases}</div>
          <div className="sb-cases" data-testid="sidebar-cases">
            {activeCases.map((caseItem) => {
              const id = caseItem.case_id || caseItem.id || caseItem._id;
              const title = caseItem.title
                || (caseItem.case_description ? String(caseItem.case_description).substring(0, 40) : '—');
              return (
                <div
                  key={id}
                  className={`sb-case ${activeCaseId === id ? 'active' : ''}`}
                  onClick={() => navigate(`/cases/${id}`)}
                  data-testid={`sidebar-case-${id}`}
                >
                  <div className={`sb-case-dot ${getCaseStatusColor(caseItem)}`} />
                  <div className="sb-case-body">
                    <div className="sb-case-title">{truncate(title, 30)}</div>
                    <div className="sb-case-meta">
                      <span className="sb-case-score">{caseItem.risk_score || '—'}</span>
                      <span>·</span>
                      <span>
                        {getCaseTypeIcon(caseItem.case_type || caseItem.type)}{' '}
                        {getCaseTypeLabel(caseItem.case_type || caseItem.type)}
                      </span>
                      {caseItem.deadline && (
                        <span className={`sb-case-deadline ${getCaseDeadlineColor(caseItem)}`}>
                          {formatDeadline(caseItem)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Nouveau dossier */}
      <div
        className="sb-new-case"
        onClick={() => navigate('/upload')}
        data-testid="sidebar-new-case"
      >
        {labels.newCase}
      </div>

      {/* Footer */}
      <div className="sb-footer">
        <div className="sb-trust" data-testid="sidebar-trust-badges">
          <div className="sb-trust-row"><span className="sb-trust-check">✓</span> {labels.trustGdpr}</div>
          <div className="sb-trust-row"><span className="sb-trust-check">✓</span> {labels.trustCrypto}</div>
          <div className="sb-trust-row"><span className="sb-trust-check">✓</span> {labels.trustLawyers}</div>
        </div>
        <div className="sb-user" data-testid="sidebar-user">
          <div className="sb-user-avatar">
            {user?.picture
              ? <img src={user.picture} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : getInitials(user)}
          </div>
          <div className="sb-user-info">
            <div className="sb-user-name">{user?.name || 'Utilisateur'}</div>
            <div className="sb-user-email">{user?.email || ''}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          data-testid="logout-btn"
          className="sb-logout"
        >
          {labels.logout}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
