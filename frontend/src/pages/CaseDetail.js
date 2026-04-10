import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, Upload, AlertCircle, Zap, CheckCircle, Clock, Video, Mail, X, Download, Copy, Loader2, TrendingUp, ChevronDown, ChevronUp, Target, Shield, Swords, Scale, BookOpen, AlertTriangle, Lightbulb, Share2, Link2, ExternalLink } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// SVG Risk Score History Chart
const RiskHistoryChart = ({ history, currentScore }) => {
  if (!history || history.length === 0) return null;

  const width = 520;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxScore = 100;
  const points = history.map((entry, i) => ({
    x: padding.left + (history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * chartW),
    y: padding.top + chartH - (entry.score / maxScore) * chartH,
    score: entry.score,
    date: entry.date,
    doc: entry.document_name
  }));

  const pathD = points.length === 1
    ? ''
    : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
    : '';

  const getColor = (score) => {
    if (score <= 30) return '#16a34a';
    if (score <= 60) return '#d97706';
    return '#dc2626';
  };

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '180px' }}>
      {/* Grid lines */}
      {yTicks.map(tick => {
        const y = padding.top + chartH - (tick / maxScore) * chartH;
        return (
          <g key={tick}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="9">{tick}</text>
          </g>
        );
      })}

      {/* Area fill */}
      {areaD && <path d={areaD} fill={getColor(currentScore)} opacity="0.08" />}

      {/* Line */}
      {pathD && <path d={pathD} fill="none" stroke={getColor(currentScore)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={getColor(p.score)} strokeWidth="2.5" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill={getColor(p.score)} fontSize="9" fontWeight="600">{p.score}</text>
          {/* X-axis label */}
          <text x={p.x} y={height - 5} textAnchor="middle" fill="#9ca3af" fontSize="8">
            {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        </g>
      ))}
    </svg>
  );
};

