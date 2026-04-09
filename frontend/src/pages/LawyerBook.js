import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Star, User, CheckCircle, FileText, Clock, AlertCircle, Calendar } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LawyerBook = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lawyerId = searchParams.get('lawyer');
  const caseId = searchParams.get('case');

  const [lawyer, setLawyer] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM');
  const [error, setError] = useState(null);

  const timeSlots = [
    { time: '10:00 AM', taken: true },
    { time: '10:30 AM', taken: true },
    { time: '11:00 AM', taken: false },
    { time: '11:30 AM', taken: false },
    { time: '2:00 PM', taken: false },
    { time: '2:30 PM', taken: false },
    { time: '3:00 PM', taken: false },
    { time: '4:00 PM', taken: false }
  ];

  const fetchData = useCallback(async () => {
    try {
      const [lawyerRes] = await Promise.all([
        axios.get(`${API}/lawyers/${lawyerId}`)
      ]);
      setLawyer(lawyerRes.data);

      if (caseId) {
        const caseRes = await axios.get(`${API}/cases/${caseId}`, { withCredentials: true });
        setCaseData(caseRes.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      navigate('/lawyers');
    } finally {
      setLoading(false);
    }
  }, [lawyerId, caseId, navigate]);

  useEffect(() => {
    if (lawyerId) {
      fetchData();
    } else {
      navigate('/lawyers');
    }
  }, [lawyerId, fetchData, navigate]);

  const handleBook = async () => {
    setBooking(true);
    setError(null);

    try {
      // Create scheduled time
      const today = new Date();
      const [time, period] = selectedSlot.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      today.setHours(hours, minutes, 0, 0);

      await axios.post(`${API}/lawyer-calls`, {
        lawyer_id: lawyerId,
        case_id: caseId || null,
        scheduled_at: today.toISOString(),
        time_slot: selectedSlot
      }, { withCredentials: true });

      // Redirect to success or dashboard
      navigate('/dashboard', { 
        state: { message: `Call booked with ${lawyer.name} for ${selectedSlot} today` }
      });
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const getAvailabilityDisplay = (status, minutes) => {
    if (status === 'now') return 'Available now';
    if (status === 'soon') return `${minutes} min wait`;
    return 'Tomorrow';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-32"></div>
        <div className="skeleton h-8 w-48"></div>
        <div className="max-w-xl mx-auto mt-6">
          <div className="skeleton h-24 rounded-[14px] mb-4"></div>
          <div className="skeleton h-32 rounded-[14px] mb-4"></div>
          <div className="skeleton h-48 rounded-[14px]"></div>
        </div>
      </div>
    );
  }

  if (!lawyer) return null;

  return (
    <div data-testid="lawyer-book-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/lawyers" className="bc-link">Lawyer calls</Link>
        <span>/</span>
        <span>Book a call</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Book a video call</h1>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Lawyer card */}
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#eff6ff] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {lawyer.photo_url ? (
                <img src={lawyer.photo_url} alt={lawyer.name} className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-[#1a56db]" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#111827]">{lawyer.name}</div>
              <div className="text-xs text-[#6b7280]">
                {lawyer.specialty} · {lawyer.bar_state} Bar · {lawyer.rating} <Star size={10} className="inline text-[#f59e0b]" /> · {getAvailabilityDisplay(lawyer.availability_status, lawyer.availability_minutes)}
              </div>
            </div>
            <span className="badge badge-green text-[10px]">
              {lawyer.availability_status === 'now' ? 'Available now' : 'Available soon'}
            </span>
          </div>
        </div>

        {/* Time slots */}
        <div className="card p-4 mb-4">
          <div className="text-sm font-medium text-[#111827] mb-3">Select a time — today</div>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((slot) => (
              <div
                key={slot.time}
                className={`time-slot ${slot.taken ? 'taken' : ''} ${selectedSlot === slot.time && !slot.taken ? 'selected' : ''}`}
                onClick={() => !slot.taken && setSelectedSlot(slot.time)}
                data-testid={`time-slot-${slot.time.replace(/\s/g, '-')}`}
              >
                {slot.time}
              </div>
            ))}
          </div>
        </div>

        {/* AI Brief Preview */}
        <div className="card p-4 mb-4">
          <div className="text-sm font-medium text-[#111827] mb-2">AI brief sent to attorney before call</div>
          <div className="bg-[#f8f8f8] rounded-lg p-4">
            <div className="text-xs text-[#6b7280] mb-2">What {lawyer.name.split(',')[0]} will know before your call</div>
            <div className="space-y-1.5">
              {caseData ? (
                <>
                  <div className="flex items-start gap-2 text-xs text-[#444]">
                    <span className="w-1 h-1 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></span>
                    <span>Case type: {caseData.type} · Risk Score: {caseData.risk_score}/100</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#444]">
                    <span className="w-1 h-1 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></span>
                    <span>{caseData.document_count} documents analyzed</span>
                  </div>
                  {caseData.financial_exposure && (
                    <div className="flex items-start gap-2 text-xs text-[#444]">
                      <span className="w-1 h-1 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></span>
                      <span>Financial exposure: {caseData.financial_exposure}</span>
                    </div>
                  )}
                  {caseData.deadline && (
                    <div className="flex items-start gap-2 text-xs text-[#444]">
                      <span className="w-1 h-1 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></span>
                      <span>Deadline: {caseData.deadline}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-xs text-[#444]">
                    <span className="w-1 h-1 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></span>
                    <span>Your profile and state of residence</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#444]">
                    <span className="w-1 h-1 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></span>
                    <span>Any questions you submit before the call</span>
                  </div>
                </>
              )}
              <div className="flex items-start gap-2 text-xs text-[#444]">
                <span className="w-1 h-1 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></span>
                <span>AI recommendation: Consultation strategy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price row */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#111827]">30-minute video call</div>
              <div className="text-xs text-[#6b7280]">Includes written follow-up summary · Today {selectedSlot}</div>
            </div>
            <div className="text-xl font-semibold text-[#111827]">$149</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 flex gap-3 mb-4">
            <AlertCircle size={20} className="text-[#dc2626] flex-shrink-0" />
            <div className="text-sm text-[#dc2626]">{error}</div>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleBook}
          disabled={booking}
          className="w-full btn-pill btn-blue py-3.5 text-base font-medium disabled:opacity-60"
          data-testid="confirm-book-btn"
        >
          {booking ? 'Processing...' : 'Confirm & pay $149'}
        </button>

        <div className="text-xs text-[#9ca3af] text-center mt-3">
          Secure payment · Cancel up to 2h before · Refund if attorney cancels
        </div>
      </div>
    </div>
  );
};

export default LawyerBook;
