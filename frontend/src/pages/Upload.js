import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Upload as UploadIcon, FileText, AlertCircle, Loader2, Camera, Smartphone, ArrowRight, Scale, ExternalLink, BookOpen, Shield, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Mail, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

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
  const [analysisMode, setAnalysisMode] = useState('standard');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

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

    const isImageUpload = /\.(jpg|jpeg|png|heic|heif|webp)$/i.test(file.name);

    try {
      setUploadStage('reading');
      const formData = new FormData();
      formData.append('file', file);
      if (selectedCaseId && analysisMode === 'standard') formData.append('case_id', selectedCaseId);
      if (userContext.trim()) formData.append('user_context', userContext.trim());
      formData.append('analysis_mode', analysisMode);

      const uploadPromise = axios.post(`${API}/documents/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      await delay(isImageUpload ? 2000 : 3000);
      setUploadStage('analyzing');
      await delay(isImageUpload ? 8000 : 5000);
      setUploadStage('scoring');

      const response = await uploadPromise;
      setUploadStage('done');
      await delay(400);
      
      // Auto-redirect to dashboard — case was created and analysis runs in background
      if (response.data?.case_id) {
        navigate('/dashboard');
        return;
      }
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
    setCopiedEmail(false);
    setExpandedSections({});
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyEmailToClipboard = (emailDraft) => {
    const text = `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`;
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
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

  // Contract Guard score colors (amber theme)
  const getNegotiationColor = (score) => {
    if (score <= 25) return { text: '#16a34a', bg: '#f0fdf4', level: 'Favorable', desc: 'Good terms overall' };
    if (score <= 50) return { text: '#d97706', bg: '#fffbeb', level: 'Balanced', desc: 'Some clauses need attention' };
    if (score <= 75) return { text: '#ea580c', bg: '#fff7ed', level: 'Unfavorable', desc: 'Significant changes needed' };
    return { text: '#dc2626', bg: '#fef2f2', level: 'Dangerous', desc: 'Do not sign as-is' };
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return '#dc2626';
    if (severity === 'high') return '#ea580c';
    if (severity === 'medium') return '#d97706';
    return '#16a34a';
  };

  const isContractGuard = analysisMode === 'contract_guard';
  const isBelgian = (user?.jurisdiction || user?.country) === 'BE';
  const analysis = result?.analysis;
  const isVisionMode = result?.vision_mode;
  const isContractGuardResult = result?.analysis_mode === 'contract_guard';
  const showUploadForm = !uploading && !result;
  const showLoading = uploading || scanning;
  const showResult = !!result;
  const isImageFile = file && /\.(jpg|jpeg|png|heic|heif|webp)$/i.test(file.name);

  return (
    <div data-testid="upload-page">
      <div className="mb-6">
        <h1 className="page-title">Upload a document</h1>
        <p className="page-sub">AI analyzes your document and updates your Risk Score in 60 seconds</p>
      </div>

      <div className="max-w-2xl mx-auto">

        {/* Belgian mode indicator */}
        {isBelgian && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#111827] text-white rounded-xl" data-testid="belgian-mode-indicator">
            <span className="text-xs">🇧🇪</span>
            <span className="text-xs font-medium">Jasper Belgique</span>
            <span className="text-[10px] text-white/60 ml-1">
              {user?.region || 'Belgique'} &middot; Droit belge applicable
            </span>
          </div>
        )}

        {/* ========== LOADING STATE ========== */}
        {showLoading && (
          <div className={`card p-8 text-center ${isContractGuard ? 'border-[#f59e0b]/30' : ''}`} data-testid="analysis-progress">
            <Loader2 size={36} className={`mx-auto mb-5 animate-spin ${isContractGuard ? 'text-[#d97706]' : 'text-[#1a56db]'}`} />
            <div className="text-base font-medium text-[#111827] mb-2">
              {isContractGuard ? 'Analyzing contract for negotiation' : isImageFile ? 'Scanning document with image recognition' : 'Analyzing your document'}
            </div>
            {isImageFile && (
              <div className="mb-4 px-4 py-2 bg-[#eff6ff] rounded-lg text-xs text-[#1d4ed8]" data-testid="vision-mode-indicator">
                This appears to be a scanned document. Jasper is using advanced image recognition to analyze it...
              </div>
            )}
            <div className="max-w-xs mx-auto space-y-3">
              {[
                { key: 'reading', label: isContractGuard ? 'Reading contract clauses...' : isImageFile ? 'Reading document image...' : 'Reading document...' },
                { key: 'analyzing', label: isContractGuard ? 'Identifying negotiation points...' : isImageFile ? 'OCR + AI image analysis...' : 'Analyzing with AI...' },
                { key: 'scoring', label: isContractGuard ? 'Scoring contract fairness...' : 'Generating Risk Score...' }
              ].map((step) => {
                const stages = ['reading', 'analyzing', 'scoring', 'done'];
                const ci = stages.indexOf(uploadStage);
                const si = stages.indexOf(step.key);
                const done = ci > si;
                const current = ci === si;
                const accentColor = isContractGuard ? '#d97706' : '#1a56db';
                const accentBg = isContractGuard ? '#fffbeb' : '#eff6ff';
                return (
                  <div key={step.key} className={`flex items-center gap-3 py-2 px-4 rounded-xl transition-all`} style={current ? { backgroundColor: accentBg } : {}}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`} style={{
                      backgroundColor: done ? '#16a34a' : current ? accentColor : '#f0f0f0',
                      color: done || current ? 'white' : '#bbb'
                    }}>
                      {done ? '\u2713' : si + 1}
                    </div>
                    <span className={`text-sm ${done ? 'text-[#16a34a]' : current ? 'font-medium' : 'text-[#ccc]'}`} style={current ? { color: accentColor } : {}}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="h-full rounded-full transition-all duration-1000" style={{
                width: `${((['reading','analyzing','scoring','done'].indexOf(uploadStage)) + 1) * 33}%`,
                backgroundColor: isContractGuard ? '#d97706' : '#1a56db'
              }}></div>
            </div>
            <div className="text-xs text-[#9ca3af] mt-3">
              {isContractGuard ? 'Contract negotiation expert reviewing every clause...' : 'Senior attorney-level analysis in progress...'}
            </div>
          </div>
        )}

        {/* ========== UPLOAD FORM ========== */}
        {showUploadForm && (
          <>
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4" data-testid="mode-toggle">
              <button
                onClick={() => setAnalysisMode('standard')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  !isContractGuard
                    ? 'border-[#1a56db] bg-[#eff6ff]'
                    : 'border-[#e5e7eb] bg-white hover:border-[#93c5fd]'
                }`}
                data-testid="mode-standard-btn"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Scale size={16} className={!isContractGuard ? 'text-[#1a56db]' : 'text-[#9ca3af]'} />
                  <span className={`text-sm font-semibold ${!isContractGuard ? 'text-[#1a56db]' : 'text-[#6b7280]'}`}>
                    Analyze risk
                  </span>
                </div>
                <p className="text-[11px] text-[#6b7280]">I received this document. What are my risks?</p>
              </button>
              <button
                onClick={() => setAnalysisMode('contract_guard')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isContractGuard
                    ? 'border-[#d97706] bg-[#fffbeb]'
                    : 'border-[#e5e7eb] bg-white hover:border-[#fbbf24]'
                }`}
                data-testid="mode-contract-guard-btn"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield size={16} className={isContractGuard ? 'text-[#d97706]' : 'text-[#9ca3af]'} />
                  <span className={`text-sm font-semibold ${isContractGuard ? 'text-[#d97706]' : 'text-[#6b7280]'}`}>
                    Before I sign
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#d97706] text-white rounded-full">CONTRACT GUARD</span>
                </div>
                <p className="text-[11px] text-[#6b7280]">I'm about to sign. Help me negotiate.</p>
              </button>
            </div>

            {/* Drag & drop zone */}
            <div
              className={`upload-zone p-8 mb-4 ${isDragging ? (isContractGuard ? 'border-[#d97706] bg-[#fffbeb]' : 'border-[#1a56db] bg-[#dbeafe]') : ''}`}
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
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,.txt,.eml"
                className="hidden"
                data-testid="file-input"
              />
              {file ? (
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${isContractGuard ? 'bg-[#fef3c7]' : 'bg-[#dbeafe]'}`}>
                    <FileText size={24} className={isContractGuard ? 'text-[#d97706]' : 'text-[#1a56db]'} />
                  </div>
                  <div className="text-sm font-medium text-[#111827] mb-1">{file.name}</div>
                  <div className="text-xs text-[#6b7280] mb-3">{(file.size / 1024).toFixed(1)} KB</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                    className={`btn-pill px-6 ${isContractGuard ? 'bg-[#d97706] hover:bg-[#b45309] text-white' : 'btn-blue'}`}
                    data-testid="analyze-btn"
                  >
                    {isContractGuard ? 'Review contract' : 'Analyze document'}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${isContractGuard ? 'bg-[#fef3c7]' : 'bg-[#dbeafe]'}`}>
                    <UploadIcon size={24} className={isContractGuard ? 'text-[#d97706]' : 'text-[#1a56db]'} />
                  </div>
                  <div className={`text-sm font-medium mb-1 ${isContractGuard ? 'text-[#92400e]' : 'text-[#1d4ed8]'}`}>
                    {isContractGuard ? 'Drop your contract here' : 'Drop your document here'}
                  </div>
                  <div className={`text-xs mb-3 ${isContractGuard ? 'text-[#d97706]/60' : 'text-[#93c5fd]'}`}>Or click to browse from your device</div>
                  <div className={`btn-pill px-4 py-2 text-sm inline-block ${isContractGuard ? 'bg-white text-[#d97706] border border-[#d97706]' : 'bg-white text-[#1a56db] border border-[#1a56db]'}`} data-testid="browse-files-btn">
                    Browse files
                  </div>
                </div>
              )}
            </div>

            {/* File types */}
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
              {['PDF', 'Word (.docx)', 'JPEG / PNG / HEIC', 'Email (.eml)', 'Max 20MB'].map((type) => (
                <span key={type} className="px-3 py-1.5 bg-[#f5f5f5] text-[#6b7280] text-xs rounded-full">{type}</span>
              ))}
            </div>

            {/* User context textarea */}
            <div className="card p-4 mb-4" data-testid="user-context-section">
              <div className="text-sm font-medium text-[#111827] mb-1">
                {isContractGuard ? 'Tell Jasper about your negotiation goals' : 'Tell Jasper about your situation'}{' '}
                <span className="text-[#9ca3af] font-normal">(optional)</span>
              </div>
              <div className="text-xs text-[#6b7280] mb-3">
                {isContractGuard
                  ? 'What matters most to you? What are your deal-breakers?'
                  : 'Your context helps Jasper analyze more accurately.'}
              </div>
              <textarea
                value={userContext}
                onChange={(e) => { if (e.target.value.length <= 500) setUserContext(e.target.value); }}
                placeholder={isContractGuard
                  ? "Example: This is a job offer from a tech startup. I want to keep my IP rights for side projects. The salary is good but I'm worried about the non-compete clause..."
                  : "Example: I have been renting this apartment for 2 years, always paid on time, I have receipts. The landlord is trying to evict me but I think it's because I complained about repairs..."}
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

            {/* Document scanner (standard mode only) */}
            {!isContractGuard && (
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
            )}

            {/* Case selector (standard mode only) */}
            {!isContractGuard && (
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
            )}
          </>
        )}

        {/* ========== ERROR ========== */}
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 flex gap-3 mb-4" data-testid="upload-error">
            <AlertCircle size={20} className="text-[#dc2626] flex-shrink-0" />
            <div className="text-sm text-[#dc2626]">{error}</div>
          </div>
        )}

        {/* ========== RESULT: NO ANALYSIS ========== */}
        {showResult && !analysis && (
          <div className="card p-6 text-center" data-testid="analysis-failed">
            <div className="w-12 h-12 rounded-xl bg-[#fef2f2] flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} className="text-[#dc2626]" />
            </div>
            <div className="text-base font-medium text-[#111827] mb-2">Analysis could not be completed</div>
            <p className="text-sm text-[#6b7280] mb-4">
              {isVisionMode
                ? "The image quality was too low to extract text. Please try uploading a clearer photo or a higher-resolution scan."
                : "We couldn't extract enough text from this document. Try uploading a clearer scan, a photo of the document, or a PDF with selectable text."}
            </p>
            <button onClick={handleReset} className="btn-pill btn-blue px-6" data-testid="try-again-btn">
              Upload another document
            </button>
          </div>
        )}

        {/* ========== CONTRACT GUARD RESULT ========== */}
        {showResult && analysis && isContractGuardResult && (
          <ContractGuardResult
            analysis={analysis}
            fileName={result.file_name || file?.name || 'Contract'}
            getNegotiationColor={getNegotiationColor}
            getSeverityColor={getSeverityColor}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            copiedEmail={copiedEmail}
            copyEmailToClipboard={copyEmailToClipboard}
            onReset={handleReset}
            navigate={navigate}
          />
        )}

        {/* ========== STANDARD RESULT ========== */}
        {showResult && analysis && !isContractGuardResult && (
          <StandardResult
            result={result}
            analysis={analysis}
            file={file}
            getRiskColor={getRiskColor}
            getDimensionColor={getDimensionColor}
            navigate={navigate}
            onReset={handleReset}
            isVisionMode={isVisionMode}
          />
        )}
      </div>
    </div>
  );
};

