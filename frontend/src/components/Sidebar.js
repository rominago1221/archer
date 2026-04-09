import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, FolderOpen, Upload, Users, Settings, LogOut } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/cases', label: 'My cases', icon: FolderOpen },
    { path: '/upload', label: 'Upload document', icon: Upload },
    { path: '/lawyers', label: 'Lawyer calls', icon: Users },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="sidebar" data-testid="sidebar">
      {/* Logo */}
      <div className="p-5 border-b border-[#ebebeb]">
        <div className="text-2xl font-bold text-[#1a56db]" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Jasper
        </div>
      </div>

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
