import React, { useState, useEffect } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }

export default function AdminSettings() {
  const [tab, setTab] = useState('account');

  const tabs = [
    { key: 'account', label: 'Account' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'system', label: 'System Flags' },
    { key: 'audit', label: 'Audit Log' },
  ];

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 20 }}>Settings</div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e0db', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', fontSize: 13, cursor: 'pointer',
            fontWeight: tab === t.key ? 700 : 400, background: 'none', border: 'none',
            borderBottom: tab === t.key ? '2px solid #1a56db' : '2px solid transparent',
            color: tab === t.key ? '#1a56db' : '#6b7280',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'account' && <AccountTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'system' && <SystemFlagsTab />}
      {tab === 'audit' && <AuditLogTab />}
    </div>
  );
}

function AccountTab() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState(null);

  const handleChange = async () => {
    setMsg(null);
    const res = await fetch(`${API}/admin/auth/change-password`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    if (res.ok) { setMsg({ type: 'success', text: 'Password changed' }); setCurrentPw(''); setNewPw(''); }
    else { const d = await res.json().catch(() => ({})); setMsg({ type: 'error', text: d.detail || 'Failed' }); }
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f', marginBottom: 16 }}>Change Password</div>
      <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
        placeholder="Current password" style={inputStyle} />
      <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
        placeholder="New password (min 12 chars)" style={{ ...inputStyle, marginTop: 10 }} />
      {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.type === 'error' ? '#b91c1c' : '#16a34a' }}>{msg.text}</div>}
      <button onClick={handleChange} disabled={!currentPw || newPw.length < 12}
        style={{ marginTop: 14, padding: '10px 20px', background: '#0a0a0f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !currentPw || newPw.length < 12 ? 0.5 : 1 }}>
        Update password
      </button>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/admin/settings/notifications`, { headers: authHeaders() })
      .then(r => r.json()).then(setSettings).catch(() => {});
  }, []);

  const save = async () => {
    await fetch(`${API}/admin/settings/notifications`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return <div style={{ color: '#9ca3af' }}>Loading...</div>;

  const toggles = [
    ['notify_daily_digest', 'Daily digest (morning summary)'],
    ['notify_new_customer', 'New customer signup (real-time)'],
    ['notify_large_payment', 'Large payment received'],
    ['notify_new_attorney', 'New attorney submission'],
    ['notify_system_error', 'System error (500+)'],
    ['notify_failed_payout', 'Failed payout'],
    ['notify_weekly_summary', 'Weekly revenue summary'],
  ];

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f', marginBottom: 16 }}>Email Notifications</div>
      {toggles.map(([key, label]) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!settings[key]}
            onChange={e => setSettings({ ...settings, [key]: e.target.checked })}
            style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
        </label>
      ))}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={save} style={{ padding: '10px 20px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Save preferences
        </button>
        {saved && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Saved</span>}
      </div>
    </div>
  );
}

function SystemFlagsTab() {
  const [flags, setFlags] = useState(null);
  useEffect(() => {
    fetch(`${API}/admin/settings/flags`, { headers: authHeaders() })
      .then(r => r.json()).then(setFlags).catch(() => {});
  }, []);

  if (!flags) return <div style={{ color: '#9ca3af' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f', marginBottom: 16 }}>System Flags (read-only)</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>These are read from environment variables. Change via deployment config.</div>
      {Object.entries(flags).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>{key}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: value === 'true' ? '#16a34a' : '#b91c1c' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function AuditLogTab() {
  const [data, setData] = useState({ logs: [], total: 0 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API}/admin/audit-log?page=${page}&per_page=30`, { headers: authHeaders() })
      .then(r => r.json()).then(setData).catch(() => {});
  }, [page]);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f', marginBottom: 16 }}>Audit Log ({data.total})</div>
      {data.logs.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: 12 }}>No audit log entries.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
              <th style={th}>TIME</th><th style={th}>ADMIN</th><th style={th}>ACTION</th><th style={th}>ENTITY</th><th style={th}>IP</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ ...td, fontSize: 10, color: '#9ca3af' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '-'}</td>
                <td style={td}>{l.admin_email || '-'}</td>
                <td style={td}><span style={{ fontWeight: 600, color: '#0a0a0f' }}>{l.action}</span></td>
                <td style={td}>{l.entity_type ? `${l.entity_type}:${(l.entity_id || '').slice(-8)}` : '-'}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 10, color: '#9ca3af' }}>{l.ip_address || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.total_pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pgBtn}>&larr;</button>
          <span style={{ fontSize: 11, color: '#6b7280', padding: '4px 10px' }}>{page}/{data.total_pages}</span>
          <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)} style={pgBtn}>&rarr;</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #e2e0db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const th = { padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 9, letterSpacing: 0.5 };
const td = { padding: '8px 10px', color: '#374151' };
const pgBtn = { padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #e2e0db', borderRadius: 4, cursor: 'pointer' };
