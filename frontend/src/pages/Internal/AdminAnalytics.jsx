import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }

const BEHAVIOR_CASE_TYPES = ['', 'housing', 'employment', 'debt', 'consumer', 'nda', 'contract', 'commercial', 'court', 'traffic', 'penal', 'insurance', 'family', 'immigration', 'other'];
const BEHAVIOR_PLANS = ['', 'free', 'solo', 'family', 'pro'];
const BEHAVIOR_JURISDICTIONS = ['', 'BE', 'US'];

function KpiCard({ label, value, sublabel, tone = 'neutral' }) {
  const toneColor = tone === 'success' ? '#16a34a' : tone === 'warn' ? '#b45309' : tone === 'danger' ? '#b91c1c' : '#0a0a0f';
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '0.5px solid #e2e0db', minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.8, marginBottom: 6 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: toneColor, lineHeight: 1.1 }}>{value}</div>
      {sublabel && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{sublabel}</div>}
    </div>
  );
}

function fmtSeconds(s) {
  const n = Number(s) || 0;
  const m = Math.floor(n / 60);
  const r = n % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function fmtPct(x) {
  const n = Number(x) || 0;
  return `${(n * 100).toFixed(1)}%`;
}

function formatDateShort(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch { return ''; }
}

export default function AdminAnalytics() {
  const [funnel, setFunnel] = useState(null);
  const [geo, setGeo] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [caseTypes, setCaseTypes] = useState(null);
  const [loading, setLoading] = useState(true);

  // Behavior analytics state + filters.
  const [period, setPeriod] = useState('30d');
  const [caseTypeFilter, setCaseTypeFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [behavior, setBehavior] = useState(null);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const [abandonedCases, setAbandonedCases] = useState(null);

  const fetchBehavior = useCallback(async () => {
    setBehaviorLoading(true);
    const params = new URLSearchParams();
    params.set('period', period);
    if (caseTypeFilter) params.set('case_type', caseTypeFilter);
    if (planFilter) params.set('plan', planFilter);
    if (jurisdictionFilter) params.set('jurisdiction', jurisdictionFilter);
    try {
      const [b, a] = await Promise.all([
        fetch(`${API}/admin/analytics/behavior?${params.toString()}`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/admin/analytics/abandoned-cases?period=${period}&limit=50`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setBehavior(b);
      setAbandonedCases(a);
    } catch { /* silent */ } finally {
      setBehaviorLoading(false);
    }
  }, [period, caseTypeFilter, planFilter, jurisdictionFilter]);

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

  useEffect(() => { fetchBehavior(); }, [fetchBehavior]);

  const funnelChartData = useMemo(() => {
    if (!behavior) return [];
    const f = behavior.funnel || {};
    return [
      { name: 'Viewed',        value: f.analysis_viewed || 0, fill: '#1a56db' },
      { name: 'Scrolled',      value: f.scrolled_to_bottom || 0, fill: '#2563eb' },
      { name: 'Clicked letter',value: f.clicked_attorney_letter || 0, fill: '#4338ca' },
      { name: 'Purchased',     value: (f.purchased_attorney_letter || 0) + (f.purchased_live_counsel || 0), fill: '#16a34a' },
    ];
  }, [behavior]);

  const caseTypeChartData = useMemo(() => {
    const src = behavior?.by_case_type || [];
    return src.slice(0, 10).map(x => ({ name: (x.case_type || 'other').slice(0, 14), count: x.count, conv: x.conversion_rate }));
  }, [behavior]);

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

      {/* ════════════════ USER BEHAVIOR ════════════════ */}
      <div style={{ marginTop: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0f', marginBottom: 18 }}>User Behavior</div>

        {/* Filters row */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '16px 20px',
          border: '0.5px solid #e2e0db', marginBottom: 20,
          display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.8 }}>PERIOD</span>
            {['7d', '30d', 'all'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${period === p ? '#1a56db' : '#d1d5db'}`,
                  background: period === p ? '#1a56db' : '#fff',
                  color: period === p ? '#fff' : '#374151',
                  cursor: 'pointer',
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 22, background: '#e2e0db' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.8 }}>CASE TYPE</span>
            <select
              value={caseTypeFilter}
              onChange={(e) => setCaseTypeFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 11, borderRadius: 8, border: '1px solid #d1d5db' }}
            >
              {BEHAVIOR_CASE_TYPES.map(t => (
                <option key={t || 'all'} value={t}>{t || 'All'}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.8 }}>PLAN</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 11, borderRadius: 8, border: '1px solid #d1d5db' }}
            >
              {BEHAVIOR_PLANS.map(p => (
                <option key={p || 'all'} value={p}>{p || 'All'}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.8 }}>JURISDICTION</span>
            <select
              value={jurisdictionFilter}
              onChange={(e) => setJurisdictionFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 11, borderRadius: 8, border: '1px solid #d1d5db' }}
            >
              {BEHAVIOR_JURISDICTIONS.map(j => (
                <option key={j || 'all'} value={j}>{j || 'All'}</option>
              ))}
            </select>
          </div>

          {behaviorLoading && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>Loading…</span>}
        </div>

        {/* Funnel KPI cards */}
        {behavior && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
              <KpiCard label="Analyses viewed" value={behavior.funnel?.analysis_viewed || 0} sublabel={`${behavior.total_users_active || 0} active users`} />
              <KpiCard label="Scrolled to bottom" value={behavior.funnel?.scrolled_to_bottom || 0} sublabel={`${fmtPct(behavior.conversion_rates?.view_to_scroll)} of views`} />
              <KpiCard label="Clicked Attorney Letter" value={behavior.funnel?.clicked_attorney_letter || 0} sublabel={`${fmtPct(behavior.conversion_rates?.view_to_attorney_click)} of views`} tone="warn" />
              <KpiCard label="Purchased" value={(behavior.funnel?.purchased_attorney_letter || 0) + (behavior.funnel?.purchased_live_counsel || 0)} sublabel={`view→paid: ${fmtPct(behavior.conversion_rates?.overall_view_to_purchase)}`} tone="success" />
            </div>

            {/* Funnel bar chart */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #e2e0db', marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 10 }}>FUNNEL</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelChartData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {funnelChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
              <KpiCard label="Avg time on analysis" value={fmtSeconds(behavior.engagement?.avg_time_on_analysis_seconds)} />
              <KpiCard label="Avg refinements / case" value={(behavior.engagement?.avg_refinements_per_case || 0).toFixed(2)} />
              <KpiCard label="Abandonment rate" value={fmtPct(behavior.engagement?.abandonment_rate)} tone={(behavior.engagement?.abandonment_rate || 0) > 0.25 ? 'danger' : 'neutral'} />
            </div>

            {/* Breakdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 18 }}>
              {/* Case type breakdown with conversion */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '0.5px solid #e2e0db' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 14 }}>TOP CASE TYPES</div>
                {caseTypeChartData.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>No data for filters.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={caseTypeChartData} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#374151' }} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }}
                        formatter={(v, n, props) => n === 'count' ? [`${v} cases`, 'Count'] : [fmtPct(v), 'Purchase rate']} />
                      <Bar dataKey="count" fill="#1a56db" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* By plan + jurisdiction */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '0.5px solid #e2e0db' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>BY PLAN</div>
                  {(behavior.by_plan || []).length === 0
                    ? <div style={{ color: '#9ca3af', fontSize: 11 }}>No data.</div>
                    : (behavior.by_plan || []).map(p => (
                      <div key={p.plan} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ fontWeight: 700, color: '#0a0a0f', textTransform: 'capitalize' }}>{p.plan}</span>
                        <span style={{ color: '#6b7280' }}>
                          {p.count} cases · <strong style={{ color: p.conversion_to_paid > 0.05 ? '#16a34a' : '#6b7280' }}>{fmtPct(p.conversion_to_paid)} conv</strong>
                        </span>
                      </div>
                    ))}
                </div>
                <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '0.5px solid #e2e0db' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>BY JURISDICTION</div>
                  {(behavior.by_jurisdiction || []).length === 0
                    ? <div style={{ color: '#9ca3af', fontSize: 11 }}>No data.</div>
                    : (behavior.by_jurisdiction || []).map(j => (
                      <div key={j.jurisdiction} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ fontWeight: 700, color: '#0a0a0f' }}>{j.jurisdiction}</span>
                        <span style={{ color: '#6b7280' }}>{j.count} cases</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Abandoned cases */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '0.5px solid #e2e0db' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: 1 }}>
                  ABANDONED CASES ({abandonedCases?.count || 0})
                </div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Signals of unconvincing analyses — click to audit.</div>
              </div>
              {(abandonedCases?.cases || []).length === 0 ? (
                <div style={{ fontSize: 11, color: '#9ca3af' }}>No abandoned cases in this period.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e0db' }}>
                      <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: 9, color: '#9ca3af' }}>CASE</th>
                      <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: 9, color: '#9ca3af' }}>TYPE</th>
                      <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: 9, color: '#9ca3af' }}>JUR.</th>
                      <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: 9, color: '#9ca3af' }}>PLAN</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', fontSize: 9, color: '#9ca3af' }}>RISK</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', fontSize: 9, color: '#9ca3af' }}>TIME</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right', fontSize: 9, color: '#9ca3af' }}>ABANDONED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(abandonedCases?.cases || []).map(c => (
                      <tr key={c.case_id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                          onClick={() => window.open(`/cases/${c.case_id}`, '_blank', 'noopener')}>
                        <td style={{ padding: '8px 6px', fontWeight: 600, color: '#0a0a0f', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td style={{ padding: '8px 6px', color: '#374151', textTransform: 'capitalize' }}>{c.case_type || '—'}</td>
                        <td style={{ padding: '8px 6px', color: '#374151' }}>{c.jurisdiction || '—'}</td>
                        <td style={{ padding: '8px 6px', color: '#374151', textTransform: 'capitalize' }}>{c.user_plan || 'free'}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: (c.risk_score || 0) >= 70 ? '#b91c1c' : '#374151' }}>{c.risk_score || 0}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6b7280' }}>{fmtSeconds(c.time_before_abandon_seconds || 0)}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6b7280' }}>{formatDateShort(c.abandoned_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
