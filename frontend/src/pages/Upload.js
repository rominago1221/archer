import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Upload as UploadIcon, FileText, AlertCircle, Loader2, Camera, Smartphone, ArrowRight, Scale, ExternalLink, BookOpen } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('case') || '');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [userContext, setUserContext] = useState('');

  const fetchCases = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cases`, { withCredentials: true });
      setCases(res.data.filter(c => c.status === 'active'));
    } catch (err) {
      console.error('Fetch cases error:', err);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError('File size must be under 20MB');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleCameraCapture = async (e) => {
    const capturedFile = e.target.files[0];
    if (!capturedFile) return;
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          setUploadStage('reading');
          const response = await axios.post(`${API}/documents/scan`, {
            image_base64: reader.result,
            case_id: selectedCaseId || null
          }, { withCredentials: true });
          setResult(response.data);
        } catch (err) {
          setError(err.response?.data?.detail || 'Scan failed. Please try again.');
        } finally {
          setScanning(false);
          setUploadStage('');
        }
      };
      reader.readAsDataURL(capturedFile);
    } catch {
      setError('Failed to read image. Please try again.');
      setScanning(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      setUploadStage('reading');
      const formData = new FormData();
      formData.append('file', file);
      if (selectedCaseId) formData.append('case_id', selectedCaseId);
      if (userContext.trim()) formData.append('user_context', userContext.trim());

      const uploadPromise = axios.post(`${API}/documents/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      await delay(3000);
      setUploadStage('analyzing');
      await delay(5000);
      setUploadStage('scoring');

      const response = await uploadPromise;
      setUploadStage('done');
      await delay(400);
      setResult(response.data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadStage('');
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setUploadStage('');
    setUserContext('');
  };

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

  const analysis = result?.analysis;
  const showUploadForm = !uploading && !result;
  const showLoading = uploading || scanning;
  const showResult = !!result;

  return (
    <div data-testid="upload-page">
      <div className="mb-6">
        <h1 className="page-title">Upload a document</h1>
        <p className="page-sub">AI analyzes your document and updates your Risk Score in 60 seconds</p>
      </div>

      <div className="max-w-2xl mx-auto">

        {/* ========== LOADING STATE ========== */}
        {showLoading && (
          <div className="card p-8 text-center" data-testid="analysis-progress">
            <Loader2 size={36} className="mx-auto mb-5 text-[#1a56db] animate-spin" />
            <div className="text-base font-medium text-[#111827] mb-5">Analyzing your document</div>
            <div className="max-w-xs mx-auto space-y-3">
              {[
                { key: 'reading', label: 'Reading document...' },
                { key: 'analyzing', label: 'Analyzing with AI...' },
                { key: 'scoring', label: 'Generating Risk Score...' }
              ].map((step) => {
                const stages = ['reading', 'analyzing', 'scoring', 'done'];
                const ci = stages.indexOf(uploadStage);
                const si = stages.indexOf(step.key);
                const done = ci > si;
                const current = ci === si;
                return (
                  <div key={step.key} className={`flex items-center gap-3 py-2 px-4 rounded-xl transition-all ${current ? 'bg-[#eff6ff]' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      done ? 'bg-[#16a34a] text-white' : current ? 'bg-[#1a56db] text-white' : 'bg-[#f0f0f0] text-[#bbb]'
                    }`}>
                      {done ? '\u2713' : si + 1}
                    </div>
                    <span className={`text-sm ${current ? 'text-[#1a56db] font-medium' : done ? 'text-[#16a34a]' : 'text-[#ccc]'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="h-full bg-[#1a56db] rounded-full transition-all duration-1000" style={{
                width: `${((['reading','analyzing','scoring','done'].indexOf(uploadStage)) + 1) * 33}%`
              }}></div>
            </div>
            <div className="text-xs text-[#9ca3af] mt-3">Senior attorney-level analysis in progress...</div>
          </div>
        )}

        {/* ========== UPLOAD FORM ========== */}
        {showUploadForm && (
          <>
            {/* Drag & drop zone */}
            <div
              className={`upload-zone p-8 mb-4 ${isDragging ? 'border-[#1a56db] bg-[#dbeafe]' : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              data-testid="upload-zone"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileSelect(e.target.files[0])}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.eml"
                className="hidden"
                data-testid="file-input"
              />
              {file ? (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#dbeafe] flex items-center justify-center mx-auto mb-3">
                    <FileText size={24} className="text-[#1a56db]" />
                  </div>
                  <div className="text-sm font-medium text-[#111827] mb-1">{file.name}</div>
                  <div className="text-xs text-[#6b7280] mb-3">{(file.size / 1024).toFixed(1)} KB</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                    className="btn-pill btn-blue px-6"
                    data-testid="analyze-btn"
                  >
                    Analyze document
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#dbeafe] flex items-center justify-center mx-auto mb-3">
                    <UploadIcon size={24} className="text-[#1a56db]" />
                  </div>
                  <div className="text-sm font-medium text-[#1d4ed8] mb-1">Drop your document here</div>
                  <div className="text-xs text-[#93c5fd] mb-3">Or click to browse from your device</div>
                  <div className="btn-pill bg-white text-[#1a56db] border border-[#1a56db] px-4 py-2 text-sm inline-block" data-testid="browse-files-btn">
                    Browse files
                  </div>
                </div>
              )}
            </div>

            {/* File types */}
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
              {['PDF', 'Word (.docx)', 'JPEG / PNG', 'Email (.eml)', 'Max 20MB'].map((type) => (
                <span key={type} className="px-3 py-1.5 bg-[#f5f5f5] text-[#6b7280] text-xs rounded-full">{type}</span>
              ))}
            </div>

            {/* User context textarea */}
            <div className="card p-4 mb-4" data-testid="user-context-section">
              <div className="text-sm font-medium text-[#111827] mb-1">
                Tell Jasper about your situation <span className="text-[#9ca3af] font-normal">(optional)</span>
              </div>
              <div className="text-xs text-[#6b7280] mb-3">Your context helps Jasper analyze more accurately.</div>
              <textarea
                value={userContext}
                onChange={(e) => { if (e.target.value.length <= 500) setUserContext(e.target.value); }}
                placeholder="Example: I have been renting this apartment for 2 years, always paid on time, I have receipts. The landlord is trying to evict me but I think it's because I complained about repairs..."
                className="form-input min-h-[100px] resize-none text-sm"
                maxLength={500}
                data-testid="user-context-input"
              />
              <div className="flex justify-end mt-1.5">
                <span className={`text-xs ${userContext.length >= 450 ? 'text-[#d97706]' : 'text-[#9ca3af]'}`} data-testid="char-counter">
                  {userContext.length}/500
                </span>
              </div>
            </div>

            {/* Document scanner */}
            <div className="card p-4 mb-4" data-testid="document-scanner-section">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#faf5ff] flex items-center justify-center">
                  <Camera size={14} className="text-[#7c3aed]" />
                </div>
                <div className="text-sm font-medium text-[#111827]">Document Scanner</div>
                <span className="badge badge-blue text-[10px]">AI OCR</span>
              </div>
              <p className="text-xs text-[#6b7280] mb-3">Take a photo of a letter, contract, or notice. Jasper will scan and analyze it instantly.</p>
              <input
                type="file" ref={cameraInputRef} accept="image/*" capture="environment"
                onChange={handleCameraCapture} className="hidden" data-testid="camera-input"
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={scanning}
                className="w-full btn-pill flex items-center justify-center gap-2 py-3 bg-[#faf5ff] text-[#7c3aed] border border-[#ddd6fe] hover:bg-[#ede9fe] transition-colors font-medium"
                data-testid="scan-document-btn"
              >
                <Smartphone size={16} />
                Take a photo to scan
              </button>
            </div>

            {/* Case selector */}
            <div className="card p-4 mb-4">
              <div className="text-sm font-medium text-[#111827] mb-2">Add to existing case</div>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="form-input"
                data-testid="case-select"
              >
                <option value="">Create a new case</option>
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>{c.title}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* ========== ERROR ========== */}
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 flex gap-3 mb-4" data-testid="upload-error">
            <AlertCircle size={20} className="text-[#dc2626] flex-shrink-0" />
            <div className="text-sm text-[#dc2626]">{error}</div>
          </div>
        )}

        {/* ========== RESULT: NO ANALYSIS (safety net for blank page) ========== */}
        {showResult && !analysis && (
          <div className="card p-6 text-center" data-testid="analysis-failed">
            <div className="w-12 h-12 rounded-xl bg-[#fef2f2] flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} className="text-[#dc2626]" />
            </div>
            <div className="text-base font-medium text-[#111827] mb-2">Analysis could not be completed</div>
            <p className="text-sm text-[#6b7280] mb-4">
              We couldn't extract enough text from this document to analyze it. This can happen with scanned PDFs, encrypted files, or unsupported formats.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={handleReset} className="btn-pill btn-blue px-6" data-testid="try-again-btn">
                Upload another document
              </button>
              {result?.case_id && (
                <button onClick={() => navigate(`/cases/${result.case_id}`)} className="btn-pill btn-outline px-6" data-testid="view-case-btn">
                  View case
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========== RESULT: FULL ANALYSIS ========== */}
        {showResult && analysis && (
          <div data-testid="analysis-result">
            <div className="card overflow-hidden mb-4">
              {/* Header */}
              <div className="bg-[#1a56db] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-white/70" />
                  <span className="text-sm font-medium text-white">{result.file_name || file?.name || 'Document'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
                  Analysis complete
                </div>
              </div>

              <div className="p-5">
                {/* Risk Score */}
                <div className="grid grid-cols-[auto_1fr] gap-5 items-center mb-5">
                  <div>
                    <div className="flex items-baseline">
                      <span className="text-5xl font-semibold" style={{ color: getRiskColor(analysis.risk_score?.total || 0).text, letterSpacing: '-2px' }}>
                        {analysis.risk_score?.total || 0}
                      </span>
                      <span className="text-lg text-[#ccc] ml-1">/100</span>
                    </div>
                    <div className="text-xs font-medium mt-1" style={{ color: getRiskColor(analysis.risk_score?.total || 0).text }}>
                      {getRiskColor(analysis.risk_score?.total || 0).level}
                    </div>
                  </div>
                  <div>
                    <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${analysis.risk_score?.total || 0}%`,
                        backgroundColor: getRiskColor(analysis.risk_score?.total || 0).text
                      }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#9ca3af]">
                      <span>0 — No risk</span>
                      <span>100 — Critical</span>
                    </div>
                  </div>
                </div>

                {/* Dimension scores */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {[
                    { label: 'Financial', value: analysis.risk_score?.financial || 0 },
                    { label: 'Urgency', value: analysis.risk_score?.urgency || 0 },
                    { label: 'Legal strength', value: analysis.risk_score?.legal_strength || 0 },
                    { label: 'Complexity', value: analysis.risk_score?.complexity || 0 }
                  ].map((dim) => (
                    <div key={dim.label} className="bg-[#f8f8f8] rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold" style={{ color: getDimensionColor(dim.value) }}>{dim.value}</div>
                      <div className="text-[10px] text-[#9ca3af]">{dim.label}</div>
                    </div>
                  ))}
                </div>

                {/* Key insight */}
                {analysis.key_insight && (
                  <div className="bg-[#eff6ff] rounded-xl p-4 mb-5" data-testid="key-insight">
                    <div className="text-xs font-medium text-[#1a56db] mb-1">Key insight</div>
                    <div className="text-sm text-[#1e40af]">{analysis.key_insight}</div>
                  </div>
                )}

                {/* Summary */}
                {analysis.summary && (
                  <div className="mb-5">
                    <div className="text-sm font-medium text-[#111827] mb-2">Summary</div>
                    <p className="text-xs text-[#555] leading-relaxed">{analysis.summary}</p>
                  </div>
                )}

                {/* Findings */}
                {analysis.findings?.length > 0 && (
                  <div className="mb-5">
                    <div className="text-sm font-medium text-[#111827] mb-3">Key findings</div>
                    {analysis.findings.map((finding, i) => {
                      const dotColor = finding.impact === 'high' ? '#dc2626' : finding.impact === 'medium' ? '#d97706' : '#16a34a';
                      return (
                        <div key={i} className={`flex items-start gap-2 py-2.5 ${i < analysis.findings.length - 1 ? 'border-b border-[#f5f5f5]' : ''}`}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: dotColor }}></span>
                          <div>
                            <div className="text-xs text-[#333]">{finding.text}</div>
                            <div className="text-[10px] text-[#aaa] mt-0.5 capitalize">{finding.impact} impact</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Next steps */}
                {analysis.next_steps?.length > 0 && (
                  <div className="mb-5">
                    <div className="text-sm font-medium text-[#111827] mb-3">Recommended next steps</div>
                    {analysis.next_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 py-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#eff6ff] text-[#1a56db] flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                        <div>
                          <div className="text-xs font-medium text-[#111827]">{step.title}</div>
                          <div className="text-[11px] text-[#6b7280] mt-0.5">{step.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent legal updates */}
                {analysis.recent_case_law?.length > 0 && (
                  <div className="mb-5" data-testid="recent-case-law">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen size={14} className="text-[#16a34a]" />
                      <div className="text-sm font-medium text-[#111827]">Recent legal updates</div>
                    </div>
                    <div className="space-y-2">
                      {analysis.recent_case_law.map((law, i) => (
                        <div key={i} className="bg-[#f8fdf8] border border-[#d1fae5] rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs font-medium text-[#111827]">{law.case_name}</div>
                            {law.source_url && (
                              <a href={law.source_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
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

                {/* Case law badge */}
                {analysis.case_law_updated && (
                  <div className="flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full w-fit" data-testid="case-law-badge">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
                    <span className="text-[10px] font-medium text-[#16a34a]">Updated with latest case law — {analysis.case_law_updated}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => navigate(`/cases/${result.case_id}`)}
                    className="btn-pill btn-outline flex items-center justify-center gap-2"
                    data-testid="view-full-case-btn"
                  >
                    View full case <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate('/lawyers')}
                    className="btn-pill btn-blue flex items-center justify-center gap-2"
                    data-testid="talk-to-lawyer-btn"
                  >
                    Talk to a lawyer — $149
                  </button>
                </div>
              </div>
            </div>

            {/* Upload another */}
            <div className="text-center">
              <button onClick={handleReset} className="text-sm text-[#1a56db] hover:underline" data-testid="upload-another-btn">
                Upload another document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
