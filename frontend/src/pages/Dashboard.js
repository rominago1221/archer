import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Upload, Plus, Calendar, AlertCircle, FileText, ChevronRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [cases, setCases] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, casesRes, lawyersRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
        axios.get(`${API}/cases`, { withCredentials: true }),
        axios.get(`${API}/lawyers`)
      ]);
      setStats(statsRes.data);
      setCases(casesRes.data.slice(0, 3));
      setLawyers(lawyersRes.data.slice(0, 3));
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh lawyers every 60 seconds
    const interval = setInterval(() => {
      axios.get(`${API}/lawyers`).then(res => setLawyers(res.data.slice(0, 3)));
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getRiskColor = (score) => {
    if (score <= 30) return { text: '#16a34a', bg: '#f0fdf4' };
    if (score <= 60) return { text: '#d97706', bg: '#fffbeb' };
    return { text: '#dc2626', bg: '#fef2f2' };
  };

  const getCaseBorderClass = (status, score) => {
    if (status === 'resolved') return 'case-resolved';
    if (score > 60) return 'case-urgent';
    if (score > 30) return 'case-medium';
    return 'case-resolved';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getAvailabilityDisplay = (status, minutes) => {
    if (status === 'now') return { text: 'Now', color: '#16a34a', dotColor: '#22c55e' };
    if (status === 'soon') return { text: `${minutes} min`, color: '#16a34a', dotColor: '#22c55e' };
    return { text: 'Tomorrow', color: '#9ca3af', dotColor: '#e0e0e0' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 mb-2"></div>
        <div className="skeleton h-5 w-48"></div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-[14px]"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}.</h1>
          <p className="page-sub">
            You have {stats?.active_cases || 0} active case{stats?.active_cases !== 1 ? 's' : ''} 
            {stats?.cases_requiring_action > 0 && ` · ${stats.cases_requiring_action} requiring attention`}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/upload')} 
            className="btn-pill btn-outline flex items-center gap-2"
            data-testid="upload-document-btn"
          >
            <Upload size={16} />
            Upload document
          </button>
          <button 
            onClick={() => navigate('/cases')} 
            className="btn-pill btn-blue flex items-center gap-2"
            data-testid="new-case-btn"
          >
            <Plus size={16} />
            New case +
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card" data-testid="stat-active-cases">
          <div className="text-xs text-[#6b7280] font-medium mb-1">Active cases</div>
          <div className="text-2xl font-semibold text-[#111827]">{stats?.active_cases || 0}</div>
          <div className="text-xs text-[#9ca3af] mt-1">
            {stats?.cases_requiring_action || 0} require action
          </div>
        </div>
        <div className="stat-card" data-testid="stat-highest-risk">
          <div className="text-xs text-[#6b7280] font-medium mb-1">Highest risk</div>
          <div className="text-2xl font-semibold" style={{ color: getRiskColor(stats?.highest_risk_score || 0).text }}>
            {stats?.highest_risk_score || 0}/100
          </div>
          <div className="text-xs mt-1" style={{ color: stats?.highest_risk_score > 60 ? '#dc2626' : '#9ca3af' }}>
            {stats?.highest_risk_score > 60 ? 'Act within 7 days' : 'Low priority'}
          </div>
        </div>
        <div className="stat-card" data-testid="stat-documents">
          <div className="text-xs text-[#6b7280] font-medium mb-1">Documents</div>
          <div className="text-2xl font-semibold text-[#111827]">{stats?.total_documents || 0}</div>
          <div className="text-xs text-[#9ca3af] mt-1">Across all cases</div>
        </div>
        <div className="stat-card" data-testid="stat-next-call">
          <div className="text-xs text-[#6b7280] font-medium mb-1">Next call</div>
          <div className="text-lg font-semibold text-[#111827]">
            {stats?.next_call ? new Date(stats.next_call.scheduled_at).toLocaleDateString() : 'None'}
          </div>
          <div className="text-xs text-[#9ca3af] mt-1">
            {stats?.next_call ? stats.next_call.lawyer_name : 'Book a call'}
          </div>
        </div>
      </div>

      {/* Active Cases */}
      <div className="sec-header">
        <div className="sec-title">Active cases</div>
        <Link to="/cases" className="sec-link" data-testid="view-all-cases-link">View all</Link>
      </div>
      <div className="space-y-3 mb-6">
        {cases.length === 0 ? (
          <div className="card p-6 text-center">
            <FileText size={32} className="mx-auto mb-3 text-[#9ca3af]" />
            <p className="text-[#6b7280]">No cases yet. Upload a document to get started.</p>
          </div>
        ) : (
          cases.map((caseItem) => {
            const riskColor = getRiskColor(caseItem.risk_score);
            return (
              <div
                key={caseItem.case_id}
                className={`card p-4 cursor-pointer hover:shadow-md transition-shadow ${getCaseBorderClass(caseItem.status, caseItem.risk_score)}`}
                onClick={() => navigate(`/cases/${caseItem.case_id}`)}
                data-testid={`case-card-${caseItem.case_id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="badge badge-blue text-[10px] mb-2 capitalize">{caseItem.type}</div>
                    <div className="text-sm font-medium text-[#111827] mb-1">{caseItem.title}</div>
                    <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                      <span>{caseItem.document_count} document{caseItem.document_count !== 1 ? 's' : ''}</span>
                      <span className="w-1 h-1 rounded-full bg-[#d1d5db]"></span>
                      <span>Updated {new Date(caseItem.updated_at).toLocaleDateString()}</span>
                      {caseItem.deadline && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[#d1d5db]"></span>
                          <span style={{ color: riskColor.text, fontWeight: 500 }}>
                            {caseItem.deadline_description || `Due ${caseItem.deadline}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span 
                      className="badge text-xs font-semibold"
                      style={{ backgroundColor: riskColor.bg, color: riskColor.text }}
                    >
                      {caseItem.risk_score}/100
                    </span>
                    <div className="text-xs text-[#6b7280] mt-2">
                      {caseItem.status === 'resolved' ? 'Resolved' : 
                       caseItem.risk_score > 60 ? 'High risk' : 
                       caseItem.risk_score > 30 ? 'Medium risk' : 'Low risk'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Row: Upload + Lawyers */}
      <div className="grid grid-cols-2 gap-4">
        {/* Upload Zone */}
        <div>
          <div className="sec-header">
            <div className="sec-title">Upload a document</div>
          </div>
          <div 
            className="upload-zone p-6 cursor-pointer"
            onClick={() => navigate('/upload')}
            data-testid="upload-zone"
          >
            <div className="w-10 h-10 rounded-xl bg-[#dbeafe] flex items-center justify-center mx-auto mb-3">
              <Upload size={20} className="text-[#1a56db]" />
            </div>
            <div className="text-sm font-medium text-[#1d4ed8] mb-1">Drop document or click to upload</div>
            <div className="text-xs text-[#93c5fd]">PDF, Word, image · AI analyzes in 60 seconds</div>
          </div>
        </div>

        {/* Available Lawyers */}
        <div>
          <div className="sec-header">
            <div className="sec-title">Available lawyers</div>
            <Link to="/lawyers" className="sec-link" data-testid="book-call-link">Book a call</Link>
          </div>
          <div className="card p-3">
            {lawyers.map((lawyer, index) => {
              const avail = getAvailabilityDisplay(lawyer.availability_status, lawyer.availability_minutes);
              return (
                <div 
                  key={lawyer.lawyer_id}
                  className={`flex items-center gap-3 py-3 ${index < lawyers.length - 1 ? 'border-b border-[#f5f5f5]' : ''}`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#dbeafe] flex-shrink-0 overflow-hidden">
                    {lawyer.photo_url ? (
                      <img src={lawyer.photo_url} alt={lawyer.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#1a56db] text-sm font-medium">
                        {lawyer.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#111827] truncate">{lawyer.name}</div>
                    <div className="text-[10px] text-[#9ca3af]">{lawyer.specialty} · {lawyer.bar_state}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: avail.color }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: avail.dotColor }}></div>
                    {avail.text}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/lawyers/book?lawyer=${lawyer.lawyer_id}`); }}
                    className="px-3 py-1.5 text-[11px] font-medium text-white bg-[#1a56db] rounded-full hover:bg-[#1546b3] transition-colors"
                    data-testid={`book-lawyer-${lawyer.lawyer_id}-btn`}
                  >
                    Book
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
