import React, { useState, useEffect, useCallback } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }; }

export default function AdminAttorneys() {
  const [tab, setTab] = useState('pending');
  const [attorneys, setAttorneys] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [shareReason, setShareReason] = useState(false);

  const statusMap = { pending: 'pending', all: undefined, suspended: 'suspended', approved: 'approved' };

  const fetchAttorneys = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusMap[tab]) params.set('status', statusMap[tab]);
    const res = await fetch(`${API}/admin/attorneys-v2?${params}`, { headers: authHeaders() });
    const data = await res.json();
    setAttorneys(data.attorneys || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchAttorneys(); }, [fetchAttorneys]);

  const handleApprove = async (id) => {
    await fetch(`${API}/admin/attorneys-v2/${id}/approve`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setSelected(null);
    fetchAttorneys();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await fetch(`${API}/admin/attorneys-v2/${rejectModal}/reject`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason, share_with_attorney: shareReason }),
    });
    setRejectModal(null);
    setRejectReason('');
    setShareReason(false);
    setSelected(null);
    fetchAttorneys();
  };

  const tabs = [
    { key: 'all', label: `All (${tab === 'all' ? total : '...'})` },
    { key: 'pending', label: 'Pending approval', badge: true },
    { key: 'approved', label: 'Approved' },
    { key: 'suspended', label: 'Suspended' },
  ];

  const pendingCount = tab === 'pending' ? total : null;

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 20 }}>
        Attorneys
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e0db', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); }}
            style={{
              padding: '10px 20px', fontSize: 13, cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 400, background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid #1a56db' : '2px solid transparent',
              color: tab === t.key ? '#1a56db' : '#6b7280',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {t.label}
            {t.badge && pendingCount > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Detail view */}
      {selected ? (
        <AttorneyDetail
          attorney={selected}
          onApprove={() => handleApprove(selected.id)}
          onReject={() => setRejectModal(selected.id)}
          onBack={() => setSelected(null)}
        />
      ) : (
        /* List */
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div>
          ) : attorneys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              No attorneys {tab !== 'all' ? `with status "${tab}"` : ''}.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e0db', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', fontSize: 10, letterSpacing: 0.5 }}>NAME</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', fontSize: 10 }}>EMAIL</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', fontSize: 10 }}>BAR #</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', fontSize: 10 }}>SPECIALTIES</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', fontSize: 10 }}>STATUS</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#6b7280', fontSize: 10 }}>SUBMITTED</th>
                </tr>
              </thead>
              <tbody>
                {attorneys.map(a => (
                  <tr key={a.id}
                    onClick={() => setSelected(a)}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0a0a0f' }}>
                      {a.title ? `${a.title} ` : ''}{a.first_name || ''} {a.last_name || a.full_name || ''}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{a.email}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#374151' }}>{a.bar_number || '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{(a.specialties || []).join(', ') || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusBadge status={a.application_status || a.status} />
                    </td>
                    <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11 }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div onClick={() => setRejectModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, padding: '28px 32px',
            maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#b91c1c', marginBottom: 16 }}>Reject application</div>
            <textarea
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={4}
              style={{ width: '100%', padding: 12, border: '1px solid #e2e0db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 12 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={shareReason} onChange={e => setShareReason(e.target.checked)} />
              Share reason with attorney in rejection email
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)} style={{ padding: '8px 18px', background: '#f4f4f1', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} style={{ padding: '8px 18px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: rejectReason.trim() ? 1 : 0.5 }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function AttorneyDetail({ attorney: a, onApprove, onReject, onBack }) {
  const photoUrl = a.photo_url ? `${API.replace('/api', '')}${a.photo_url}` : null;
  const isPending = a.application_status === 'pending';

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1a56db', fontWeight: 600, marginBottom: 16 }}>
        &larr; Back to list
      </button>

      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', border: '0.5px solid #e2e0db' }}>
        {/* Identity header */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e0db' }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#0a0a0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>
              {(a.first_name || a.full_name || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f' }}>
              {a.title ? `${a.title} ` : ''}{a.first_name || ''} {a.last_name || a.full_name || ''}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{a.email}</div>
            {a.phone && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{a.phone}</div>}
          </div>
        </div>

        {/* Sections */}
        <Section title="BAR CREDENTIALS">
          <Field label="Bar number" value={a.bar_number} />
          <Field label="Jurisdiction" value={a.bar_jurisdiction || a.jurisdiction} />
          {a.bar_card_url && (
            <div style={{ marginTop: 8 }}>
              <a href={a.bar_card_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#1a56db', fontWeight: 600 }}>
                View bar card PDF &rarr;
              </a>
              {a.bar_card_filename && <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 8 }}>{a.bar_card_filename}</span>}
            </div>
          )}
          {!a.bar_card_url && <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>No bar card uploaded</div>}
        </Section>

        <Section title="SPECIALTIES">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(a.specialties || []).map(s => (
              <span key={s} style={{ padding: '4px 10px', background: '#eff6ff', color: '#1a56db', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{s}</span>
            ))}
            {(!a.specialties || a.specialties.length === 0) && <span style={{ color: '#9ca3af', fontSize: 11 }}>None specified</span>}
          </div>
        </Section>

        <Section title="LANGUAGES">
          <div style={{ fontSize: 12, color: '#374151' }}>
            {(a.languages_spoken || []).join(' \u00b7 ') || 'Not specified'}
          </div>
        </Section>

        <Section title="BIO">
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
            {a.bio_short || a.bio_long || a.bio || 'No bio provided'}
          </div>
        </Section>

        <Section title="STRIPE CONNECT">
          {a.stripe_onboarding_completed ? (
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              {'\u2713'} Completed {a.stripe_iban_last4 ? `(IBAN \u2026${a.stripe_iban_last4})` : ''}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#b91c1c' }}>{'\u2717'} Not completed</div>
          )}
        </Section>

        <Section title="CALENDLY">
          {a.calendly_url ? (
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              {'\u2713'} {a.calendly_url}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{'\u2717'} Not connected</div>
          )}
        </Section>

        <Section title="SUBMITTED">
          <div style={{ fontSize: 12, color: '#374151' }}>
            {a.created_at ? new Date(a.created_at).toLocaleString() : 'Unknown'}
          </div>
        </Section>

        {/* Action buttons */}
        {isPending && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
            <button onClick={onReject} style={{ padding: '10px 24px', background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Reject
            </button>
            <button onClick={onApprove} style={{ padding: '10px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 1.2, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: '#6b7280', minWidth: 120 }}>{label}:</span>
      <span style={{ color: '#0a0a0f', fontWeight: 500 }}>{value || '-'}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending: { bg: '#fef3c7', color: '#b45309' },
    approved: { bg: '#dcfce7', color: '#16a34a' },
    active: { bg: '#dcfce7', color: '#16a34a' },
    rejected: { bg: '#fee2e2', color: '#b91c1c' },
    suspended: { bg: '#fee2e2', color: '#b91c1c' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: c.bg, color: c.color }}>
      {(status || 'unknown').toUpperCase()}
    </span>
  );
}
