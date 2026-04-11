import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle, Eye, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusStyle = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  approved: { bg: '#f0fdf4', color: '#16a34a', label: 'Approved' },
  rejected: { bg: '#fef2f2', color: '#991b1b', label: 'Rejected' },
};

const AdminAttorneys = () => {
  const [attorneys, setAttorneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAttorneys = async (f) => {
    try {
      const res = await axios.get(`${API}/admin/attorneys?status=${f || filter}`, { withCredentials: true });
      setAttorneys(res.data);
    } catch (e) { /* ok */ }
    setLoading(false);
  };

  useEffect(() => { fetchAttorneys(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await axios.post(`${API}/admin/attorneys/${id}/approve`, {}, { withCredentials: true });
      await fetchAttorneys();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to approve'); }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(rejectModal);
    try {
      await axios.post(`${API}/admin/attorneys/${rejectModal}/reject`, { reason: rejectReason.trim() }, { withCredentials: true });
      setRejectModal(null);
      setRejectReason('');
      await fetchAttorneys();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to reject'); }
    setActionLoading(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }} data-testid="admin-attorneys-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>Attorney Applications</h1>
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{attorneys.length} total applications</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} data-testid={`filter-${f}`}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
                border: 'none', background: filter === f ? '#0a0a0f' : '#f3f4f6', color: filter === f ? '#fff' : '#6b7280',
              }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e0db', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f8f7f4', borderBottom: '0.5px solid #e2e0db' }}>
              {['Name', 'Email', 'Bar #', 'Country', 'Specialties', 'Price', 'Date', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attorneys.map(a => {
              const st = statusStyle[a.application_status] || statusStyle.pending;
              return (
                <tr key={a.attorney_id} data-testid={`attorney-row-${a.attorney_id}`} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1a1a2e' }}>{a.full_name}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{a.email}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{a.bar_number}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{a.country}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(a.specialties || []).join(', ')}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#16a34a' }}>${a.session_price}</td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 9, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {a.application_status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(a.attorney_id)} disabled={actionLoading === a.attorney_id} data-testid={`approve-${a.attorney_id}`}
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 600, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {actionLoading === a.attorney_id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />} Approve
                          </button>
                          <button onClick={() => setRejectModal(a.attorney_id)} data-testid={`reject-${a.attorney_id}`}
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 600, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <XCircle size={10} /> Reject
                          </button>
                        </>
                      )}
                      <a href={`/attorneys/${a.slug}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 500, background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                        <Eye size={10} /> View
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {attorneys.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 12 }}>No applications found</div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div data-testid="reject-modal" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b' }}>Reject Application</div>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>Please provide a reason for the rejection. This will be sent to the attorney.</div>
            <textarea data-testid="reject-reason-input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason (required)..."
              style={{ width: '100%', minHeight: 80, padding: '8px 10px', fontSize: 11, border: '0.5px solid #e2e0db', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12, lineHeight: 1.5 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading} data-testid="confirm-reject-btn"
                style={{ flex: 1, padding: '10px 0', background: !rejectReason.trim() ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: !rejectReason.trim() ? 'default' : 'pointer' }}>
                {actionLoading ? 'Rejecting...' : 'Reject Application'}
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                style={{ padding: '10px 20px', background: '#fff', color: '#6b7280', border: '0.5px solid #e2e0db', borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttorneys;
