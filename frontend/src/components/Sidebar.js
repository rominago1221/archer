import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, FolderOpen, Upload, Users, Settings, LogOut, MessageCircle, FileText } from 'lucide-react';
import { useUiLanguage } from '../hooks/useUiLanguage';
import { useDashboardT } from '../hooks/useDashboardT';

// Inline-styled blocks matching the V7 mockup. The rest of the sidebar keeps
// its existing Tailwind/CSS classes so we don't regress on other pages.
function LiveStatusBlock({ t }) {
  const stats = [
    {
      key: 'sources',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      boldKey: 'sidebar.stat_sources_main_bold',
      suffixKey: 'sidebar.stat_sources_main_suffix',
      subKey: 'sidebar.stat_sources_sub',
    },
    {
      key: 'experience',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
          <path d="M12 2 L19 9 L12 22 L5 9 Z" />
        </svg>
      ),
      boldKey: 'sidebar.stat_experience_main_bold',
      suffixKey: 'sidebar.stat_experience_main_suffix',
      subKey: 'sidebar.stat_experience_sub',
    },
    {
      key: 'rank',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      boldKey: 'sidebar.stat_rank_main_bold',
      suffixKey: 'sidebar.stat_rank_main_suffix',
      subKey: 'sidebar.stat_rank_sub',
    },
  ];

  return (
    <div
      data-testid="sidebar-live-status"
      style={{
        margin: '0 8px 22px',
        padding: 14,
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '0.5px solid #16a34a',
        borderRadius: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: '#16a34a',
          animation: 'livepulse 1.8s ease-in-out infinite', display: 'inline-block',
        }} />
        <span style={{
          fontSize: 9, fontWeight: 800, color: '#15803d', letterSpacing: '0.8px',
        }}>
          {t('sidebar.live_status_label')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stats.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: '#ffffff', border: '0.5px solid #c0e8d0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#15803d', flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div style={{ color: '#0a0a0f', lineHeight: 1.3, flex: 1 }}>
              <strong style={{ color: '#15803d', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {t(s.boldKey)}
              </strong>{' '}
              {t(s.suffixKey)}
              <span style={{ fontSize: 9, color: '#6b7280', display: 'block', marginTop: 1 }}>
                {t(s.subKey)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBadgesBlock({ t }) {
  const badges = [
    {
      key: 'gdpr',
      label: t('sidebar.trust_gdpr'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      key: 'encryption',
      label: t('sidebar.trust_encryption'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      key: 'attorneys',
      label: t('sidebar.trust_attorneys'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <path d="M20 7L9 18l-5-5" />
        </svg>
      ),
    },
  ];

  return (
    <div
      data-testid="sidebar-trust-badges"
      style={{
        margin: '0 4px 16px',
        padding: 12,
        background: '#fafaf8',
        border: '0.5px solid #e2e0db',
        borderRadius: 10,
      }}
    >
      <div style={{
        fontSize: 8, fontWeight: 800, color: '#9ca3af',
        letterSpacing: '0.8px', marginBottom: 8,
      }}>
        {t('sidebar.trust_label')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {badges.map((b) => (
          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#555' }}>
            <span style={{ color: '#1a56db', flexShrink: 0, display: 'inline-flex' }}>{b.icon}</span>
            <span>{b.label}</span>
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
    <div className="sidebar" data-testid="sidebar">
      {/* Logo */}
      <div className="p-5 border-b border-[#ebebeb]">
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="sidebar-logo">
          <img src="/logos/archer-logo-wordmark.svg" alt="Archer" style={{ height: 28 }} />
        </div>
      </div>

      {/* Live Status block (V7) */}
      <LiveStatusBlock t={t} />

      {/* Navigation */}
      <nav className="flex-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            className={({ isActive }) =>
              `sidebar-nav-item mb-1 ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Trust Badges (V7) */}
      <TrustBadgesBlock t={t} />

      {/* User info */}
      <div className="p-4 border-t border-[#ebebeb]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#dbeafe] flex items-center justify-center">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-[#1a56db]">
                {user?.name?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#111827] truncate">{user?.name || 'User'}</div>
            <div className="text-xs text-[#9ca3af] truncate">{user?.email || ''}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#6b7280] hover:text-[#dc2626] hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
