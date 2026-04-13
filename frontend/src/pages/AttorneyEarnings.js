import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Loader2, TrendingUp, CreditCard } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AttorneyEarnings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/attorney/earnings`, { withCredentials: true }).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>;
  if (!data) return null;

  return (
    <div data-testid="attorney-earnings-page">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-[#111827]">Earnings</h1>
        <p className="text-[11px] text-[#6b7280]">Track your revenue and payouts</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total earned', val: `$${data.total_earned.toLocaleString()}`, icon: DollarSign, color: '#16a34a' },
          { label: 'This month', val: `$${data.this_month.toLocaleString()}`, icon: TrendingUp, color: '#1a56db' },
          { label: 'Last month', val: `$${data.last_month.toLocaleString()}`, icon: TrendingUp, color: '#6b7280' },
          { label: 'Pending payout', val: `$${data.pending_payout.toLocaleString()}`, icon: CreditCard, color: '#f59e0b' },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-[#ebebeb] rounded-xl p-4" data-testid={`earning-metric-${i}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#9ca3af] font-medium">{m.label}</span>
              <m.icon size={14} style={{ color: m.color }} />
            </div>
            <div className="text-lg font-bold text-[#111827]">{m.val}</div>
          </div>
        ))}
      </div>

      {/* Payout info */}
      <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe]">
        <CreditCard size={14} className="text-[#1a56db]" />
        <span className="text-[11px] text-[#1a56db]">Payouts processed every Monday via Stripe Connect · Minimum payout: $50</span>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-medium ${data.stripe_connect_status === 'active' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
          Stripe: {data.stripe_connect_status}
        </span>
      </div>

      {/* Earnings table */}
      <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden" data-testid="earnings-table">
        <table className="w-full">
          <thead className="bg-[#fafafa] border-b border-[#ebebeb]">
            <tr>
              {['Date', 'Client', 'Gross', 'Archer fee', 'Your payout', 'Rating', 'Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[9px] font-medium text-[#9ca3af] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f5f5]">
            {data.sessions.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-[11px] text-[#999]">No sessions yet</td></tr>
            ) : data.sessions.map(s => (
              <tr key={s.call_id} className="hover:bg-[#fafafa]">
                <td className="px-4 py-2.5 text-[10px] text-[#555]">{s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2.5 text-[10px] font-medium text-[#333]">{s.client_name}</td>
                <td className="px-4 py-2.5 text-[10px] text-[#333]">${s.price}</td>
                <td className="px-4 py-2.5 text-[10px] text-[#dc2626]">-${s.archer_fee}</td>
                <td className="px-4 py-2.5 text-[10px] font-semibold text-[#16a34a]">${s.attorney_payout}</td>
                <td className="px-4 py-2.5 text-[10px] text-[#f59e0b]">{s.client_rating ? '★'.repeat(s.client_rating) : '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-medium ${s.status === 'Paid' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#fef3c7] text-[#92400e]'}`}>{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttorneyEarnings;
