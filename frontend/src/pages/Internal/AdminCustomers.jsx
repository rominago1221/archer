import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }
function fmt(cents) { return cents ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) : '\u20ac0'; }

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ customers: [], total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '50' });
    if (search) params.set('search', search);
    if (tier) params.set('tier', tier);
    const res = await fetch(`${API}/admin/customers?${params}`, { headers: authHeaders() });
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [search, tier, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  if (selected) {
    return <CustomerDetail customerId={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f' }}>
          Customers ({data.total})
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name or email..."
          style={{ flex: 1, padding: '8px 14px', border: '1px solid #e2e0db', borderRadius: 8, fontSize: 13, outline: 'none' }}
        />
        <select value={tier} onChange={e => { setTier(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', border: '1px solid #e2e0db', borderRadius: 8, fontSize: 13 }}>
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="solo">Solo</option>
          <option value="family">Family</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
                <th style={thStyle}>NAME</th>
                <th style={thStyle}>EMAIL</th>
                <th style={thStyle}>TIER</th>
                <th style={thStyle}>CASES</th>
                <th style={thStyle}>REVENUE</th>
                <th style={thStyle}>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map(u => (
                <tr key={u.user_id} onClick={() => setSelected(u.user_id)}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: '#0a0a0f' }}>{u.name || '-'}</span></td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}><TierBadge tier={u.plan} /></td>
                  <td style={tdStyle}>{u.case_count || 0}</td>
                  <td style={tdStyle}>{fmt(u.total_revenue_cents)}</td>
                  <td style={{ ...tdStyle, color: '#9ca3af', fontSize: 11 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={pgBtn}>&larr; Prev</button>
              <span style={{ fontSize: 12, color: '#6b7280', padding: '6px 12px' }}>Page {page} of {data.total_pages}</span>
              <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}
                style={pgBtn}>Next &rarr;</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CustomerDetail({ customerId, onBack }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/admin/customers/${customerId}`, { headers: authHeaders() })
      .then(r => r.json()).then(setData).catch(() => {});
  }, [customerId]);

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>;

  const c = data.customer;
  return (
    <div style={{ padding: '28px 32px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1a56db', fontWeight: 600, marginBottom: 16 }}>
        &larr; Back to customers
      </button>

      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', border: '0.5px solid #e2e0db', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0a0a0f', marginBottom: 4 }}>{c.name || c.email}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
          {c.email} {'\u00b7'} <TierBadge tier={c.plan} /> {'\u00b7'} Member since {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <MiniStat label="Total spent" value={fmt(data.total_spent_cents)} />
          <MiniStat label="Cases" value={String(data.case_count)} />
          <MiniStat label="Country" value={c.country || c.jurisdiction || '-'} />
          <MiniStat label="Language" value={c.language || '-'} />
        </div>
      </div>

      {/* Cases */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '0.5px solid #e2e0db' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0f', marginBottom: 12 }}>Cases ({data.cases.length})</div>
        {data.cases.map(cas => (
          <div key={cas.case_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f' }}>{cas.title || 'Untitled'}</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>{cas.type} {'\u00b7'} {cas.status}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: cas.risk_score > 60 ? '#b91c1c' : '#16a34a' }}>{cas.risk_score || '-'}</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>{cas.payment_status === 'paid' ? fmt(cas.amount_paid_cents) : 'unpaid'}</div>
            </div>
          </div>
        ))}
        {data.cases.length === 0 && <div style={{ fontSize: 11, color: '#9ca3af' }}>No cases</div>}
      </div>
    </div>
  );
}

function TierBadge({ tier }) {
  const t = tier || 'free';
  const colors = { free: { bg: '#f3f4f6', color: '#6b7280' }, solo: { bg: '#eff6ff', color: '#1a56db' }, family: { bg: '#f0fdf4', color: '#16a34a' }, pro: { bg: '#fef3c7', color: '#b45309' } };
  const c = colors[t] || colors.free;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: c.bg, color: c.color }}>{t.toUpperCase()}</span>;
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: '#fafaf8', borderRadius: 8, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0a0a0f' }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{label}</div>
    </div>
  );
}

const thStyle = { padding: '8px 12px', fontWeight: 700, color: '#6b7280', fontSize: 10, letterSpacing: 0.5 };
const tdStyle = { padding: '10px 12px', color: '#374151' };
const pgBtn = { padding: '6px 14px', fontSize: 11, background: '#fff', border: '1px solid #e2e0db', borderRadius: 6, cursor: 'pointer' };
