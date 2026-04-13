import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Save, Eye, DollarSign } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const SPECIALTIES = ['Employment law','Tenant rights','Contract law','Debt collection','Consumer protection','Family law','Immigration','Business law','Real estate','Insurance disputes','Criminal defense','IP law'];
const LANGUAGES = [{ id: 'en', label: 'English' },{ id: 'fr', label: 'French' },{ id: 'nl', label: 'Dutch' },{ id: 'de', label: 'German' },{ id: 'es', label: 'Spanish' }];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const AttorneyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/attorney/me`, { withCredentials: true }).then(r => setProfile(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/attorney/profile`, {
        bio: profile.bio, specialties: profile.specialties, languages: profile.languages,
        session_price: profile.session_price, is_available: profile.is_available,
        available_from: profile.available_from, available_until: profile.available_until,
        available_days: profile.available_days, buffer_minutes: profile.buffer_minutes,
        timezone: profile.timezone, phone: profile.phone,
      }, { withCredentials: true });
      setProfile(res.data);
    } catch (e) { /* ok */ }
    setSaving(false);
  };

  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }));
  const toggleArr = (key, val) => setProfile(p => ({
    ...p, [key]: p[key]?.includes(val) ? p[key].filter(v => v !== val) : [...(p[key] || []), val]
  }));

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>;
  if (!profile) return null;

  const payout = Math.round(profile.session_price * 0.80);

  return (
    <div data-testid="attorney-profile-page">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">My profile</h1>
          <p className="text-[11px] text-[#6b7280]">Edit how clients see you on the Archer directory</p>
        </div>
        <div className="flex gap-2">
          <a href={`/attorneys/${profile.slug}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium border border-[#e5e5e5] text-[#555] hover:bg-[#f5f5f5]">
            <Eye size={10} /> Preview public profile
          </a>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[10px] font-medium bg-[#1a56db] text-white hover:bg-[#1546b3] disabled:opacity-60" data-testid="save-profile">
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left col */}
        <div className="space-y-4">
          <Section title="Bio">
            <textarea className="form-input text-xs py-2" rows={4} maxLength={300} value={profile.bio || ''} onChange={e => set('bio', e.target.value)} data-testid="edit-bio" />
            <div className="text-[9px] text-[#9ca3af] text-right">{(profile.bio || '').length}/300</div>
          </Section>

          <Section title="Specialties (max 5)">
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTIES.map(s => (
                <button key={s} onClick={() => { if (profile.specialties?.includes(s) || (profile.specialties?.length || 0) < 5) toggleArr('specialties', s); }}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-medium transition-colors ${profile.specialties?.includes(s) ? 'bg-[#1a56db] text-white' : 'bg-[#f5f5f5] text-[#555]'}`}>{s}</button>
              ))}
            </div>
          </Section>

          <Section title="Languages">
            <div className="flex gap-2">
              {LANGUAGES.map(l => (
                <button key={l.id} onClick={() => toggleArr('languages', l.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-medium ${profile.languages?.includes(l.id) ? 'bg-[#1a56db] text-white' : 'bg-[#f5f5f5] text-[#555]'}`}>{l.label}</button>
              ))}
            </div>
          </Section>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          <Section title="Session pricing">
            <div className="text-center mb-3">
              <div className="text-2xl font-bold text-[#111827]">${profile.session_price}</div>
              <div className="text-[10px] text-[#6b7280]">per 30-minute session</div>
            </div>
            <input type="range" min={149} max={500} value={profile.session_price} onChange={e => set('session_price', parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#e5e5e5] rounded-full appearance-none cursor-pointer accent-[#1a56db]" data-testid="edit-price" />
            <div className="flex justify-between text-[9px] text-[#9ca3af] mt-1"><span>$149</span><span>$500</span></div>
            <div className="mt-3 p-2.5 bg-[#f0fdf4] border border-[#86efac] rounded-lg flex items-center gap-2">
              <DollarSign size={12} className="text-[#16a34a]" />
              <span className="text-[11px] font-medium text-[#16a34a]">You receive: ${payout}/session</span>
            </div>
          </Section>

          <Section title="Availability">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DAYS.map(d => (
                <button key={d} onClick={() => toggleArr('available_days', d)}
                  className={`w-10 h-8 rounded-lg text-[9px] font-medium transition-colors ${profile.available_days?.includes(d) ? 'bg-[#1a56db] text-white' : 'bg-[#f5f5f5] text-[#555]'}`}>{d}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-[#999] block mb-0.5">From</label>
                <input type="time" value={profile.available_from || '09:00'} onChange={e => set('available_from', e.target.value)}
                  className="form-input text-xs py-1.5" data-testid="edit-from" />
              </div>
              <div>
                <label className="text-[9px] text-[#999] block mb-0.5">Until</label>
                <input type="time" value={profile.available_until || '17:00'} onChange={e => set('available_until', e.target.value)}
                  className="form-input text-xs py-1.5" data-testid="edit-until" />
              </div>
            </div>
          </Section>

          <Section title="Contact">
            <input className="form-input text-xs py-2" value={profile.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="Phone number" />
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="bg-white border border-[#ebebeb] rounded-xl p-4">
    <div className="text-[11px] font-semibold text-[#111827] mb-2.5">{title}</div>
    {children}
  </div>
);

export default AttorneyProfile;