/* ============================================ */
/* Contract Guard Result Component              */
/* ============================================ */
const ContractGuardResult = ({ analysis, fileName, getNegotiationColor, getSeverityColor, expandedSections, toggleSection, copiedEmail, copyEmailToClipboard, onReset, navigate }) => {
  const score = analysis.negotiation_score || 50;
  const scoreInfo = getNegotiationColor(score);
  const recommendation = analysis.overall_recommendation || {};

  const getActionColor = (action) => {
    if (action === 'sign_as_is') return '#16a34a';
    if (action === 'negotiate_then_sign') return '#d97706';
    if (action === 'significant_changes_needed') return '#ea580c';
    return '#dc2626';
  };

  const getActionLabel = (action) => {
    const labels = {
      'sign_as_is': 'Safe to sign',
      'negotiate_then_sign': 'Negotiate, then sign',
      'significant_changes_needed': 'Significant changes needed',
      'do_not_sign': 'Do not sign',
      'lawyer_review_required': 'Lawyer review required'
    };
    return labels[action] || action;
  };

  return (
    <div data-testid="contract-guard-result">
      <div className="card overflow-hidden mb-4">
        {/* Header — Amber */}
        <div className="bg-gradient-to-r from-[#d97706] to-[#b45309] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-white/80" />
            <span className="text-sm font-medium text-white">{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-white/20 text-white rounded-full">CONTRACT GUARD</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
            <span className="text-xs text-white/70">Review complete</span>
          </div>
        </div>

        <div className="p-5">
          {/* Negotiation Score */}
          <div className="grid grid-cols-[auto_1fr] gap-5 items-center mb-5">
            <div>
              <div className="flex items-baseline">
                <span className="text-5xl font-semibold" style={{ color: scoreInfo.text, letterSpacing: '-2px' }} data-testid="negotiation-score">
                  {score}
                </span>
                <span className="text-lg text-[#ccc] ml-1">/100</span>
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: scoreInfo.text }}>
                {scoreInfo.level}
              </div>
            </div>
            <div>
              <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: scoreInfo.text }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-[#9ca3af]">
                <span>0 — Favorable</span>
                <span>100 — Dangerous</span>
              </div>
            </div>
          </div>

          {/* Recommendation badge */}
          {recommendation.action && (
            <div className="flex items-center gap-2 mb-5 p-3 rounded-xl" style={{ backgroundColor: `${getActionColor(recommendation.action)}10`, border: `1px solid ${getActionColor(recommendation.action)}30` }} data-testid="cg-recommendation">
              {recommendation.action === 'sign_as_is' ? <CheckCircle size={18} style={{ color: getActionColor(recommendation.action) }} /> : 
               recommendation.action === 'do_not_sign' ? <XCircle size={18} style={{ color: getActionColor(recommendation.action) }} /> :
               <ShieldAlert size={18} style={{ color: getActionColor(recommendation.action) }} />}
              <div>
                <div className="text-sm font-semibold" style={{ color: getActionColor(recommendation.action) }}>
                  {getActionLabel(recommendation.action)}
                </div>
                {recommendation.reasoning && (
                  <div className="text-xs text-[#6b7280] mt-0.5">{recommendation.reasoning}</div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {analysis.summary && (
            <div className="mb-5">
              <div className="text-sm font-medium text-[#111827] mb-2">Summary</div>
              <p className="text-xs text-[#555] leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Red Lines */}
          {analysis.red_lines?.length > 0 && (
            <div className="mb-5" data-testid="cg-red-lines">
              <button onClick={() => toggleSection('red_lines')} className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-[#dc2626]" />
                  <span className="text-sm font-medium text-[#111827]">Red Lines ({analysis.red_lines.length})</span>
                </div>
                {expandedSections.red_lines ? <ChevronUp size={16} className="text-[#9ca3af]" /> : <ChevronDown size={16} className="text-[#9ca3af]" />}
              </button>
              {(expandedSections.red_lines !== false) && analysis.red_lines.map((item, i) => (
                <div key={i} className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 mb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-xs font-semibold text-[#dc2626]">{item.clause}</div>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: getSeverityColor(item.severity) }}>
                      {item.severity?.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#374151] mb-1"><strong>Current:</strong> {item.current_text}</div>
                  <div className="text-[11px] text-[#dc2626] mb-1"><strong>Risk:</strong> {item.risk}</div>
                  <div className="text-[11px] text-[#16a34a]"><strong>Suggested change:</strong> {item.suggested_change}</div>
                </div>
              ))}
            </div>
          )}

          {/* Negotiation Points */}
          {analysis.negotiation_points?.length > 0 && (
            <div className="mb-5" data-testid="cg-negotiation-points">
              <button onClick={() => toggleSection('negotiation_points')} className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[#d97706]" />
                  <span className="text-sm font-medium text-[#111827]">Negotiation Points ({analysis.negotiation_points.length})</span>
                </div>
                {expandedSections.negotiation_points ? <ChevronUp size={16} className="text-[#9ca3af]" /> : <ChevronDown size={16} className="text-[#9ca3af]" />}
              </button>
              {(expandedSections.negotiation_points !== false) && analysis.negotiation_points.map((item, i) => (
                <div key={i} className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3 mb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-xs font-semibold text-[#92400e]">{item.clause}</div>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                      item.priority === 'must_have' ? 'bg-[#ea580c] text-white' : 
                      item.priority === 'nice_to_have' ? 'bg-[#fbbf24] text-[#78350f]' : 'bg-[#e5e7eb] text-[#6b7280]'
                    }`}>
                      {item.priority?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#374151] mb-1"><strong>Issue:</strong> {item.issue}</div>
                  {item.industry_standard && (
                    <div className="text-[11px] text-[#6b7280] mb-1"><strong>Industry standard:</strong> {item.industry_standard}</div>
                  )}
                  <div className="text-[11px] text-[#d97706] mb-1"><strong>Ask for:</strong> {item.suggested_counter}</div>
                  {item.leverage_tip && (
                    <div className="text-[11px] text-[#16a34a]"><strong>Leverage tip:</strong> {item.leverage_tip}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Missing Protections */}
          {analysis.missing_protections?.length > 0 && (
            <div className="mb-5" data-testid="cg-missing-protections">
              <button onClick={() => toggleSection('missing_protections')} className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-[#7c3aed]" />
                  <span className="text-sm font-medium text-[#111827]">Missing Protections ({analysis.missing_protections.length})</span>
                </div>
                {expandedSections.missing_protections ? <ChevronUp size={16} className="text-[#9ca3af]" /> : <ChevronDown size={16} className="text-[#9ca3af]" />}
              </button>
              {(expandedSections.missing_protections !== false) && analysis.missing_protections.map((item, i) => (
                <div key={i} className="bg-[#faf5ff] border border-[#ddd6fe] rounded-xl p-3 mb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-xs font-semibold text-[#7c3aed]">{item.protection}</div>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                      item.priority === 'critical' ? 'bg-[#dc2626] text-white' : 
                      item.priority === 'important' ? 'bg-[#7c3aed] text-white' : 'bg-[#e5e7eb] text-[#6b7280]'
                    }`}>
                      {item.priority?.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#374151] mb-1">{item.why_important}</div>
                  {item.suggested_clause && (
                    <div className="text-[11px] text-[#16a34a]"><strong>Add:</strong> "{item.suggested_clause}"</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Standard Clauses Check */}
          {analysis.standard_clauses_check?.length > 0 && (
            <div className="mb-5" data-testid="cg-clauses-check">
              <button onClick={() => toggleSection('clauses_check')} className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#16a34a]" />
                  <span className="text-sm font-medium text-[#111827]">Standard Clauses Check</span>
                </div>
                {expandedSections.clauses_check ? <ChevronUp size={16} className="text-[#9ca3af]" /> : <ChevronDown size={16} className="text-[#9ca3af]" />}
              </button>
              {expandedSections.clauses_check && (
                <div className="grid grid-cols-2 gap-2">
                  {analysis.standard_clauses_check.map((clause, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#f8f8f8]">
                      {clause.present ? (
                        clause.fair ? (
                          <CheckCircle size={14} className="text-[#16a34a] flex-shrink-0" />
                        ) : (
                          <AlertTriangle size={14} className="text-[#d97706] flex-shrink-0" />
                        )
                      ) : (
                        <XCircle size={14} className="text-[#dc2626] flex-shrink-0" />
                      )}
                      <div>
                        <div className="text-[11px] font-medium text-[#111827] capitalize">{clause.clause_type?.replace('_', ' ')}</div>
                        <div className="text-[9px] text-[#6b7280]">{clause.notes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Negotiation Email Draft */}
          {analysis.negotiation_email_draft && (
            <div className="mb-5" data-testid="cg-email-draft">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-[#d97706]" />
                  <span className="text-sm font-medium text-[#111827]">Ready-to-send negotiation email</span>
                </div>
                <button
                  onClick={() => copyEmailToClipboard(analysis.negotiation_email_draft)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#d97706] bg-[#fffbeb] border border-[#fde68a] rounded-lg hover:bg-[#fef3c7] transition-colors"
                  data-testid="copy-email-btn"
                >
                  {copiedEmail ? <Check size={12} /> : <Copy size={12} />}
                  {copiedEmail ? 'Copied!' : 'Copy email'}
                </button>
              </div>
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
                <div className="text-xs text-[#6b7280] mb-1">Subject:</div>
                <div className="text-sm font-medium text-[#111827] mb-3">{analysis.negotiation_email_draft.subject}</div>
                <div className="text-xs text-[#6b7280] mb-1">Body:</div>
                <div className="text-xs text-[#374151] leading-relaxed whitespace-pre-line">{analysis.negotiation_email_draft.body}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onReset}
              className="btn-pill btn-outline flex items-center justify-center gap-2"
              data-testid="cg-review-another-btn"
            >
              Review another contract
            </button>
            <button
              onClick={() => navigate('/lawyers')}
              className="btn-pill flex items-center justify-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white"
              data-testid="cg-talk-lawyer-btn"
            >
              Talk to a lawyer — $149
            </button>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button onClick={onReset} className="text-sm text-[#d97706] hover:underline" data-testid="upload-another-btn">
          Upload another document
        </button>
      </div>
    </div>
  );
};

/* ============================================ */
/* Standard Result Component (unchanged logic)  */
/* ============================================ */
const StandardResult = ({ result, analysis, file, getRiskColor, getDimensionColor, navigate, onReset, isVisionMode }) => {
  return (
    <div data-testid="analysis-result">
      {isVisionMode && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl" data-testid="vision-mode-badge">
          <Camera size={14} className="text-[#1a56db]" />
          <span className="text-xs text-[#1d4ed8] font-medium">Analyzed via image recognition (scanned document)</span>
        </div>
      )}
      <div className="card overflow-hidden mb-4">
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

          {analysis.key_insight && (
            <div className="bg-[#eff6ff] rounded-xl p-4 mb-5" data-testid="key-insight">
              <div className="text-xs font-medium text-[#1a56db] mb-1">Key insight</div>
              <div className="text-sm text-[#1e40af]">{analysis.key_insight}</div>
            </div>
          )}

          {analysis.summary && (
            <div className="mb-5">
              <div className="text-sm font-medium text-[#111827] mb-2">Summary</div>
              <p className="text-xs text-[#555] leading-relaxed">{analysis.summary}</p>
            </div>
          )}

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

          {analysis.case_law_updated && (
            <div className="flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full w-fit" data-testid="case-law-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
              <span className="text-[10px] font-medium text-[#16a34a]">Updated with latest case law — {analysis.case_law_updated}</span>
            </div>
          )}

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

      <div className="text-center">
        <button onClick={onReset} className="text-sm text-[#1a56db] hover:underline" data-testid="upload-another-btn">
          Upload another document
        </button>
      </div>
    </div>
  );
};

export default Upload;
