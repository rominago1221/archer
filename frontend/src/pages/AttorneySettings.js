import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Save, Clock, Bell, DollarSign, UserCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const AttorneySettings = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('availability');
  const tabs = [
    { id: 'availability', label: 'Availability', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'account', label: 'Account', icon: UserCircle },
  ];

  useEffect(() => {
    axios.get(`${API}/attorney/me`, { withCredentials: true }).then(r => setProfile(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/attorney/profile`, {
        available_from: profile.available_from, available_until: profile.available_until,
        available_days: profile.available_days, buffer_minutes: profile.buffer_minutes,
        timezone: profile.timezone, session_price: profile.session_price,
      }, { withCredentials: true });
      setProfile(res.data);
    } catch (e) { /* ok */ }
    setSaving(false);
  };

  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }));
  const toggleDay = d => setProfile(p => ({
    ...p, available_days: p.available_days?.includes(d) ? p.available_days.filter(x => x !== d) : [...(p.available_days || []), d]
  }));

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>;
  if (!profile) return null;

  const payout = Math.round(profile.session_price * 0.80);

  return (
    <div data-testid="attorney-settings-page">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-lg font-semibold text-[#111827]">Settings</h1></div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[10px] font-medium bg-[#1a56db] text-white hover:bg-[#1546b3] disabled:opacity-60" data-testid="save-settings">
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-colors ${tab === t.id ? 'bg-[#eff6ff] text-[#1a56db]' : 'text-[#6b7280] hover:bg-[#f5f5f5]'}`}
            data-testid={`tab-${t.id}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
        {tab === 'availability' && (
          <div className="space-y-4" data-testid="tab-content-availability">
            <div>
              <label className="text-[11px] font-medium text-[#333] block mb-2">Available days</label>
              <div className="flex gap-2">
                {DAYS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    className={`w-12 h-9 rounded-lg text-[10px] font-medium transition-colors ${profile.available_days?.includes(d) ? 'bg-[#1a56db] text-white' : 'bg-[#f5f5f5] text-[#555]'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-[#999] block mb-1">From</label>
                <input type="time" value={profile.available_from || '09:00'} onChange={e => set('available_from', e.target.value)} className="form-input text-xs py-2" />
              </div>
              <div>
                <label className="text-[10px] text-[#999] block mb-1">Until</label>
                <input type="time" value={profile.available_until || '17:00'} onChange={e => set('available_until', e.target.value)} className="form-input text-xs py-2" />
              </div>
              <div>
                <label className="text-[10px] text-[#999] block mb-1">Buffer between calls</label>
                <select value={profile.buffer_minutes || 15} onChange={e => set('buffer_minutes', parseInt(e.target.value))} className="form-input text-xs py-2">
                  <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[#999] block mb-1">Timezone</label>
              <input className="form-input text-xs py-2" value={profile.timezone || 'America/New_York'} onChange={e => set('timezone', e.target.value)} />
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-3" data-testid="tab-content-notifications">
            {[
              { label: 'New booking received', desc: 'Email + push notification' },
              { label: 'Call reminder (30 min before)', desc: 'Email notification' },
              { label: 'New case shared', desc: 'Email + push notification' },
              { label: 'Payment received', desc: 'Email notification' },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-[11px] font-medium text-[#333]">{n.label}</div>
                  <div className="text-[9px] text-[#9ca3af]">{n.desc}</div>
                </div>
                <div className="w-8 h-4 rounded-full bg-[#1a56db] relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pricing' && (
          <div data-testid="tab-content-pricing">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-[#111827]">${profile.session_price}</div>
              <div className="text-[10px] text-[#6b7280]">per 30-minute session</div>
            </div>
            <input type="range" min={149} max={500} value={profile.session_price} onChange={e => set('session_price', parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#e5e5e5] rounded-full appearance-none cursor-pointer accent-[#1a56db]" />
            <div className="flex justify-between text-[9px] text-[#9ca3af] mt-1"><span>$149</span><span>$500</span></div>
            <div className="mt-4 p-3 bg-[#f0fdf4] border border-[#86efac] rounded-lg flex items-center gap-2">
              <DollarSign size={14} className="text-[#16a34a]" />
              <div>
                <div className="text-[11px] font-semibold text-[#16a34a]">You receive: ${payout}/session</div>
                <div className="text-[9px] text-[#6b7280]">Pricing applies to all new bookings</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'account' && (
          <div className="space-y-3" data-testid="tab-content-account">
            <div className="flex items-center justify-between py-2 border-b border-[#f0f0f0]">
              <div>
                <div className="text-[11px] font-medium text-[#333]">{profile.full_name}</div>
                <div className="text-[9px] text-[#9ca3af]">{profile.email}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-medium ${profile.application_status === 'approved' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                {profile.application_status}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#f0f0f0]">
              <div className="text-[11px] text-[#555]">Bar number</div>
              <div className="text-[11px] font-medium text-[#333]">{profile.bar_number} <span className="text-[#16a34a]">✓ Verified</span></div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#f0f0f0]">
              <div className="text-[11px] text-[#555]">Licensed states</div>
              <div className="text-[11px] text-[#333]">{profile.states_licensed?.join(', ')}</div>
            </div>
            <button className="text-[10px] text-[#dc2626] hover:underline mt-2">Deactivate my profile</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttorneySettings;
