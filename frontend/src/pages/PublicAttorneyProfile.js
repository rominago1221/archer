import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Star, MapPin, Clock, Globe, Shield, Calendar, Video } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PublicAttorneyProfile = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [attorney, setAttorney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/attorneys/${slug}`);
        setAttorney(res.data);
      } catch (e) { console.error('Failed to load attorney profile:', e); }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const handleBook = async () => {
    if (!bookDate || !bookTime) return;
    setBooking(true);
    try {
      const res = await axios.post(`${API}/attorney/book-call`, {
        attorney_id: attorney.attorney_id, date: bookDate, time: bookTime,
        origin_url: window.location.origin
      }, { withCredentials: true });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        alert('Booking confirmed!');
      }
    } catch (e) {
      alert(e.response?.data?.detail || 'Login required to book a call');
    }
    setBooking(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>;
  if (!attorney) return <div className="min-h-screen flex items-center justify-center text-sm text-[#999]">Attorney not found</div>;

  return (
    <div className="min-h-screen bg-[#fafafa]" data-testid="public-attorney-profile">
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Header card */}
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-5">
            <div className="w-[100px] h-[100px] rounded-full bg-[#1a56db] flex items-center justify-center text-white text-3xl font-semibold flex-shrink-0">
              {attorney.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold text-[#111827]">{attorney.full_name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#eff6ff] text-[#1a56db] border border-[#bfdbfe]">Licensed Attorney</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#6b7280] mb-2">
                <span className="flex items-center gap-1"><MapPin size={10} />{attorney.states_licensed?.join(', ')}</span>
                <span className="flex items-center gap-1"><Shield size={10} />Bar #{attorney.bar_number} <span className="text-[#16a34a]">✓</span></span>
                <span className="flex items-center gap-1"><Clock size={10} />{attorney.years_experience} years</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {attorney.specialties?.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#f5f5f5] text-[#555]">{s}</span>
                ))}
              </div>
              <p className="text-[12px] text-[#555] leading-relaxed">{attorney.bio}</p>

              <div className="flex items-center gap-4 mt-3">
                {attorney.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-[#f59e0b] fill-[#f59e0b]" />
                    <span className="text-[12px] font-semibold text-[#111]">{attorney.rating}</span>
                    <span className="text-[10px] text-[#6b7280]">({attorney.review_count} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Globe size={10} className="text-[#6b7280]" />
                  <span className="text-[10px] text-[#6b7280]">{attorney.languages?.map(l => l.toUpperCase()).join(' · ')}</span>
                </div>
                <div className={`flex items-center gap-1 ${attorney.is_available ? 'text-[#16a34a]' : 'text-[#9ca3af]'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${attorney.is_available ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`} />
                  <span className="text-[10px]">{attorney.is_available ? 'Available now' : 'Currently offline'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Booking card */}
          <div className="col-span-1 bg-white border border-[#ebebeb] rounded-2xl p-5" data-testid="booking-card">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-[#111827]">${attorney.session_price}</div>
              <div className="text-[10px] text-[#6b7280]">per 30-minute session</div>
            </div>
            <div className="space-y-2 mb-4">
              <input type="date" value={bookDate} onChange={e => setBookDate(e.target.value)}
                className="form-input text-xs py-2 w-full" data-testid="book-date" />
              <input type="time" value={bookTime} onChange={e => setBookTime(e.target.value)}
                className="form-input text-xs py-2 w-full" data-testid="book-time" />
            </div>
            <button onClick={handleBook} disabled={booking || !bookDate || !bookTime}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1a56db] text-white text-xs font-medium hover:bg-[#1546b3] disabled:opacity-60 transition-colors"
              data-testid="book-call-btn">
              {booking ? <Loader2 size={12} className="animate-spin" /> : <Video size={12} />}
              Book a call — ${attorney.session_price}
            </button>
            <p className="text-[9px] text-[#9ca3af] text-center mt-2">Secure payment via Stripe</p>
          </div>

          {/* Reviews */}
          <div className="col-span-2 bg-white border border-[#ebebeb] rounded-2xl p-5" data-testid="reviews-section">
            <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Client reviews</h3>
            {(!attorney.reviews || attorney.reviews.length === 0) ? (
              <p className="text-[11px] text-[#999]">No reviews yet</p>
            ) : (
              <div className="space-y-3">
                {attorney.reviews.map((r, i) => (
                  <div key={i} className="border-b border-[#f5f5f5] pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-[#f59e0b]">{'★'.repeat(r.rating)}</span>
                      <span className="text-[9px] text-[#9ca3af]">{r.date ? new Date(r.date).toLocaleDateString() : ''}</span>
                    </div>
                    {r.review && <p className="text-[11px] text-[#555]">{r.review}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAttorneyProfile;
