import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Video, FileText, Loader2, ChevronRight, Clock, Filter } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AttorneyCalls = () => {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const filters = ['all', 'scheduled', 'completed', 'cancelled'];

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/attorney/calls`, { params: { status: filter }, withCredentials: true });
        setCalls(res.data);
      } catch (e) { /* ok */ }
      setLoading(false);
    };
    fetch();
  }, [filter]);

  return (
    <div data-testid="attorney-calls-page">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Upcoming calls</h1>
          <p className="text-[11px] text-[#6b7280]">Manage your scheduled sessions</p>
        </div>
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium capitalize transition-colors ${filter === f ? 'bg-[#1a56db] text-white' : 'bg-[#f5f5f5] text-[#555] hover:bg-[#eee]'}`}
              data-testid={`filter-${f}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>
      ) : calls.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#ebebeb] rounded-xl">
          <Calendar size={24} className="mx-auto text-[#ccc] mb-2" />
          <p className="text-xs text-[#999]">No calls found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map(call => (
            <div key={call.call_id} className="bg-white border border-[#ebebeb] rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow" data-testid={`call-${call.call_id}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${call.status === 'completed' ? 'bg-[#f0fdf4]' : 'bg-[#eff6ff]'}`}>
                  {call.status === 'completed' ? <Clock size={16} className="text-[#16a34a]" /> : <Video size={16} className="text-[#1a56db]" />}
                </div>
                <div>
                  <div className="text-[12px] font-medium text-[#111827]">{call.client_name || 'Client'}</div>
                  <div className="text-[10px] text-[#6b7280]">
                    {new Date(call.scheduled_at).toLocaleDateString()} at {new Date(call.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-[#111827]">${call.price}</div>
                  <div className="text-[9px] text-[#16a34a]">You earn ${call.attorney_payout}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-medium ${call.status === 'completed' ? 'bg-[#f0fdf4] text-[#16a34a]' : call.status === 'cancelled' ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-[#eff6ff] text-[#1a56db]'}`}>{call.status}</span>
                <div className="flex gap-1.5">
                  {call.status === 'scheduled' && (
                    <button onClick={() => navigate(`/video-call/${call.call_id}`)}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-medium bg-[#1a56db] text-white hover:bg-[#1546b3]" data-testid={`join-${call.call_id}`}>
                      Join call
                    </button>
                  )}
                  {call.client_rating && <span className="text-[10px] text-[#f59e0b]">{'★'.repeat(call.client_rating)}</span>}
                </div>
                <ChevronRight size={12} className="text-[#ccc]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttorneyCalls;
