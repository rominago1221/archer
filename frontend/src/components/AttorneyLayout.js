import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Calendar, FolderOpen, MessageSquare, UserCircle, DollarSign, Settings, Power } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const navItems = [
  { to: '/attorney/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/attorney/calls', icon: Calendar, label: 'Upcoming calls' },
  { to: '/attorney/cases', icon: FolderOpen, label: 'Client cases' },
  { to: '/attorney/research', icon: MessageSquare, label: 'Legal Research' },
  { to: '/attorney/profile', icon: UserCircle, label: 'My profile' },
  { to: '/attorney/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/attorney/settings', icon: Settings, label: 'Settings' },
];

const AttorneyLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAvailable, setIsAvailable] = React.useState(false);
  const [profile, setProfile] = React.useState(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/attorney/me`, { withCredentials: true });
        setProfile(res.data);
        setIsAvailable(res.data.is_available);
      } catch (e) { /* ok */ }
    };
    fetchProfile();
  }, []);

  const toggleAvailability = async () => {
    try {
      const res = await axios.post(`${API}/attorney/toggle-availability`, {}, { withCredentials: true });
      setIsAvailable(res.data.is_available);
    } catch (e) { /* ok */ }
  };

  return (
    <div className="flex min-h-screen bg-[#fafafa]" data-testid="attorney-layout">
      {/* Sidebar */}
      <div className="w-[220px] flex-shrink-0 bg-white border-r border-[#ebebeb] flex flex-col" data-testid="attorney-sidebar">
        {/* Logo */}
        <div className="p-5 pb-3">
          <div className="text-lg font-semibold text-[#111827] tracking-tight"><img src="/logos/archer-logo-wordmark.svg" alt="Archer" style={{ height: 28 }} /></div>
        </div>

        {/* Attorney info */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#1a56db] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {(profile?.full_name || user?.name || 'A').charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-[#111827] truncate">{profile?.full_name || user?.name}</div>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-[#f0fdf4] text-[#16a34a] border border-[#86efac]">Attorney</span>
                <div className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium mb-0.5 transition-colors ${isActive ? 'bg-[#eff6ff] text-[#1a56db]' : 'text-[#6b7280] hover:bg-[#f5f5f5] hover:text-[#333]'}`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
              <item.icon size={14} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Availability toggle + logout */}
        <div className="p-3 border-t border-[#ebebeb]">
          <button onClick={toggleAvailability}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-medium transition-colors mb-2 ${isAvailable ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#86efac]' : 'bg-[#f5f5f5] text-[#6b7280] border border-[#e5e5e5]'}`}
            data-testid="availability-toggle">
            <Power size={12} />
            {isAvailable ? 'Go offline' : 'Go online'}
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="w-full text-[10px] text-[#9ca3af] hover:text-[#dc2626] transition-colors"
            data-testid="attorney-logout">
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-7 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AttorneyLayout;
