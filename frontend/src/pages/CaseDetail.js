import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, Upload, AlertCircle, Zap, CheckCircle, Clock, Video, Mail, X, Download, Copy, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [events, setEvents] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Letter state
  const [letterTypes, setLetterTypes] = useState([]);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [selectedLetterType, setSelectedLetterType] = useState(null);
  const [letterForm, setLetterForm] = useState({
    user_address: '',
    opposing_party_name: '',
    opposing_party_address: '',
    additional_context: ''
  });
  const [copied, setCopied] = useState(false);

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
      
      // Fetch letter types for this case type
      const letterTypesRes = await axios.get(`${API}/letters/types/${caseRes.data.type}`);
      setLetterTypes(letterTypesRes.data.letter_types || []);
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
      case 'letter_generated': return <Mail size={10} className="text-[#1a56db]" />;
      default: return <Clock size={10} className="text-[#6b7280]" />;
    }
  };

  const getEventBgColor = (type) => {
    switch (type) {
      case 'score_updated': return '#fff5f5';
      case 'call_booked': return '#eff6ff';
      case 'letter_generated': return '#eff6ff';
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

  const handleGenerateLetter = async (letterType) => {
    setSelectedLetterType(letterType);
    setGeneratedLetter(null);
    setShowLetterModal(true);
  };

  const submitLetterGeneration = async () => {
    setGeneratingLetter(true);
    try {
      const response = await axios.post(`${API}/letters/generate`, {
        case_id: caseId,
        letter_type: selectedLetterType.id,
        user_address: letterForm.user_address || undefined,
        opposing_party_name: letterForm.opposing_party_name || undefined,
        opposing_party_address: letterForm.opposing_party_address || undefined,
        additional_context: letterForm.additional_context || undefined
      }, { withCredentials: true });
      
      setGeneratedLetter(response.data.letter);
      // Refresh events
      const eventsRes = await axios.get(`${API}/cases/${caseId}/events`, { withCredentials: true });
      setEvents(eventsRes.data);
    } catch (error) {
      console.error('Letter generation error:', error);
      alert('Failed to generate letter. Please try again.');
    } finally {
      setGeneratingLetter(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLetter?.letter_body) {
      navigator.clipboard.writeText(generatedLetter.letter_body.replace(/\\n/g, '\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadAsPDF = () => {
    // Create a printable version
    const printContent = `
      <html>
        <head>
          <title>${generatedLetter?.subject || 'Letter'}</title>
          <style>
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 1in; }
            .letter { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="letter">${generatedLetter?.letter_body?.replace(/\\n/g, '\n')}</div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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

          {/* Jasper Response Letters - NEW SECTION */}
          {letterTypes.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#eff6ff] flex items-center justify-center">
                  <Mail size={14} className="text-[#1a56db]" />
                </div>
                <div className="text-sm font-medium">Jasper Response Letters</div>
                <span className="badge badge-blue text-[10px] ml-auto">AI-powered</span>
              </div>
              <p className="text-xs text-[#666] mb-4">Generate a professional response letter tailored to your situation. All case details are pre-filled automatically.</p>
              <div className="grid grid-cols-2 gap-2">
                {letterTypes.map((letterType) => (
                  <button
                    key={letterType.id}
                    onClick={() => handleGenerateLetter(letterType)}
                    className="p-3 text-left bg-[#f8f8f8] hover:bg-[#eff6ff] border border-[#ebebeb] hover:border-[#93c5fd] rounded-xl transition-all group"
                    data-testid={`letter-btn-${letterType.id}`}
                  >
                    <div className="text-xs font-medium text-[#111827] group-hover:text-[#1a56db] mb-1">{letterType.label}</div>
                    <div className="text-[10px] text-[#9ca3af] leading-relaxed">{letterType.desc}</div>
                  </button>
                ))}
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
                      {step.action_type === 'draft_response' && letterTypes.length > 0 && (
                        <span className="text-[11px] text-[#1a56db] cursor-pointer hover:underline" onClick={() => handleGenerateLetter(letterTypes[0])}>
                          Generate response letter →
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

      {/* Letter Generation Modal */}
      {showLetterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#ebebeb] flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#111827]">
                  {generatedLetter ? 'Your Response Letter' : `Generate: ${selectedLetterType?.label}`}
                </div>
                <div className="text-xs text-[#6b7280]">{selectedLetterType?.desc}</div>
              </div>
              <button 
                onClick={() => { setShowLetterModal(false); setGeneratedLetter(null); }}
                className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center"
              >
                <X size={18} className="text-[#6b7280]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-5">
              {!generatedLetter ? (
                <div className="space-y-4">
                  <div className="bg-[#eff6ff] rounded-xl p-4">
                    <div className="text-xs font-medium text-[#1d4ed8] mb-2">Case details will be included automatically:</div>
                    <div className="text-xs text-[#3b82f6] space-y-1">
                      <div>• Case: {caseData.title}</div>
                      <div>• Risk Score: {caseData.risk_score}/100</div>
                      {caseData.financial_exposure && <div>• Financial exposure: {caseData.financial_exposure}</div>}
                      {caseData.deadline && <div>• Deadline: {caseData.deadline}</div>}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Your address (optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="123 Main St, City, State ZIP"
                      value={letterForm.user_address}
                      onChange={(e) => setLetterForm({ ...letterForm, user_address: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Opposing party name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Company name or person's name"
                      value={letterForm.opposing_party_name}
                      onChange={(e) => setLetterForm({ ...letterForm, opposing_party_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Opposing party address (optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Their address"
                      value={letterForm.opposing_party_address}
                      onChange={(e) => setLetterForm({ ...letterForm, opposing_party_address: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Additional context (optional)</label>
                    <textarea
                      className="form-input min-h-[80px]"
                      placeholder="Any additional information to include..."
                      value={letterForm.additional_context}
                      onChange={(e) => setLetterForm({ ...letterForm, additional_context: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Letter preview */}
                  <div className="bg-[#fafafa] rounded-xl p-5 border border-[#ebebeb]">
                    <div className="text-xs font-medium text-[#1a56db] mb-2">{generatedLetter.subject}</div>
                    <div className="text-xs text-[#444] whitespace-pre-wrap leading-relaxed font-mono" style={{ fontFamily: 'Georgia, serif' }}>
                      {generatedLetter.letter_body?.replace(/\\n/g, '\n')}
                    </div>
                  </div>

                  {/* Key points */}
                  {generatedLetter.key_points && (
                    <div className="bg-[#f0fdf4] rounded-xl p-4">
                      <div className="text-xs font-medium text-[#16a34a] mb-2">Key points in this letter:</div>
                      <ul className="space-y-1">
                        {generatedLetter.key_points.map((point, i) => (
                          <li key={i} className="text-xs text-[#15803d] flex items-start gap-2">
                            <CheckCircle size={12} className="text-[#16a34a] mt-0.5 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {generatedLetter.warnings && (
                    <div className="bg-[#fffbeb] rounded-xl p-4">
                      <div className="text-xs font-medium text-[#d97706] mb-2">Important reminders:</div>
                      <ul className="space-y-1">
                        {generatedLetter.warnings.map((warning, i) => (
                          <li key={i} className="text-xs text-[#b45309] flex items-start gap-2">
                            <AlertCircle size={12} className="text-[#d97706] mt-0.5 flex-shrink-0" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="text-[10px] text-[#9ca3af] leading-relaxed">
                    {generatedLetter.disclaimer}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-[#ebebeb] flex items-center justify-between bg-[#fafafa]">
              {!generatedLetter ? (
                <>
                  <button
                    onClick={() => setShowLetterModal(false)}
                    className="btn-pill btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitLetterGeneration}
                    disabled={generatingLetter}
                    className="btn-pill btn-blue flex items-center gap-2"
                    data-testid="generate-letter-btn"
                  >
                    {generatingLetter ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Generate Letter
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setGeneratedLetter(null)}
                    className="btn-pill btn-outline"
                  >
                    Generate another
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="btn-pill btn-outline flex items-center gap-2"
                      data-testid="copy-letter-btn"
                    >
                      <Copy size={16} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadAsPDF}
                      className="btn-pill btn-blue flex items-center gap-2"
                      data-testid="download-letter-btn"
                    >
                      <Download size={16} />
                      Download PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetail;
