import React, { useState, useEffect, useCallback } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }
function fmt(cents) { return cents ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) : '-'; }

export default function AdminCases() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ cases: [], total: 0, total_pages: 1, status_counts: {} });
  const [loading, setLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '50' });
    if (search) params.set('search', search);
    if (typeFilter) params.set('case_type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`${API}/admin/cases?${params}`, { headers: authHeaders() });
    setData(await res.json());
    setLoading(false);
  }, [search, typeFilter, statusFilter, page]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const sc = data.status_counts || {};

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 20 }}>Cases</div>

      {/* Status counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'TOTAL', value: sc.total || data.total, color: '#0a0a0f' },
          { label: 'ACTIVE', value: sc.active || 0, color: '#1a56db' },
          { label: 'PENDING', value: sc.pending || 0, color: '#b45309' },
          { label: 'COMPLETED', value: sc.completed || 0, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '0.5px solid #e2e0db', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search case # or title..." style={inputStyle} />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All types</option>
          {['housing', 'employment', 'traffic', 'consumer', 'debt', 'family', 'insurance', 'contract', 'other'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="analyzing">Analyzing</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
              <th style={th}>CASE #</th><th style={th}>CUSTOMER</th><th style={th}>TYPE</th>
              <th style={th}>STATUS</th><th style={th}>ATTORNEY</th><th style={th}>PAYMENT</th>
              <th style={th}>RISK</th><th style={th}>CREATED</th>
            </tr>
          </thead>
          <tbody>
            {data.cases.map(c => (
              <tr key={c.case_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 10, color: '#1a56db' }}>#{c.case_id?.slice(-6)}</span></td>
                <td style={td}>{c.customer_name || c.customer_email || '-'}</td>
                <td style={td}><span style={{ fontSize: 10, padding: '2px 6px', background: '#f3f4f6', borderRadius: 4 }}>{c.type || '-'}</span></td>
                <td style={td}><StatusBadge status={c.status} /></td>
                <td style={td}>{c.attorney_name || <span style={{ color: '#b45309', fontSize: 10 }}>unassigned</span>}</td>
                <td style={td}>{c.payment_status === 'paid' ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(c.amount_paid_cents)}</span> : <span style={{ color: '#9ca3af' }}>-</span>}</td>
                <td style={td}><span style={{ fontWeight: 700, color: (c.risk_score || 0) > 60 ? '#b91c1c' : (c.risk_score || 0) > 30 ? '#b45309' : '#16a34a' }}>{c.risk_score || '-'}</span></td>
                <td style={{ ...td, color: '#9ca3af', fontSize: 10 }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data.total_pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pgBtn}>&larr; Prev</button>
          <span style={{ fontSize: 12, color: '#6b7280', padding: '6px 12px' }}>Page {page} of {data.total_pages}</span>
          <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)} style={pgBtn}>Next &rarr;</button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { active: { bg: '#eff6ff', c: '#1a56db' }, analyzing: { bg: '#fef3c7', c: '#b45309' }, resolved: { bg: '#dcfce7', c: '#16a34a' }, completed: { bg: '#dcfce7', c: '#16a34a' } };
  const s = colors[status] || { bg: '#f3f4f6', c: '#6b7280' };
  return <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.c }}>{(status || 'unknown').toUpperCase()}</span>;
}

const th = { padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 9, letterSpacing: 0.5 };
const td = { padding: '10px 10px', color: '#374151' };
const inputStyle = { flex: 1, padding: '8px 14px', border: '1px solid #e2e0db', borderRadius: 8, fontSize: 13, outline: 'none' };
const selectStyle = { padding: '8px 14px', border: '1px solid #e2e0db', borderRadius: 8, fontSize: 13 };
const pgBtn = { padding: '6px 14px', fontSize: 11, background: '#fff', border: '1px solid #e2e0db', borderRadius: 6, cursor: 'pointer' };
