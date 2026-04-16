import React, { useState, useEffect } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }
function fmt(cents) { return cents ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) : '-'; }

export default function AdminOperations() {
  const [tab, setTab] = useState('payouts');

  const tabs = [
    { key: 'payouts', label: 'Payouts Stripe' },
    { key: 'refunds', label: 'Refunds' },
    { key: 'ai', label: 'AI Usage & Costs' },
  ];

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 20 }}>Operations</div>

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

      {tab === 'payouts' && <PayoutsTab />}
      {tab === 'refunds' && <RefundsTab />}
      {tab === 'ai' && <AiUsageTab />}
    </div>
  );
}

function PayoutsTab() {
  const [data, setData] = useState({ payouts: [], total: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/admin/payouts`, { headers: authHeaders() })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#9ca3af' }}>Loading...</div>;
  if (data.payouts.length === 0) return <div style={{ padding: 20, color: '#9ca3af' }}>No payouts recorded yet.</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
          <th style={th}>DATE</th><th style={th}>ATTORNEY</th><th style={th}>AMOUNT</th>
          <th style={th}>CASES</th><th style={th}>STATUS</th>
        </tr>
      </thead>
      <tbody>
        {data.payouts.map((p, i) => (
          <tr key={p.id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={td}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
            <td style={td}>{p.attorney_name || p.attorney_email || '-'}</td>
            <td style={td}><span style={{ fontWeight: 700, color: '#0a0a0f' }}>{fmt(p.amount_cents)}</span></td>
            <td style={td}>{p.assignment_count || '-'}</td>
            <td style={td}><StatusPill status={p.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RefundsTab() {
  const [data, setData] = useState({ refunds: [], total: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/admin/refunds`, { headers: authHeaders() })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#9ca3af' }}>Loading...</div>;
  if (data.refunds.length === 0) return <div style={{ padding: 20, color: '#9ca3af' }}>No refunds recorded.</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
          <th style={th}>DATE</th><th style={th}>CUSTOMER</th><th style={th}>AMOUNT</th><th style={th}>REASON</th>
        </tr>
      </thead>
      <tbody>
        {data.refunds.map((r, i) => (
          <tr key={r.case_id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={td}>{r.refunded_at ? new Date(r.refunded_at).toLocaleDateString() : '-'}</td>
            <td style={td}>{r.customer_email || '-'}</td>
            <td style={td}><span style={{ fontWeight: 700, color: '#b91c1c' }}>{fmt(r.amount_paid_cents)}</span></td>
            <td style={td}>{r.refund_reason || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AiUsageTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/admin/ai-usage?period=30d`, { headers: authHeaders() })
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#9ca3af' }}>Loading...</div>;
  if (!data) return <div style={{ padding: 20, color: '#9ca3af' }}>No AI usage data.</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <MiniStat label="TOTAL REQUESTS" value={String(data.total_requests)} />
        <MiniStat label="TOTAL TOKENS" value={data.total_tokens > 1000000 ? `${(data.total_tokens / 1000000).toFixed(1)}M` : `${Math.round(data.total_tokens / 1000)}K`} />
        <MiniStat label="EST. COST" value={`$${data.total_cost_usd}`} />
        <MiniStat label="COST / CASE" value={`$${data.cost_per_case}`} />
      </div>

      {data.models.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
              <th style={th}>MODEL</th><th style={th}>REQUESTS</th><th style={th}>TOKENS</th><th style={th}>EST COST</th>
            </tr>
          </thead>
          <tbody>
            {data.models.map(m => (
              <tr key={m.model} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}>{m.model}</td>
                <td style={td}>{m.requests.toLocaleString()}</td>
                <td style={td}>{m.tokens > 1000000 ? `${(m.tokens / 1000000).toFixed(1)}M` : `${Math.round(m.tokens / 1000)}K`}</td>
                <td style={td}><span style={{ fontWeight: 700 }}>${m.cost_usd}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.models.length === 0 && (
        <div style={{ padding: 20, color: '#9ca3af', textAlign: 'center' }}>
          No AI usage logs yet. Logs will appear after the ai_usage_logs collection is populated.
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const c = status === 'paid' ? { bg: '#dcfce7', color: '#16a34a' }
    : status === 'failed' ? { bg: '#fee2e2', color: '#b91c1c' }
    : { bg: '#fef3c7', color: '#b45309' };
  return <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: c.bg, color: c.color }}>{(status || 'pending').toUpperCase()}</span>;
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '0.5px solid #e2e0db', textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#0a0a0f', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

const th = { padding: '8px 10px', fontWeight: 700, color: '#6b7280', fontSize: 9, letterSpacing: 0.5 };
const td = { padding: '10px 10px', color: '#374151' };
