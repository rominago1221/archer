import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Phone, Video, Mic, MicOff, VideoOff, MessageSquare, Clock, FileText, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VideoCall = () => {
  const { callId } = useParams();
  const navigate = useNavigate();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [roomUrl, setRoomUrl] = useState(null);
  const [brief, setBrief] = useState('');
  const [showBrief, setShowBrief] = useState(false);
  const [notes, setNotes] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/attorney/calls/${callId}`, { withCredentials: true });
        setCall(res.data);
        if (res.data.brief) setBrief(res.data.brief);
        if (res.data.attorney_notes) setNotes(res.data.attorney_notes);
      } catch (e) { console.error('Failed to load call data:', e); }
      setLoading(false);
    };
    fetch();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callId]);

  const joinCall = async () => {
    setJoining(true);
    try {
      // Create room if needed
      const roomRes = await axios.post(`${API}/attorney/calls/${callId}/create-room`, {}, { withCredentials: true });
      // Get token
      const tokenRes = await axios.post(`${API}/attorney/calls/${callId}/join-token`, {}, { withCredentials: true });
      const url = `${tokenRes.data.room_url}?t=${tokenRes.data.token}`;
      setRoomUrl(url);
      setInCall(true);
      // Start timer
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to join call');
    }
    setJoining(false);
  };

  const endCall = async () => {
    setInCall(false);
    setRoomUrl(null);
    if (timerRef.current) clearInterval(timerRef.current);
    // Save notes
    if (notes) {
      await axios.post(`${API}/attorney/calls/${callId}/notes`, { notes }, { withCredentials: true }).catch(() => {});
    }
    // Mark completed
    await axios.post(`${API}/attorney/calls/${callId}/complete`, {}, { withCredentials: true }).catch(() => {});
    navigate('/attorney/calls');
  };

  const generateBrief = async () => {
    setGeneratingBrief(true);
    try {
      const res = await axios.post(`${API}/attorney/calls/${callId}/generate-brief`, {}, { withCredentials: true });
      setBrief(res.data.brief);
      setShowBrief(true);
    } catch (e) { console.error('Failed to generate brief:', e); }
    setGeneratingBrief(false);
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#111]"><Loader2 size={24} className="animate-spin text-white" /></div>;
  if (!call) return <div className="min-h-screen flex items-center justify-center bg-[#111] text-white text-sm">Call not found</div>;

  if (!inCall) {
    // Pre-call screen
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4" data-testid="pre-call-screen">
        <div className="max-w-lg w-full">
          <div className="bg-white border border-[#ebebeb] rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#eff6ff] flex items-center justify-center mx-auto mb-4">
              <Video size={24} className="text-[#1a56db]" />
            </div>
            <h2 className="text-lg font-semibold text-[#111827] mb-1">Video call</h2>
            <p className="text-xs text-[#6b7280] mb-1">With: {call.client_name || 'Client'}</p>
            <p className="text-xs text-[#6b7280] mb-4">Scheduled: {call.scheduled_at ? new Date(call.scheduled_at).toLocaleString() : 'TBD'}</p>

            <div className="flex gap-2 justify-center mb-4">
              <button onClick={joinCall} disabled={joining}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1a56db] text-white text-sm font-medium hover:bg-[#1546b3] disabled:opacity-60 transition-colors"
                data-testid="join-call-btn">
                {joining ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                Join call
              </button>
              <button onClick={generateBrief} disabled={generatingBrief}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#e5e5e5] text-[#555] text-sm font-medium hover:bg-[#f5f5f5] disabled:opacity-60"
                data-testid="generate-brief-btn">
                {generatingBrief ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {brief ? 'View brief' : 'Generate AI brief'}
              </button>
            </div>

            {(showBrief || brief) && (
              <div className="mt-4 p-4 bg-[#fafafa] rounded-xl border border-[#ebebeb] text-left" data-testid="brief-content">
                <div className="text-[11px] font-semibold text-[#1a56db] mb-2">AI Case Brief — Confidential</div>
                <div className="text-[11px] text-[#333] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">{brief}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // In-call screen
  return (
    <div className="h-screen bg-[#111] flex" data-testid="in-call-screen">
      {/* Video area */}
      <div className="flex-1 relative">
        <iframe ref={iframeRef} src={roomUrl} allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full border-0" title="Video call" data-testid="daily-iframe" />

        {/* Timer overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm flex items-center gap-2">
          <Clock size={12} className="text-white" />
          <span className="text-white text-xs font-mono">{formatTime(elapsed)}</span>
        </div>

        {/* End call button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <button onClick={endCall}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#dc2626] text-white text-sm font-medium hover:bg-[#b91c1c] transition-colors"
            data-testid="end-call-btn">
            <Phone size={16} /> End call
          </button>
        </div>
      </div>

      {/* Side panel */}
      {showBrief && (
        <div className="w-[320px] bg-[#1a1a1a] border-l border-[#333] flex flex-col" data-testid="call-side-panel">
          <div className="p-3 border-b border-[#333] flex items-center justify-between">
            <span className="text-white text-xs font-medium">Case Brief</span>
            <button onClick={() => setShowBrief(false)}><X size={14} className="text-[#666]" /></button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto text-[10px] text-[#ccc] leading-relaxed whitespace-pre-wrap">{brief}</div>
          <div className="p-3 border-t border-[#333]">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Private notes..."
              className="w-full bg-[#222] border border-[#444] rounded-lg p-2 text-[10px] text-[#ccc] resize-none focus:outline-none" rows={3} data-testid="call-notes" />
          </div>
        </div>
      )}

      {/* Toggle brief */}
      {!showBrief && brief && (
        <button onClick={() => setShowBrief(true)} className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs" data-testid="show-brief-btn">
          <FileText size={12} className="inline mr-1" /> Brief
        </button>
      )}
    </div>
  );
};

export default VideoCall;