// Outcome Predictor Section
const OutcomePredictor = ({ caseId }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrediction = async () => {
    if (prediction) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/cases/${caseId}/predict-outcome`, {}, { withCredentials: true });
      setPrediction(res.data);
      setExpanded(true);
    } catch {
      setError('Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScenarioColor = (type) => {
    if (type === 'favorable') return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', bar: '#22c55e' };
    if (type === 'neutral') return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', bar: '#f59e0b' };
    return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', bar: '#ef4444' };
  };

  return (
    <div className="card p-5">
      <button
        onClick={fetchPrediction}
        className="w-full flex items-center justify-between"
        data-testid="outcome-predictor-toggle"
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#faf5ff] flex items-center justify-center">
            <Target size={14} className="text-[#7c3aed]" />
          </div>
          <div className="text-sm font-medium">Jasper Outcome Predictor</div>
          <span className="badge badge-blue text-[10px]">AI-powered</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin text-[#7c3aed]" />}
          {expanded ? <ChevronUp size={16} className="text-[#9ca3af]" /> : <ChevronDown size={16} className="text-[#9ca3af]" />}
        </div>
      </button>

      {error && <div className="text-xs text-[#dc2626] mt-3">{error}</div>}

      {expanded && prediction && (
        <div className="mt-4 space-y-3" data-testid="outcome-prediction-results">
          {/* Scenario cards */}
          {['favorable', 'neutral', 'unfavorable'].map((type) => {
            const scenario = prediction[type];
            if (!scenario) return null;
            const colors = getScenarioColor(type);
            return (
              <div key={type} className="rounded-xl p-4 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold capitalize" style={{ color: colors.text }}>{scenario.title}</div>
                  <div className="text-xs font-bold" style={{ color: colors.text }}>{scenario.probability}%</div>
                </div>
                {/* Probability bar */}
                <div className="h-1.5 rounded-full bg-white/60 mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${scenario.probability}%`, backgroundColor: colors.bar }}></div>
                </div>
                <div className="text-[11px] leading-relaxed mb-1" style={{ color: colors.text }}>{scenario.description}</div>
                <div className="flex items-center gap-4 mt-2">
                  {scenario.financial_impact && (
                    <div className="text-[10px]" style={{ color: colors.text }}>
                      <span className="opacity-70">Impact: </span><span className="font-medium">{scenario.financial_impact}</span>
                    </div>
                  )}
                  {scenario.timeline && (
                    <div className="text-[10px]" style={{ color: colors.text }}>
                      <span className="opacity-70">Timeline: </span><span className="font-medium">{scenario.timeline}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Key factors */}
          {prediction.key_factors && (
            <div className="bg-[#f8f8f8] rounded-xl p-4">
              <div className="text-xs font-medium text-[#111827] mb-2">Key factors influencing outcome</div>
              <div className="space-y-1">
                {prediction.key_factors.map((factor, i) => (
                  <div key={i} className="text-[11px] text-[#555] flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#7c3aed] mt-1.5 flex-shrink-0"></span>
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {prediction.recommendation && (
            <div className="text-[11px] text-[#7c3aed] bg-[#faf5ff] rounded-lg p-3 font-medium">
              {prediction.recommendation}
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-[10px] text-[#9ca3af]">{prediction.disclaimer}</div>
        </div>
      )}
    </div>
  );
};

// Legal Battle Preview Section
const BattlePreview = ({ battlePreview }) => {
  const [expanded, setExpanded] = useState(false);
  if (!battlePreview || (!battlePreview.user_side && !battlePreview.opposing_side)) return null;

  const userSide = battlePreview.user_side || {};
  const opposingSide = battlePreview.opposing_side || {};

  return (
    <div className="card p-5" data-testid="battle-preview">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#fef3c7] flex items-center justify-center">
            <Swords size={14} className="text-[#d97706]" />
          </div>
          <div className="text-sm font-medium">Legal Battle Preview</div>
          <span className="badge" style={{ background: '#f5f5f5', color: '#888', fontSize: '10px' }}>AI Analysis</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[#9ca3af]" /> : <ChevronDown size={16} className="text-[#9ca3af]" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4" data-testid="battle-preview-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* User's side */}
            <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-[#16a34a]" />
                <span className="text-xs font-semibold text-[#16a34a]">Your strongest arguments</span>
              </div>
              {userSide.strongest_arguments?.map((arg, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="text-[11px] font-medium text-[#111827] mb-0.5">{arg.argument}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      background: arg.strength === 'strong' ? '#dcfce7' : arg.strength === 'medium' ? '#fef9c3' : '#f5f5f5',
                      color: arg.strength === 'strong' ? '#16a34a' : arg.strength === 'medium' ? '#ca8a04' : '#888'
                    }}>{arg.strength}</span>
                    {arg.law_basis && <span className="text-[10px] text-[#9ca3af]">{arg.law_basis}</span>}
                  </div>
                </div>
              ))}
              {userSide.best_outcome_scenario && (
                <div className="mt-3 pt-3 border-t border-[#bbf7d0]">
                  <div className="text-[10px] text-[#16a34a] font-medium">Best possible outcome:</div>
                  <div className="text-[11px] text-[#166534]">{userSide.best_outcome_scenario}</div>
                </div>
              )}
            </div>

            {/* Opposing side */}
            <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-[#dc2626]" />
                <span className="text-xs font-semibold text-[#dc2626]">What they will argue</span>
              </div>
              {opposingSide.opposing_arguments?.map((arg, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="text-[11px] font-medium text-[#111827] mb-0.5">{arg.argument}</div>
                  {arg.user_counter && (
                    <div className="text-[10px] text-[#16a34a] bg-white/60 rounded px-1.5 py-0.5 mt-0.5">
                      Your counter: {arg.user_counter}
                    </div>
                  )}
                </div>
              ))}
              {opposingSide.worst_outcome_scenario && (
                <div className="mt-3 pt-3 border-t border-[#fecaca]">
                  <div className="text-[10px] text-[#dc2626] font-medium">Worst possible outcome:</div>
                  <div className="text-[11px] text-[#991b1b]">{opposingSide.worst_outcome_scenario}</div>
                </div>
              )}
            </div>
          </div>

          {opposingSide.what_user_must_prepare_for && (
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-3">
              <div className="text-[10px] font-medium text-[#d97706] mb-1">Prepare for:</div>
              <div className="text-[11px] text-[#92400e]">{opposingSide.what_user_must_prepare_for}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Probability Breakdown
const ProbabilityBreakdown = ({ probability }) => {
  if (!probability) return null;
  const items = [
    { key: 'negotiated_settlement', label: 'Negotiated settlement', color: '#22c55e' },
    { key: 'full_resolution_in_favor', label: 'Full resolution in your favor', color: '#3b82f6' },
    { key: 'partial_loss', label: 'Partial loss', color: '#f59e0b' },
    { key: 'full_loss', label: 'Full loss', color: '#9ca3af' }
  ].filter(item => probability[item.key] > 0)
   .sort((a, b) => (probability[b.key] || 0) - (probability[a.key] || 0));

  return (
    <div className="card p-5" data-testid="probability-breakdown">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#eff6ff] flex items-center justify-center">
          <Scale size={14} className="text-[#1a56db]" />
        </div>
        <div className="text-sm font-medium">Probability breakdown</div>
      </div>
      <div className="space-y-2.5">
        {items.map(item => {
          const pct = probability[item.key] || 0;
          return (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#555]">{item.label}</span>
                <span className="text-[11px] font-semibold" style={{ color: item.color }}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-[#f5f5f5] rounded-full">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Key Insight Banner
const KeyInsight = ({ insight, leverage }) => {
  if (!insight && (!leverage || leverage.length === 0)) return null;
  return (
    <div className="card p-4 bg-[#eff6ff] border-[#bfdbfe]" data-testid="key-insight">
      {insight && (
        <div className="flex items-start gap-2 mb-2">
          <Lightbulb size={14} className="text-[#1a56db] mt-0.5 flex-shrink-0" />
          <div className="text-[12px] font-medium text-[#1e40af]">{insight}</div>
        </div>
      )}
      {leverage && leverage.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wider text-[#3b82f6] font-medium mb-1">Leverage points</div>
          {leverage.map((lev, i) => (
            <div key={i} className="text-[11px] text-[#1e40af] mb-1">
              <span className="font-medium">{lev.leverage}</span>
              {lev.how_to_use && <span className="text-[#60a5fa]"> — {lev.how_to_use}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [riskHistory, setRiskHistory] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareExpiry, setShareExpiry] = useState(48);
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [activeShares, setActiveShares] = useState([]);

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
      
      // Fetch letter types and risk history
      const [letterTypesRes, riskHistoryRes, sharesRes] = await Promise.all([
        axios.get(`${API}/letters/types/${caseRes.data.type}`),
        axios.get(`${API}/cases/${caseId}/risk-history`, { withCredentials: true }),
        axios.get(`${API}/cases/${caseId}/shares`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setLetterTypes(letterTypesRes.data.letter_types || []);
      setRiskHistory(riskHistoryRes.data.history || []);
      setActiveShares(sharesRes.data || []);
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
            onClick={() => setShowShareModal(true)}
            className="btn-pill btn-outline flex items-center gap-2"
            data-testid="share-case-btn"
          >
            <Share2 size={14} /> Share
          </button>
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

            {/* Risk Score History Graph */}
            {riskHistory.length > 0 && (
              <div className="mb-4" data-testid="risk-score-history">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={12} className="text-[#6b7280]" />
                  <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium">Score evolution</span>
                </div>
                <RiskHistoryChart history={riskHistory} currentScore={caseData.risk_score} />
              </div>
            )}

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
                    className={`p-3 text-left border rounded-xl transition-all group ${
                      selectedLetterType?.id === letterType.id
                        ? 'bg-[#eff6ff] border-[#1a56db] ring-1 ring-[#1a56db]'
                        : 'bg-[#f8f8f8] hover:bg-[#eff6ff] border-[#ebebeb] hover:border-[#93c5fd]'
                    }`}
                    data-testid={`letter-btn-${letterType.id}`}
                  >
                    <div className={`text-xs font-medium mb-0.5 ${
                      selectedLetterType?.id === letterType.id ? 'text-[#1a56db]' : 'text-[#111827] group-hover:text-[#1a56db]'
                    }`}>{letterType.label}</div>
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

          {/* Outcome Predictor */}
          {caseData.risk_score > 0 && (
            <OutcomePredictor caseId={caseId} />
          )}

          {/* Key Insight */}
          <KeyInsight insight={caseData.key_insight} leverage={caseData.leverage_points} />

          {/* Legal Battle Preview */}
          <BattlePreview battlePreview={caseData.battle_preview} />

          {/* Probability Breakdown */}
          <ProbabilityBreakdown probability={caseData.success_probability} />

          {/* Recent Legal Updates */}
          {caseData.recent_case_law && caseData.recent_case_law.length > 0 && (
            <div className="card p-5" data-testid="recent-case-law-section">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#f0fdf4] flex items-center justify-center">
                    <Scale size={14} className="text-[#16a34a]" />
                  </div>
                  <div className="text-sm font-medium">Recent legal updates</div>
                </div>
                {caseData.case_law_updated && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full" data-testid="case-law-badge">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
                    <span className="text-[10px] font-medium text-[#16a34a]">Updated with latest case law — {caseData.case_law_updated}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {caseData.recent_case_law.map((law, i) => (
                  <div key={i} className="bg-[#f8fdf8] border border-[#d1fae5] rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-[#111827]">{law.case_name}</div>
                      {law.source_url && (
                        <a href={law.source_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0" data-testid={`case-law-link-${i}`}>
                          <ExternalLink size={12} className="text-[#16a34a]" />
                        </a>
                      )}
                    </div>
                    <div className="text-[10px] text-[#6b7280] mt-1">{law.court} &middot; {law.date}</div>
                    {law.ruling_summary && (
                      <div className="text-[11px] text-[#374151] mt-1.5 leading-relaxed">{law.ruling_summary}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Procedural Defects */}
          {caseData.procedural_defects && caseData.procedural_defects.length > 0 && (
            <div className="card p-5" data-testid="procedural-defects">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#f0fdf4] flex items-center justify-center">
                  <BookOpen size={14} className="text-[#16a34a]" />
                </div>
                <div className="text-sm font-medium">Procedural defects found</div>
              </div>
              <div className="space-y-2">
                {caseData.procedural_defects.map((defect, i) => (
                  <div key={i} className="bg-[#f0fdf4] rounded-lg p-3 border border-[#bbf7d0]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
                        background: defect.severity === 'fatal' ? '#fef2f2' : defect.severity === 'significant' ? '#fef9c3' : '#f5f5f5',
                        color: defect.severity === 'fatal' ? '#dc2626' : defect.severity === 'significant' ? '#ca8a04' : '#888'
                      }}>{defect.severity}</span>
                      {defect.applicable_law && <span className="text-[10px] text-[#9ca3af]">{defect.applicable_law}</span>}
                    </div>
                    <div className="text-[11px] text-[#111827] font-medium">{defect.defect}</div>
                    {defect.user_benefit && <div className="text-[10px] text-[#16a34a] mt-1">{defect.user_benefit}</div>}
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

          {/* Active Shared Links */}
          <div className="card p-4" data-testid="active-shares">
            <div className="sec-title mb-3">Shared links</div>
            {activeShares.length === 0 ? (
              <div className="text-xs text-[#9ca3af]">No active links · <button onClick={() => setShowShareModal(true)} className="text-[#1a56db] hover:underline">Share this case</button></div>
            ) : (
              <div className="space-y-2">
                {activeShares.map(share => {
                  const hoursLeft = Math.max(0, Math.round((new Date(share.expires_at) - new Date()) / 3600000));
                  return (
                    <div key={share.share_id} className="flex items-center justify-between py-2 border-b border-[#f5f5f5] last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[#555]">Expires in {hoursLeft}h · {share.views_count} views</div>
                        {share.comment_count > 0 && <div className="text-[10px] text-[#1a56db]">{share.comment_count} comment(s)</div>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/shared/${share.token}`); }} className="text-[10px] text-[#1a56db] hover:underline">Copy</button>
                        <button onClick={async () => {
                          await axios.post(`${API}/shares/${share.share_id}/revoke`, {}, { withCredentials: true });
                          setActiveShares(prev => prev.filter(s => s.share_id !== share.share_id));
                        }} className="text-[10px] text-[#dc2626] hover:underline ml-2">Revoke</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setShowShareModal(false); setShareLink(null); }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()} data-testid="share-modal">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium">Share this case</div>
              <button onClick={() => { setShowShareModal(false); setShareLink(null); }}><X size={16} className="text-[#9ca3af]" /></button>
            </div>

            {!shareLink ? (
              <>
                <div className="text-xs text-[#6b7280] mb-4">Generate a read-only link. Anyone with the link can view this case analysis.</div>
                <div className="mb-3">
                  <div className="text-[11px] text-[#9ca3af] mb-1.5">Expires in</div>
                  <div className="flex gap-2">
                    {[{h: 24, l: '24 hours'}, {h: 48, l: '48 hours'}, {h: 168, l: '7 days'}, {h: 720, l: '30 days'}].map(opt => (
                      <button key={opt.h} onClick={() => setShareExpiry(opt.h)}
                        className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${shareExpiry === opt.h ? 'bg-[#eff6ff] border-[#1a56db] text-[#1a56db]' : 'border-[#ebebeb] text-[#555] hover:border-[#93c5fd]'}`}
                        data-testid={`expiry-${opt.h}`}
                      >{opt.l}</button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-[11px] text-[#9ca3af] mb-1.5">Message for recipient (optional)</div>
                  <input value={shareMessage} onChange={e => setShareMessage(e.target.value)} placeholder="e.g. Please review before my call tomorrow" className="w-full px-3 py-2 text-xs border border-[#ebebeb] rounded-lg focus:outline-none focus:border-[#1a56db]" data-testid="share-message-input" />
                </div>
                <div className="text-[10px] text-[#9ca3af] mb-4">Recipients can view your case analysis but cannot download your documents or see your personal information.</div>
                <button onClick={async () => {
                  setSharing(true);
                  try {
                    const res = await axios.post(`${API}/cases/${caseId}/share`, { expiry_hours: shareExpiry, message: shareMessage || null }, { withCredentials: true });
                    setShareLink(`${window.location.origin}/shared/${res.data.token}`);
                    const sharesRes = await axios.get(`${API}/cases/${caseId}/shares`, { withCredentials: true });
                    setActiveShares(sharesRes.data || []);
                  } catch (err) {
                    alert(err.response?.data?.detail || 'Failed to generate link');
                  } finally { setSharing(false); }
                }} disabled={sharing} className="w-full btn-pill btn-blue py-2.5 flex items-center justify-center gap-2" data-testid="generate-link-btn">
                  {sharing ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  {sharing ? 'Generating...' : 'Generate secure link'}
                </button>
              </>
            ) : (
              <>
                <div className="text-xs text-[#16a34a] flex items-center gap-1.5 mb-3"><CheckCircle size={14} /> Link generated!</div>
                <div className="flex items-center gap-2 mb-4">
                  <input value={shareLink} readOnly className="flex-1 px-3 py-2 text-xs bg-[#f8f8f8] border border-[#ebebeb] rounded-lg" data-testid="share-link-input" />
                  <button onClick={() => { navigator.clipboard.writeText(shareLink); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2000); }}
                    className="btn-pill btn-blue text-xs" data-testid="copy-share-link-btn">
                    {shareLinkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="flex gap-2 mb-3">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Check out my legal case analysis: ${shareLink}`)}`} target="_blank" rel="noopener noreferrer" className="flex-1 btn-pill btn-outline text-xs text-center py-2">WhatsApp</a>
                  <a href={`mailto:?subject=Jasper Case Analysis&body=${encodeURIComponent(`I'd like you to review my case: ${shareLink}`)}`} className="flex-1 btn-pill btn-outline text-xs text-center py-2">Email</a>
                </div>
                <div className="text-[10px] text-[#9ca3af]">Link expires in {shareExpiry} hours</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetail;
