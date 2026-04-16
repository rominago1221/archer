import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BASE = '/internal/dashboard-x9k7';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }

function fmt(cents) {
  if (!cents && cents !== 0) return '--';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30d');
  const [metrics, setMetrics] = useState(null);
  const [chart, setChart] = useState([]);
  const [signups, setSignups] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/admin/dashboard/metrics?period=${period}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/admin/dashboard/revenue-chart?period=${period}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/admin/dashboard/recent-signups?limit=8`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/admin/dashboard/recent-payments?limit=8`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([m, c, s, p]) => {
      setMetrics(m); setChart(c); setSignups(s); setPayments(p);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  if (loading || !metrics) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading dashboard...</div>;
  }

  const m = metrics;
  const ai = m.action_items || {};
  const totalActions = (ai.attorneys_pending || 0) + (ai.payouts_failed || 0) + (ai.cases_unmatched || 0);

  // SVG Revenue Chart
  const maxRev = Math.max(...chart.map(d => d.revenue), 1);
  const chartW = 500, chartH = 140, pad = 30;
  const points = chart.map((d, i) => {
    const x = pad + (i / Math.max(chart.length - 1, 1)) * (chartW - pad * 2);
    const y = chartH - pad - (d.revenue / maxRev) * (chartH - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f' }}>Dashboard</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Last updated: just now</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['7d', '30d', 'ytd'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', fontSize: 11, fontWeight: period === p ? 700 : 400,
              background: period === p ? '#0a0a0f' : '#fff', color: period === p ? '#fff' : '#6b7280',
              border: '1px solid #e2e0db', borderRadius: 6, cursor: 'pointer',
            }}>{p.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="MRR" value={fmt(m.mrr.current)} sub={`${m.mrr.growth_percent > 0 ? '+' : ''}${m.mrr.growth_percent}% vs last period`} color={m.mrr.growth_percent >= 0 ? '#16a34a' : '#b91c1c'} />
        <StatCard label="REVENUE TODAY" value={fmt(m.revenue.today)} sub={`Period: ${fmt(m.revenue.period)}`} />
        <StatCard label="NEW CUSTOMERS" value={String(m.customers.new_today)} sub={`${m.customers.new_week} this week`} />
        <StatCard label="ACTIVE CASES" value={String(m.cases.active)} sub={`${m.cases.pending_attribution} pending attribution`} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        {/* Revenue chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>REVENUE EVOLUTION</div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 160 }}>
            {chart.length > 1 && (
              <>
                <polyline points={points} fill="none" stroke="#1a56db" strokeWidth="2" strokeLinejoin="round" />
                <polygon points={`${pad},${chartH - pad} ${points} ${chartW - pad},${chartH - pad}`} fill="url(#revGrad)" opacity="0.15" />
                <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a56db" /><stop offset="100%" stopColor="#1a56db" stopOpacity="0" /></linearGradient></defs>
              </>
            )}
            <line x1={pad} y1={chartH - pad} x2={chartW - pad} y2={chartH - pad} stroke="#e2e0db" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Customers by tier */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>CUSTOMERS BY TIER</div>
          {Object.entries(m.customers.by_tier).map(([tier, count]) => {
            const pct = m.customers.total > 0 ? Math.round((count / m.customers.total) * 100) : 0;
            return (
              <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 60, fontSize: 11, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{tier}</div>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#1a56db', borderRadius: 4, width: `${pct}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ width: 70, fontSize: 11, color: '#6b7280', textAlign: 'right' }}>{count} ({pct}%)</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Required */}
      {totalActions > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '18px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 12 }}>ACTION REQUIRED</div>
          {ai.attorneys_pending > 0 && (
            <ActionRow label={`${ai.attorneys_pending} new attorney${ai.attorneys_pending > 1 ? 's' : ''} pending approval`} onClick={() => navigate(`${BASE}/attorneys`)} />
          )}
          {ai.payouts_failed > 0 && (
            <ActionRow label={`${ai.payouts_failed} payout${ai.payouts_failed > 1 ? 's' : ''} failed this week`} onClick={() => navigate(`${BASE}/operations`)} />
          )}
          {ai.cases_unmatched > 0 && (
            <ActionRow label={`${ai.cases_unmatched} case${ai.cases_unmatched > 1 ? 's' : ''} unmatched > 24h`} onClick={() => navigate(`${BASE}/cases`)} />
          )}
        </div>
      )}

      {/* Recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>RECENT SIGNUPS</div>
          {signups.map((u, i) => (
            <div key={u.user_id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < signups.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f' }}>{u.name || u.email}</div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>{u.email}</div>
              </div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>{u.plan || 'free'}</div>
            </div>
          ))}
          {signups.length === 0 && <div style={{ fontSize: 11, color: '#9ca3af' }}>No recent signups</div>}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>RECENT PAYMENTS</div>
          {payments.map((p, i) => (
            <div key={p.case_id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < payments.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f' }}>{p.customer_email}</div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.type || 'payment'}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>{fmt(p.amount_paid_cents)}</div>
            </div>
          ))}
          {payments.length === 0 && <div style={{ fontSize: 11, color: '#9ca3af' }}>No recent payments</div>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '0.5px solid #e2e0db' }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#0a0a0f', letterSpacing: -1, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10, color: color || '#6b7280' }}>{sub}</div>
    </div>
  );
}

function ActionRow({ label, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid #fde68a',
    }}>
      <span style={{ fontSize: 12, color: '#78350f' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#1a56db', fontWeight: 600 }}>Review &rarr;</span>
    </div>
  );
}
