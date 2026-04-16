import React from 'react';

// Placeholder — will be populated in Jour 2 with full metrics
export default function AdminDashboard() {
  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 8 }}>Dashboard</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>Business metrics and action items.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="MRR" value="--" sub="Coming soon" />
        <StatCard label="REVENUE TODAY" value="--" sub="Coming soon" />
        <StatCard label="NEW CUSTOMERS" value="--" sub="Coming soon" />
        <StatCard label="ACTIVE CASES" value="--" sub="Coming soon" />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '0.5px solid #e2e0db' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f', marginBottom: 8 }}>
          Action Required
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Full dashboard with revenue charts, conversion funnel, and action items will be implemented in Jour 2.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px',
      border: '0.5px solid #e2e0db',
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#0a0a0f', letterSpacing: -1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#6b7280' }}>{sub}</div>
    </div>
  );
}
