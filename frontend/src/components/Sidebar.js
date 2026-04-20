import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FolderOpen, Upload, Users, Settings, LogOut, MessageCircle,
  FileText, Shield, ShieldCheck, UserCheck,
} from 'lucide-react';
import { useUiLanguage } from '../hooks/useUiLanguage';
import { useDashboardT } from '../hooks/useDashboardT';
import '../styles/sidebar-v3.css';

function BrandHeader({ t }) {
  const statusLabel = t('sidebar.live_status_label');
  return (
    <div className="sb-brand" data-testid="sidebar-brand">
      <span className="sb-brand-logo">Archer</span>
      <span className="sb-brand-live" aria-live="polite">
        <span className="sb-brand-live-dot" />
        {statusLabel || 'LIVE'}
      </span>
    </div>
  );
}

function TrustCard({ t }) {
  const items = [
    { key: 'gdpr', Icon: ShieldCheck, label: t('sidebar.trust_gdpr') },
    { key: 'encryption', Icon: Shield, label: t('sidebar.trust_encryption') },
    { key: 'attorneys', Icon: UserCheck, label: t('sidebar.trust_attorneys') },
  ];
  return (
    <div className="sb-trust" data-testid="sidebar-trust-badges">
      <div className="sb-trust-label">{t('sidebar.trust_label')}</div>
      <div className="sb-trust-list">
        {items.map(({ key, Icon, label }) => (
          <div key={key} className="sb-trust-item">
            <Icon size={11} aria-hidden />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const language = useUiLanguage(user?.jurisdiction || 'BE');
  const t = useDashboardT(language);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/cases', label: 'My cases', icon: FolderOpen },
    { path: '/documents', label: 'Document Library', icon: FileText },
    { path: '/upload', label: 'Upload document', icon: Upload },
    { path: '/chat', label: 'Legal Chat', icon: MessageCircle },
    { path: '/lawyers', label: 'Lawyer calls', icon: Users },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="sidebar sidebar-v3" data-testid="sidebar">
      <BrandHeader t={t} />

      <nav className="sb-nav" data-testid="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            className={({ isActive }) => `sb-nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={15} aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <TrustCard t={t} />

      <div className="sb-user" data-testid="sidebar-user">
        <div className="sb-user-avatar">
          {user?.picture ? (
            <img src={user.picture} alt="" />
          ) : (
            <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          )}
        </div>
        <div className="sb-user-info">
          <div className="sb-user-name">{user?.name || 'User'}</div>
          <div className="sb-user-email">{user?.email || ''}</div>
        </div>
      </div>
      <button
        onClick={handleLogout}
        data-testid="logout-btn"
        className="sb-logout"
      >
        <LogOut size={14} aria-hidden />
        <span>Sign out</span>
      </button>
    </div>
  );
};

export default Sidebar;
