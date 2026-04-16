import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BASE = '/internal/dashboard-x9k7';

function getToken() { return localStorage.getItem('admin_token'); }
function getAdmin() {
  try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState({});
  const admin = getAdmin();

  useEffect(() => {
    const token = getToken();
    if (!token) { navigate(`${BASE}/login`); return; }
    // Verify token
    fetch(`${API}/admin/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .catch(() => { localStorage.removeItem('admin_token'); navigate(`${BASE}/login`); });
    // Fetch badge counts
    fetch(`${API}/admin/notifications/unread`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setBadges).catch(() => {});
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate(`${BASE}/login`);
  };

  const navItems = [
    { path: BASE, label: 'Dashboard', icon: '\ud83d\udcca', end: true },
    { path: `${BASE}/customers`, label: 'Customers', icon: '\ud83d\udc65' },
    { path: `${BASE}/attorneys`, label: 'Attorneys', icon: '\u2696\ufe0f', badge: badges.attorneys_pending },
    { path: `${BASE}/cases`, label: 'Cases', icon: '\ud83d\udcc2' },
    { path: `${BASE}/operations`, label: 'Operations', icon: '\ud83d\udcb3' },
    { path: `${BASE}/moderation`, label: 'Moderation', icon: '\ud83d\udee1\ufe0f' },
    { path: `${BASE}/analytics`, label: 'Analytics', icon: '\ud83d\udcc8' },
    { path: `${BASE}/settings`, label: 'Settings', icon: '\u2699\ufe0f' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f4f1' }}>
      <meta name="robots" content="noindex, nofollow" />
      {/* Sidebar */}
      <div style={{
        width: 220, background: '#0a0a0f', color: '#ffffff',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #1f1f2e' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#1a56db', letterSpacing: 2 }}>
            ARCHER ADMIN
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                fontSize: 13, fontWeight: isActive ? 700 : 400,
                color: isActive ? '#ffffff' : '#9ca3af',
                background: isActive ? '#1a56db' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800,
                  padding: '2px 6px', borderRadius: 10, minWidth: 16, textAlign: 'center',
                }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Admin user */}
        <div style={{ padding: '16px 18px', borderTop: '1px solid #1f1f2e' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff', marginBottom: 2 }}>
            {admin?.full_name || 'Admin'}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 10 }}>
            {admin?.role || 'admin'}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px 0', background: 'transparent',
              border: '1px solid #374151', borderRadius: 6, color: '#9ca3af',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
