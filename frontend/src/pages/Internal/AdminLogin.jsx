import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BASE = '/internal/dashboard-x9k7';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Login failed');
      }
      const data = await res.json();
      localStorage.setItem('admin_token', data.access_token);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));
      navigate(BASE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <meta name="robots" content="noindex, nofollow" />
      <div style={{
        background: '#ffffff', borderRadius: 16, padding: '40px 36px',
        maxWidth: 400, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#1a56db', letterSpacing: 2, marginBottom: 8 }}>
            ARCHER ADMIN
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0a0a0f' }}>Internal Dashboard</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@archer.law" required
              style={{
                width: '100%', padding: '12px 16px', fontSize: 14,
                border: '1px solid #e2e0db', borderRadius: 8, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required
              style={{
                width: '100%', padding: '12px 16px', fontSize: 14,
                border: '1px solid #e2e0db', borderRadius: 8, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {error && (
            <div style={{
              padding: '10px 14px', background: '#fee2e2', color: '#b91c1c',
              borderRadius: 8, fontSize: 12, marginBottom: 14,
            }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px 0', background: '#0a0a0f', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Authenticating...' : 'Access dashboard'}
          </button>
        </form>

        <div style={{
          textAlign: 'center', marginTop: 20, fontSize: 10, color: '#9ca3af',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          Unauthorized access is logged and prosecuted.
        </div>
      </div>
    </div>
  );
}
