import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, Upload, AlertCircle, Zap, CheckCircle, Clock, Video, ChevronRight, Calendar, Phone } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [events, setEvents] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [caseRes, docsRes, eventsRes, lawyersRes] = await Promise.all([
        axios.get(`${API}/cases/${caseId}`, { withCredentials: true }),
        axios.get(`${API}/cases/${caseId}/documents`, { withCredentials: true }),
        axios.get(`${API}/cases/${caseId}/events`, { withCredentials: true }),
        axios.get(`${API}/lawyers`)
      ]);
      setCaseData(caseRes.data);
      setDocuments(docsRes.data);
      setEvents(eventsRes.data);
      setLawyers(lawyersRes.data.filter(l => l.availability_status === 'now' || l.availability_status === 'soon').slice(0, 1));
    } catch (error) {
      console.error('Case detail fetch error:', error);
      navigate('/cases');
    } finally {
      setLoading(false);
    }
  }, [caseId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRiskColor = (score) => {
    if (score <= 30) return { text: '#16a34a', bg: '#f0fdf4', level: 'Low risk' };
    if (score <= 60) return { text: '#d97706', bg: '#fffbeb', level: 'Medium risk' };
    return { text: '#dc2626', bg: '#fef2f2', level: 'High risk' };
  };

  const getDimensionColor = (score) => {
    if (score <= 30) return '#16a34a';
    if (score <= 60) return '#d97706';
    return '#dc2626';
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'score_updated': return <Zap size={10} className="text-[#dc2626]" />;
      case 'call_booked': return <Video size={10} className="text-[#1a56db]" />;
      case 'document_added': return <FileText size={10} className="text-[#dc2626]" />;
      case 'case_opened': return <FileText size={10} className="text-[#dc2626]" />;
      default: return <Clock size={10} className="text-[#6b7280]" />;
    }
  };

  const getEventBgColor = (type) => {
    switch (type) {
      case 'score_updated': return '#fff5f5';
      case 'call_booked': return '#eff6ff';
      case 'document_added':
      case 'case_opened': return '#fff5f5';
      default: return '#f5f5f5';
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntilDeadline = () => {
    if (!caseData?.deadline) return null;
    const deadline = new Date(caseData.deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-32"></div>
        <div className="skeleton h-8 w-64"></div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="col-span-2 space-y-4">
            <div className="skeleton h-48 rounded-[14px]"></div>
            <div className="skeleton h-32 rounded-[14px]"></div>
          </div>
          <div className="space-y-4">
            <div className="skeleton h-40 rounded-[14px]"></div>
            <div className="skeleton h-48 rounded-[14px]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const riskColor = getRiskColor(caseData.risk_score);
  const daysUntil = getDaysUntilDeadline();
  const showLawyerCTA = caseData.risk_score > 65 || caseData.recommend_lawyer;

  return (
    <div data-testid="case-detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/cases" className="bc-link">My cases</Link>
        <span>/</span>
        <span>{caseData.title.substring(0, 30)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-blue text-[10px] capitalize">{caseData.type}</span>
            {daysUntil !== null && daysUntil <= 7 && (
              <span className="badge badge-red text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]"></span>
                Urgent — respond by {caseData.deadline}
              </span>
            )}
          </div>
          <h1 className="page-title">{caseData.title}</h1>
          <p className="page-sub">
            Opened {new Date(caseData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {documents.length} document{documents.length !== 1 ? 's' : ''} · Updated {formatTimeAgo(caseData.updated_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/upload?case=${caseId}`)} 
            className="btn-pill btn-outline flex items-center gap-2"
            data-testid="add-document-btn"
          >
            Add document
          </button>
          <button 
            onClick={() => navigate('/lawyers')} 
            className="btn-pill btn-blue flex items-center gap-2"
            data-testid="talk-to-lawyer-btn"
          >
            Talk to a lawyer
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left Column - 2/3 */}
        <div className="col-span-2 space-y-4">
          {/* Risk Score Card */}
          <div className="card p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium mb-1">Jasper Risk Score</div>
                <div className="flex items-baseline">
                  <span className="text-5xl font-semibold" style={{ color: riskColor.text, letterSpacing: '-2px' }}>
                    {caseData.risk_score}
                  </span>
                  <span className="text-lg text-[#ccc] ml-1">/100</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: riskColor.text }}></span>
                  <span className="text-xs font-medium" style={{ color: riskColor.text }}>{riskColor.level}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#9ca3af]">Updated {formatTimeAgo(caseData.updated_at)}</div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-[#f5f5f5] rounded-full overflow-hidden mb-4">
              <div 
                className="h-full rounded-full transition-all" 
                style={{ width: `${caseData.risk_score}%`, backgroundColor: riskColor.text }}
              ></div>
            </div>

            {/* Dimension scores */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Financial', value: caseData.risk_financial },
                { label: 'Urgency', value: caseData.risk_urgency },
                { label: 'Legal strength', value: caseData.risk_legal_strength },
                { label: 'Complexity', value: caseData.risk_complexity }
              ].map((dim) => (
                <div key={dim.label} className="bg-[#f8f8f8] rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold" style={{ color: getDimensionColor(dim.value) }}>{dim.value}</div>
                  <div className="text-[10px] text-[#9ca3af]">{dim.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Box */}
          {daysUntil !== null && daysUntil <= 7 && (
            <div className="bg-[#fff5f5] border border-[#fecaca] rounded-xl p-4 flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#fee2e2] flex items-center justify-center flex-shrink-0">
                <AlertCircle size={14} className="text-[#dc2626]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#dc2626] mb-1">Action required in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</div>
                <div className="text-xs text-[#ef4444] leading-relaxed">
                  {caseData.deadline_description || `Deadline on ${caseData.deadline}. Consider consulting a lawyer before responding.`}
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {caseData.ai_findings && caseData.ai_findings.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#eff6ff] flex items-center justify-center">
                  <Zap size={14} className="text-[#1a56db]" />
                </div>
                <div className="text-sm font-medium">Jasper AI analysis</div>
                <span className="badge badge-green text-[10px] ml-auto">Updated with latest doc</span>
              </div>
              <div className="space-y-0">
                {caseData.ai_findings.map((finding, i) => {
                  const dotColor = finding.impact === 'high' ? '#dc2626' : finding.impact === 'medium' ? '#d97706' : '#16a34a';
                  const badgeClass = finding.type === 'risk' ? 'badge-red' : 
                                     finding.type === 'opportunity' ? 'badge-orange' : 
                                     finding.type === 'deadline' ? 'badge-red' : 'badge-green';
                  const badgeText = finding.type === 'risk' ? 'High impact' : 
                                    finding.type === 'opportunity' ? 'Opportunity' : 
                                    finding.type === 'deadline' ? 'Deadline critical' : 'Favorable outlook';
                  return (
                    <div key={i} className={`flex items-start gap-3 py-3 ${i < caseData.ai_findings.length - 1 ? 'border-b border-[#f5f5f5]' : ''}`}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: dotColor }}></span>
                      <div className="text-xs text-[#444] leading-relaxed">
                        {finding.text}
                        <span className={`badge ${badgeClass} text-[10px] ml-2`}>{badgeText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {caseData.ai_next_steps && caseData.ai_next_steps.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#eff6ff] flex items-center justify-center">
                  <CheckCircle size={14} className="text-[#1a56db]" />
                </div>
                <div className="text-sm font-medium">Recommended next steps</div>
              </div>
              <div className="space-y-0">
                {caseData.ai_next_steps.map((step, i) => (
                  <div key={i} className={`flex items-start gap-3 py-3 ${i < caseData.ai_next_steps.length - 1 ? 'border-b border-[#f5f5f5]' : ''}`}>
                    <div className="w-6 h-6 rounded-full bg-[#1a56db] text-white text-[10px] font-medium flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[#111827] mb-1">{step.title}</div>
                      <div className="text-[11px] text-[#777] leading-relaxed mb-1">{step.description}</div>
                      {step.action_type === 'book_lawyer' && (
                        <span className="text-[11px] text-[#1a56db] cursor-pointer hover:underline" onClick={() => navigate('/lawyers')}>
                          Book a call — $149 →
                        </span>
                      )}
                      {step.action_type === 'upload_document' && (
                        <span className="text-[11px] text-[#1a56db] cursor-pointer hover:underline" onClick={() => navigate(`/upload?case=${caseId}`)}>
                          Add documents →
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-4">
          {/* Book a Lawyer CTA */}
          {showLawyerCTA && lawyers.length > 0 && (
            <div className="bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] border border-[#93c5fd] rounded-[14px] p-4 text-center">
              <div className="text-sm font-medium text-[#1d4ed8] mb-1">Your risk is high.</div>
              <div className="text-[11px] text-[#3b82f6] leading-relaxed mb-3">
                A 30-min call with a licensed attorney could save you thousands. Your full case brief is sent before the call.
              </div>
              <button 
                onClick={() => navigate(`/lawyers/book?lawyer=${lawyers[0].lawyer_id}&case=${caseId}`)}
                className="w-full btn-pill btn-blue py-2.5 text-sm"
                data-testid="book-video-call-btn"
              >
                Book a video call — $149
              </button>
              <div className="text-[10px] text-[#93c5fd] mt-2">
                {lawyers[0].name} available now · {lawyers[0].specialty}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="card p-4">
            <div className="sec-header mb-3">
              <div className="sec-title">Documents ({documents.length})</div>
              <span 
                className="sec-link"
                onClick={() => navigate(`/upload?case=${caseId}`)}
              >
                + Add
              </span>
            </div>
            {documents.map((doc, i) => (
              <div key={doc.document_id} className={`flex items-center gap-3 py-2 ${i < documents.length - 1 ? 'border-b border-[#f5f5f5]' : ''} cursor-pointer`}>
                <div className="w-7 h-7 rounded-lg bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                  <FileText size={12} className="text-[#1a56db]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#111827] truncate">{doc.file_name}</div>
                  <div className="text-[10px] text-[#9ca3af]">Added {new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <span className={`badge text-[10px] ${doc.is_key_document ? 'badge-red' : doc.status === 'analyzed' ? 'badge-blue' : 'badge-orange'}`}>
                  {doc.is_key_document ? 'Key' : doc.status === 'analyzed' ? 'Analyzed' : 'Draft'}
                </span>
              </div>
            ))}
            
            {/* Drop zone */}
            <div 
              className="border-2 border-dashed border-[#93c5fd] rounded-lg p-3 text-center mt-3 cursor-pointer bg-[#eff6ff] hover:bg-[#dbeafe] transition-colors"
              onClick={() => navigate(`/upload?case=${caseId}`)}
              data-testid="drop-new-document"
            >
              <div className="text-xs text-[#1d4ed8] font-medium">+ Drop a new document</div>
              <div className="text-[10px] text-[#93c5fd] mt-0.5">Score updates automatically</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-4">
            <div className="sec-title mb-3">Case timeline</div>
            {events.slice(0, 5).map((event, i) => (
              <div key={event.event_id} className={`flex gap-3 py-2 ${i < Math.min(events.length, 5) - 1 ? 'border-b border-[#f5f5f5]' : ''}`}>
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getEventBgColor(event.event_type) }}
                >
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#111827]">{event.title}</div>
                  <div className="text-[11px] text-[#777]">{event.description}</div>
                </div>
                <div className="text-[10px] text-[#9ca3af] flex-shrink-0">{formatTimeAgo(event.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
