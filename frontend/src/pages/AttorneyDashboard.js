import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, DollarSign, Star, Users, Video, FileText, Clock, ChevronRight, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AttorneyDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/attorney/dashboard`, { withCredentials: true });
        setData(res.data);
      } catch (e) { /* ok */ }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>;
  if (!data) return <div className="text-center text-sm text-[#999] py-12">Unable to load dashboard</div>;

  const { metrics, profile, next_call, upcoming_calls, recent_activity } = data;
  const isAvailable = profile?.is_available;

  return (
    <div data-testid="attorney-dashboard-page">
      {/* Availability banner */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl mb-5 ${isAvailable ? 'bg-[#f0fdf4] border border-[#86efac]' : 'bg-[#f5f5f5] border border-[#e5e5e5]'}`} data-testid="availability-banner">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`} />
          <span className={`text-[12px] font-medium ${isAvailable ? 'text-[#16a34a]' : 'text-[#6b7280]'}`}>
            {isAvailable ? 'You are available — clients can book you' : 'You are offline — clients cannot book you'}
          </span>
        </div>
        <span className="text-[10px] text-[#6b7280]">
          {profile?.available_from} – {profile?.available_until} · {profile?.timezone}
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3 mb-5" data-testid="metric-cards">
        {[
          { label: "Today's calls", val: metrics.today_calls, icon: Calendar, color: '#1a56db' },
          { label: 'This month', val: `$${metrics.month_earnings.toLocaleString()}`, icon: DollarSign, color: '#16a34a' },
          { label: 'Rating', val: metrics.rating > 0 ? `${metrics.rating} ★` : 'No ratings', icon: Star, color: '#f59e0b' },
          { label: 'Total sessions', val: metrics.total_sessions, icon: Users, color: '#8b5cf6' },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-[#ebebeb] rounded-xl p-4" data-testid={`metric-${i}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#9ca3af] font-medium">{m.label}</span>
              <m.icon size={14} style={{ color: m.color }} />
            </div>
            <div className="text-lg font-bold text-[#111827]">{m.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left col: Next call + upcoming */}
        <div className="col-span-2 space-y-4">
          {/* Next call card */}
          {next_call && (
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4" data-testid="next-call-card">
              <div className="flex items-center gap-2 mb-2">
                <Video size={14} className="text-[#1a56db]" />
                <span className="text-[12px] font-semibold text-[#1a56db]">Next call</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-[#111827]">{next_call.client_name || 'Client'}</div>
                  <div className="text-[11px] text-[#6b7280]">{new Date(next_call.scheduled_at).toLocaleString()}</div>
                  {next_call.case_id && <div className="text-[10px] text-[#555] mt-0.5">Case attached</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/attorney/calls/${next_call.call_id}`)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium border border-[#1a56db] text-[#1a56db] hover:bg-white transition-colors" data-testid="view-brief-btn">
                    <FileText size={10} className="inline mr-1" /> View brief
                  </button>
                  <button onClick={() => navigate(`/video-call/${next_call.call_id}`)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#1a56db] text-white hover:bg-[#1546b3] transition-colors" data-testid="join-call-btn">
                    <Video size={10} className="inline mr-1" /> Join call
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming calls */}
          <div className="bg-white border border-[#ebebeb] rounded-xl" data-testid="upcoming-calls">
            <div className="px-4 py-3 border-b border-[#ebebeb] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#111827]">Upcoming calls</span>
              <button onClick={() => navigate('/attorney/calls')} className="text-[10px] text-[#1a56db] hover:underline">View all</button>
            </div>
            {(!upcoming_calls || upcoming_calls.length === 0) ? (
              <div className="text-center py-8 text-[11px] text-[#999]">No upcoming calls</div>
            ) : (
              <div className="divide-y divide-[#f5f5f5]">
                {upcoming_calls.slice(0, 5).map(call => (
                  <div key={call.call_id} className="px-4 py-2.5 flex items-center justify-between hover:bg-[#fafafa] cursor-pointer" onClick={() => navigate(`/attorney/calls/${call.call_id}`)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${call.status === 'completed' ? 'bg-[#16a34a]' : 'bg-[#1a56db]'}`} />
                      <div>
                        <div className="text-[11px] font-medium text-[#333]">{call.client_name || 'Client'}</div>
                        <div className="text-[9px] text-[#9ca3af]">{new Date(call.scheduled_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium text-[#16a34a]">${call.attorney_payout}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-medium ${call.status === 'completed' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#eff6ff] text-[#1a56db]'}`}>{call.status}</span>
                      <ChevronRight size={12} className="text-[#ccc]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col: Activity */}
        <div className="bg-white border border-[#ebebeb] rounded-xl" data-testid="recent-activity">
          <div className="px-4 py-3 border-b border-[#ebebeb]">
            <span className="text-[12px] font-semibold text-[#111827]">Recent activity</span>
          </div>
          {(!recent_activity || recent_activity.length === 0) ? (
            <div className="text-center py-8 text-[11px] text-[#999]">No recent activity</div>
          ) : (
            <div className="divide-y divide-[#f5f5f5]">
              {recent_activity.map((a, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="text-[11px] text-[#333]">{a.message}</div>
                  <div className="text-[9px] text-[#9ca3af] mt-0.5">{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttorneyDashboard;
