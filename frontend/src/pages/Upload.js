import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('case') || '');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchCases = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cases`, { withCredentials: true });
      setCases(res.data.filter(c => c.status === 'active'));
    } catch (err) {
      console.error('Fetch cases error:', err);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      // Validate file size (20MB max)
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError('File size must be under 20MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    // Free plan check is handled by backend - it allows 1 document
    // The backend will return 403 if they've already used their free analysis

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      setUploadStage('Reading document...');
      await new Promise(r => setTimeout(r, 500));

      setUploadStage('Analyzing with AI...');
      
      const formData = new FormData();
      formData.append('file', file);
      if (selectedCaseId) {
        formData.append('case_id', selectedCaseId);
      }

      const response = await axios.post(`${API}/documents/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadStage('Generating Risk Score...');
      await new Promise(r => setTimeout(r, 500));

      setResult(response.data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadStage('');
    }
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

  return (
    <div data-testid="upload-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Upload a document</h1>
        <p className="page-sub">AI analyzes your document and updates your Risk Score in 60 seconds</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Upload Zone */}
        {!result && (
          <>
            <div
              className={`upload-zone p-8 mb-4 ${isDragging ? 'border-[#1a56db] bg-[#dbeafe]' : ''} ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !uploading && fileInputRef.current?.click()}
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
              
              {uploading ? (
                <div className="text-center">
                  <Loader2 size={32} className="mx-auto mb-3 text-[#1a56db] animate-spin" />
                  <div className="text-sm font-medium text-[#1d4ed8] mb-1">{uploadStage}</div>
                  <div className="text-xs text-[#93c5fd]">This may take a moment...</div>
                </div>
              ) : file ? (
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
                  <div className="btn-pill bg-white text-[#1a56db] border border-[#1a56db] px-4 py-2 text-sm inline-block">
                    Browse files
                  </div>
                </div>
              )}
            </div>

            {/* File types */}
            <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              {['PDF', 'Word', 'JPEG / PNG', 'Email (.eml)', 'Max 20MB'].map((type) => (
                <span key={type} className="px-3 py-1.5 bg-[#f5f5f5] text-[#6b7280] text-xs rounded-full">
                  {type}
                </span>
              ))}
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
                  <option key={c.case_id} value={c.case_id}>
                    {c.title} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 flex gap-3 mb-4">
                <AlertCircle size={20} className="text-[#dc2626] flex-shrink-0" />
                <div className="text-sm text-[#dc2626]">{error}</div>
              </div>
            )}
          </>
        )}

        {/* Analysis Result */}
        {result && result.analysis && (
          <div className="card overflow-hidden" data-testid="analysis-result">
            {/* Header */}
            <div className="bg-[#1a56db] px-5 py-4 flex items-center justify-between">
              <div className="text-sm font-medium text-white">{file?.name}</div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
                Analysis complete
              </div>
            </div>

            <div className="p-5">
              {/* Score and bar */}
              <div className="grid grid-cols-[auto_1fr] gap-5 items-center mb-5">
                <div>
                  <div className="flex items-baseline">
                    <span 
                      className="text-5xl font-semibold"
                      style={{ color: getRiskColor(result.analysis.risk_score.total).text, letterSpacing: '-2px' }}
                    >
                      {result.analysis.risk_score.total}
                    </span>
                    <span className="text-lg text-[#ccc] ml-1">/100</span>
                  </div>
                  <div className="text-xs font-medium mt-1" style={{ color: getRiskColor(result.analysis.risk_score.total).text }}>
                    {getRiskColor(result.analysis.risk_score.total).level}
                  </div>
                </div>
                <div>
                  <div className="h-2 bg-[#fee2e2] rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${result.analysis.risk_score.total}%`, 
                        backgroundColor: getRiskColor(result.analysis.risk_score.total).text 
                      }}
                    ></div>
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
                  { label: 'Financial', value: result.analysis.risk_score.financial },
                  { label: 'Urgency', value: result.analysis.risk_score.urgency },
                  { label: 'Legal strength', value: result.analysis.risk_score.legal_strength },
                  { label: 'Complexity', value: result.analysis.risk_score.complexity }
                ].map((dim) => (
                  <div key={dim.label} className="bg-[#f8f8f8] rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold" style={{ color: getDimensionColor(dim.value) }}>{dim.value}</div>
                    <div className="text-[10px] text-[#9ca3af]">{dim.label}</div>
                  </div>
                ))}
              </div>

              {/* Key findings */}
              {result.analysis.findings && result.analysis.findings.length > 0 && (
                <div className="mb-5">
                  <div className="text-sm font-medium text-[#111827] mb-3">Key findings</div>
                  {result.analysis.findings.slice(0, 3).map((finding, i) => {
                    const dotColor = finding.impact === 'high' ? '#dc2626' : finding.impact === 'medium' ? '#d97706' : '#16a34a';
                    return (
                      <div key={i} className={`flex items-start gap-2 py-2 ${i < 2 ? 'border-b border-[#f5f5f5]' : ''}`}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: dotColor }}></span>
                        <div className="text-xs text-[#444]">{finding.text}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/lawyers')}
                  className="btn-pill btn-blue"
                  data-testid="talk-to-lawyer-btn"
                >
                  Talk to a lawyer — $149
                </button>
                <button
                  onClick={() => navigate(`/cases/${result.case_id}`)}
                  className="btn-pill btn-outline"
                  data-testid="view-full-case-btn"
                >
                  View full case
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
