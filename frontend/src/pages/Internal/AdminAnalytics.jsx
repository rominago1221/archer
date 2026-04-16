import React, { useState, useEffect } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }

export default function AdminAnalytics() {
  const [funnel, setFunnel] = useState(null);
  const [geo, setGeo] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [caseTypes, setCaseTypes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/analytics/funnel`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/admin/analytics/geography`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/admin/analytics/attorney-leaderboard`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/admin/analytics/case-types`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([f, g, l, ct]) => {
      setFunnel(f); setGeo(g); setLeaderboard(l); setCaseTypes(ct);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#9ca3af', textAlign: 'center' }}>Loading analytics...</div>;

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 24 }}>Analytics</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Conversion Funnel */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 16 }}>CONVERSION FUNNEL</div>
          {funnel?.steps?.map((step, i) => {
            const maxCount = funnel.steps[0]?.count || 1;
            const pct = Math.round((step.count / maxCount) * 100);
            const prevCount = i > 0 ? funnel.steps[i - 1].count : step.count;
            const dropoff = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 100;
            return (
              <div key={step.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f' }}>{step.label}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    {step.count.toLocaleString()} {i > 0 && <span style={{ fontSize: 10, color: dropoff < 50 ? '#b91c1c' : '#16a34a' }}>({dropoff}%)</span>}
                  </span>
                </div>
                <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: `hsl(${220 - i * 20}, 70%, ${50 + i * 5}%)`, borderRadius: 4, width: `${pct}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Geographic Distribution */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 16 }}>CUSTOMERS BY COUNTRY</div>
          {geo?.countries?.map(c => {
            const maxC = geo.countries[0]?.count || 1;
            return (
              <div key={c.country} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, fontSize: 13, fontWeight: 700, color: '#0a0a0f' }}>{c.country}</div>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#1a56db', borderRadius: 4, width: `${(c.count / maxC) * 100}%` }} />
                </div>
                <div style={{ width: 50, fontSize: 11, color: '#6b7280', textAlign: 'right' }}>{c.count}</div>
              </div>
            );
          })}
          {(!geo?.countries || geo.countries.length === 0) && <div style={{ color: '#9ca3af', fontSize: 11 }}>No data</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Case Types */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 16 }}>CASES BY TYPE</div>
          {caseTypes?.types?.map(t => {
            const maxT = caseTypes.types[0]?.count || 1;
            return (
              <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 90, fontSize: 11, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{t.type.replace(/_/g, ' ')}</div>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#16a34a', borderRadius: 4, width: `${(t.count / maxT) * 100}%` }} />
                </div>
                <div style={{ width: 40, fontSize: 11, color: '#6b7280', textAlign: 'right' }}>{t.count}</div>
              </div>
            );
          })}
        </div>

        {/* Attorney Leaderboard */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 16 }}>ATTORNEY LEADERBOARD</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e0db' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, color: '#9ca3af' }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, color: '#9ca3af' }}>NAME</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, color: '#9ca3af' }}>CASES</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, color: '#9ca3af' }}>ACTIVE</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard?.attorneys?.slice(0, 10).map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px', fontWeight: 800, color: i < 3 ? '#b45309' : '#9ca3af' }}>{i + 1}</td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#0a0a0f' }}>{a.first_name} {a.last_name}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{a.cases_completed}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#6b7280' }}>{a.active_cases_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!leaderboard?.attorneys || leaderboard.attorneys.length === 0) && <div style={{ color: '#9ca3af', fontSize: 11 }}>No attorneys yet</div>}
        </div>
      </div>
    </div>
  );
}
