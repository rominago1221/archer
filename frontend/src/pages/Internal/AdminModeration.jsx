import React, { useState, useEffect } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }

export default function AdminModeration() {
  const [tab, setTab] = useState('feedbacks');

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 20 }}>Moderation</div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e0db', marginBottom: 20 }}>
        {[{ key: 'feedbacks', label: 'Client Feedbacks' }, { key: 'refs', label: 'Unverified Legal Refs' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', fontSize: 13, cursor: 'pointer',
            fontWeight: tab === t.key ? 700 : 400, background: 'none', border: 'none',
            borderBottom: tab === t.key ? '2px solid #1a56db' : '2px solid transparent',
            color: tab === t.key ? '#1a56db' : '#6b7280',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'feedbacks' && <FeedbacksTab />}
      {tab === 'refs' && <UnverifiedRefsTab />}
    </div>
  );
}

function FeedbacksTab() {
  const [data, setData] = useState({ feedbacks: [], total: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/admin/moderation/feedbacks`, { headers: authHeaders() })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (data.feedbacks.length === 0) return <Empty text="No client feedbacks yet." />;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
          <th style={th}>DATE</th><th style={th}>CASE</th><th style={th}>RATING</th><th style={th}>COMMENT</th><th style={th}>STATUS</th>
        </tr>
      </thead>
      <tbody>
        {data.feedbacks.map((f, i) => (
          <tr key={f.id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={td}>{f.created_at ? new Date(f.created_at).toLocaleDateString() : '-'}</td>
            <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 10 }}>#{(f.case_id || '').slice(-6)}</span></td>
            <td style={td}>{f.rating === 'positive' ? '\ud83d\udc4d' : f.rating === 'negative' ? '\ud83d\udc4e' : '-'}</td>
            <td style={{ ...td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.comment || '-'}</td>
            <td style={td}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: f.status === 'new' ? '#fee2e2' : '#dcfce7', color: f.status === 'new' ? '#b91c1c' : '#16a34a' }}>{(f.status || 'new').toUpperCase()}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UnverifiedRefsTab() {
  const [data, setData] = useState({ unverified: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/admin/moderation/unverified-refs`, { headers: authHeaders() })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (data.unverified.length === 0) return <Empty text="All legal references are verified." />;

  return (
    <div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
        Legal references cited by AI but not yet in the verified database. Add them via POST /api/admin/legal-references.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
            <th style={th}>LEGAL REFERENCE</th><th style={th}>FINDING</th><th style={th}>CASE</th>
          </tr>
        </thead>
        <tbody>
          {data.unverified.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ ...td, fontFamily: 'monospace', color: '#b91c1c', fontWeight: 600 }}>{r.legal_ref}</td>
              <td style={{ ...td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.finding_text}</td>
              <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 10 }}>#{(r.case_id || '').slice(-6)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Loader() { return <div style={{ padding: 20, color: '#9ca3af' }}>Loading...</div>; }
function Empty({ text }) { return <div style={{ padding: 20, color: '#9ca3af', textAlign: 'center' }}>{text}</div>; }
const th = { padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 9, letterSpacing: 0.5 };
const td = { padding: '10px 10px', color: '#374151' };
