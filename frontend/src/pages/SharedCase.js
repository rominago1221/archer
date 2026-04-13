import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, Clock, FileText, CheckCircle, Shield, Swords, AlertTriangle, Loader2, Send, TrendingUp, Scale, Lightbulb } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SharedCase = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await axios.get(`${API}/shared/${token}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'This link is no longer available.');
      } finally {
        setLoading(false);
      }
    };
    fetchShared();
  }, [token]);

  const handleComment = async () => {
    if (!commentName.trim() || !commentText.trim() || commenting) return;
    setCommenting(true);
    try {
      await axios.post(`${API}/shared/${token}/comments`, {
        commenter_name: commentName,
        comment: commentText
      });
      setCommentSent(true);
      setCommentText('');
    } catch (e) { console.error('Failed to load shared case:', e); } finally {
      setCommenting(false);
    }
  };

  const getRiskColor = (score) => {
    if (score <= 30) return { text: '#16a34a', bg: '#f0fdf4' };
    if (score <= 60) return { text: '#d97706', bg: '#fef3c7' };
    return { text: '#dc2626', bg: '#fff5f5' };
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
      <Loader2 size={32} className="text-[#1a56db] animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-[#dc2626]" />
        </div>
        <div className="text-lg font-semibold text-[#111827] mb-2">Link unavailable</div>
        <div className="text-sm text-[#6b7280] mb-6">{error}</div>
        <Link to="/" className="btn-pill btn-blue inline-block" data-testid="try-jasper-btn">Try Archer free</Link>
      </div>
    </div>
  );

  const { share, case: caseData, documents, events, comments } = data;
  const rc = getRiskColor(caseData.risk_score);
  const expiresIn = Math.max(0, Math.round((new Date(share.expires_at) - new Date()) / 3600000));

  return (
    <div className="min-h-screen bg-[#f8f8f8]" data-testid="shared-case-page">
      {/* Header */}
      <div className="bg-white border-b border-[#ebebeb] px-6 py-3 flex items-center justify-between">
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', }} data-testid="shared-case-logo"><img src="/logos/archer-logo-wordmark.svg" alt="Archer" style={{ height: 28 }} /></div>
        <span className="text-xs text-[#9ca3af] bg-[#f5f5f5] px-3 py-1 rounded-full">View only</span>
      </div>

      {/* Share banner */}
      <div className="bg-[#eff6ff] border-b border-[#bfdbfe] px-6 py-2.5 text-xs text-[#1a56db]">
        Shared by {share.user_name} · Expires in {expiresIn} hours · {share.views_count} views
      </div>

      {share.optional_message && (
        <div className="bg-[#fef9c3] border-b border-[#fde68a] px-6 py-2 text-xs text-[#92400e]">
          "{share.optional_message}"
        </div>
      )}

      {/* Case content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {/* Title */}
        <div>
          <span className="badge badge-blue text-[10px] mr-2">{caseData.type}</span>
          <span className="badge text-[10px]" style={{ background: '#f5f5f5', color: '#888' }}>{caseData.status}</span>
          <h1 className="text-xl font-medium text-[#111827] mt-2">{caseData.title}</h1>
        </div>

        {/* Risk Score */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Risk Score</div>
            <div className="text-3xl font-bold" style={{ color: rc.text }}>{caseData.risk_score}<span className="text-sm font-normal text-[#aaa]">/100</span></div>
          </div>
          <div className="h-2 bg-[#f5f5f5] rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full" style={{ width: `${caseData.risk_score}%`, backgroundColor: rc.text }}></div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Financial', value: caseData.risk_financial },
              { label: 'Urgency', value: caseData.risk_urgency },
              { label: 'Legal Strength', value: caseData.risk_legal_strength },
              { label: 'Complexity', value: caseData.risk_complexity }
            ].map(d => (
              <div key={d.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#9ca3af]">{d.label}</span>
                  <span className="text-[10px] font-medium" style={{ color: getRiskColor(d.value).text }}>{d.value}</span>
                </div>
                <div className="h-1 bg-[#f0f0f0] rounded-full"><div className="h-full rounded-full" style={{ width: `${d.value}%`, backgroundColor: getRiskColor(d.value).text }}></div></div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {caseData.ai_summary && (
          <div className="card p-5">
            <div className="text-sm font-medium mb-2">AI Analysis Summary</div>
            <div className="text-xs text-[#555] leading-relaxed">{caseData.ai_summary}</div>
          </div>
        )}

        {/* Findings */}
        {caseData.ai_findings?.length > 0 && (
          <div className="card p-5">
            <div className="text-sm font-medium mb-3">Key Findings</div>
            <div className="space-y-2">
              {caseData.ai_findings.map((f, fIdx) => (
                <div key={`finding-${fIdx}-${(f.text || '').slice(0, 20)}`} className="flex items-start gap-2 py-2 border-b border-[#f5f5f5] last:border-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5" style={{
                    background: f.impact === 'high' ? '#fef2f2' : f.impact === 'medium' ? '#fef9c3' : '#f0fdf4',
                    color: f.impact === 'high' ? '#dc2626' : f.impact === 'medium' ? '#ca8a04' : '#16a34a'
                  }}>{f.impact}</span>
                  <span className="text-xs text-[#555]">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Insight */}
        {caseData.key_insight && (
          <div className="card p-4 bg-[#eff6ff] border-[#bfdbfe]">
            <div className="flex items-start gap-2">
              <Lightbulb size={14} className="text-[#1a56db] mt-0.5 flex-shrink-0" />
              <div className="text-[12px] font-medium text-[#1e40af]">{caseData.key_insight}</div>
            </div>
          </div>
        )}

        {/* Probability */}
        {caseData.success_probability && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Scale size={14} className="text-[#1a56db]" />
              <div className="text-sm font-medium">Probability breakdown</div>
            </div>
            {[
              { key: 'negotiated_settlement', label: 'Negotiated settlement', color: '#22c55e' },
              { key: 'full_resolution_in_favor', label: 'Full resolution', color: '#3b82f6' },
              { key: 'partial_loss', label: 'Partial loss', color: '#f59e0b' },
              { key: 'full_loss', label: 'Full loss', color: '#9ca3af' }
            ].filter(i => caseData.success_probability[i.key] > 0).map(item => (
              <div key={item.key} className="mb-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#555]">{item.label}</span>
                  <span className="font-semibold" style={{ color: item.color }}>{caseData.success_probability[item.key]}%</span>
                </div>
                <div className="h-1.5 bg-[#f5f5f5] rounded-full"><div className="h-full rounded-full" style={{ width: `${caseData.success_probability[item.key]}%`, backgroundColor: item.color }}></div></div>
              </div>
            ))}
          </div>
        )}

        {/* Documents */}
        {documents?.length > 0 && (
          <div className="card p-5">
            <div className="text-sm font-medium mb-3">Documents ({documents.length})</div>
            {documents.map((d) => (
              <div key={d.document_id || d.file_name} className="flex items-center gap-2 py-2 border-b border-[#f5f5f5] last:border-0">
                <FileText size={14} className="text-[#9ca3af]" />
                <span className="text-xs text-[#555] flex-1">{d.file_name}</span>
                <span className="badge text-[9px]" style={{ background: d.status === 'analyzed' ? '#f0fdf4' : '#f5f5f5', color: d.status === 'analyzed' ? '#16a34a' : '#888' }}>{d.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        {events?.length > 0 && (
          <div className="card p-5">
            <div className="text-sm font-medium mb-3">Timeline</div>
            {events.map((e) => (
              <div key={e.event_id || e.title} className="flex items-start gap-3 py-2 border-b border-[#f5f5f5] last:border-0">
                <div className="w-2 h-2 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0"></div>
                <div>
                  <div className="text-xs font-medium text-[#111827]">{e.title}</div>
                  <div className="text-[10px] text-[#9ca3af]">{e.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comments */}
        <div className="card p-5" data-testid="shared-comments">
          <div className="text-sm font-medium mb-3">Comments</div>
          {comments?.length > 0 && (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.created_at || c.commenter_name} className="bg-[#f8f8f8] rounded-lg p-3">
                  <div className="text-xs font-medium text-[#111827]">{c.commenter_name}</div>
                  <div className="text-xs text-[#555] mt-1">{c.comment}</div>
                  <div className="text-[10px] text-[#9ca3af] mt-1">{new Date(c.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
          {commentSent ? (
            <div className="text-xs text-[#16a34a] flex items-center gap-1"><CheckCircle size={14} /> Comment sent!</div>
          ) : (
            <div className="space-y-2">
              <input value={commentName} onChange={e => setCommentName(e.target.value)} placeholder="Your name" className="w-full px-3 py-2 text-xs border border-[#ebebeb] rounded-lg focus:outline-none focus:border-[#1a56db]" data-testid="comment-name" />
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment or question..." rows={2} className="w-full px-3 py-2 text-xs border border-[#ebebeb] rounded-lg focus:outline-none focus:border-[#1a56db] resize-none" data-testid="comment-text" />
              <button onClick={handleComment} disabled={commenting || !commentName.trim() || !commentText.trim()} className="btn-pill btn-blue text-xs flex items-center gap-1.5 disabled:opacity-40" data-testid="send-comment-btn">
                <Send size={12} /> {commenting ? 'Sending...' : 'Send comment'}
              </button>
            </div>
          )}
        </div>

        {/* Viral CTA */}
        <div className="card p-6 text-center bg-[#eff6ff] border-[#bfdbfe]">
          <div className="text-sm font-medium text-[#1a56db] mb-1">Got a legal problem?</div>
          <div className="text-xs text-[#3b82f6] mb-4">Archer analyzes any document in 60 seconds — free.</div>
          <Link to="/signup" className="btn-pill btn-blue inline-block" data-testid="signup-cta-btn">Try Archer free</Link>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-[10px] text-[#9ca3af] py-6 px-4">
        Archer provides legal information only, not legal advice. Consult a licensed attorney for advice specific to your situation.
      </div>
    </div>
  );
};

export default SharedCase;
