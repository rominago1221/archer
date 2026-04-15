import React, { useCallback, useRef, useState } from 'react';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

const MAX_BYTES = 10 * 1024 * 1024;

function FileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
    </svg>
  );
}

export default function UploadSignedLetter({ disabled, onUpload, uploaded, onToast }) {
  const { t } = useAttorneyT();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const validate = (f) => {
    setError(null);
    if (!f) return false;
    const isPdf = (f.type || '').toLowerCase() === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError(t.upload_letter?.error_format || 'Only PDF files are accepted');
      return false;
    }
    if (f.size > MAX_BYTES) {
      setError(t.upload_letter?.error_size || 'File too large (max 10 MB)');
      return false;
    }
    return true;
  };

  const handleFiles = (files) => {
    const f = files?.[0];
    if (validate(f)) setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled || busy) return;
    handleFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, busy]);

  const doUpload = async () => {
    if (!file) return;
    setBusy(true); setProgress(0);
    try {
      await onUpload(file, {
        onProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      onToast?.({ kind: 'success', message: t.upload_letter?.success });
      setFile(null);
    } catch (e) {
      const msg = e.response?.data?.detail || 'Upload failed';
      setError(msg);
      onToast?.({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  if (uploaded) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 flex items-center gap-3">
        <div className="text-emerald-600"><FileIcon /></div>
        <div className="flex-1">
          <div className="text-sm font-medium text-emerald-900">
            {t.upload_letter?.success || 'Letter uploaded successfully.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={t.upload_letter?.title || 'Upload signed letter'}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled && !busy) inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !busy) setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          disabled
            ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60'
            : dragActive
              ? 'border-neutral-900 bg-neutral-50'
              : 'border-neutral-300 hover:border-neutral-500 bg-white'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-neutral-400 mb-2 flex justify-center"><FileIcon /></div>
        <div className="text-sm text-neutral-700 font-medium">
          {dragActive ? (t.upload_letter?.drag_active || 'Drop the file here')
                      : (t.upload_letter?.title || 'Upload signed letter')}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          {t.upload_letter?.subtitle || 'Drag & drop or browse · PDF only, max 10 MB'}
        </div>
      </div>

      {file && (
        <div className="mt-3 bg-white border border-neutral-200 rounded-lg p-3 flex items-center gap-3">
          <div className="text-neutral-400"><FileIcon /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-neutral-900 truncate">{file.name}</div>
            <div className="text-xs text-neutral-500">{Math.round(file.size / 1024)} KB</div>
            {busy && (
              <div className="mt-1 h-1 bg-neutral-100 rounded">
                <div className="h-1 bg-neutral-900 rounded transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          {!busy && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-xs text-neutral-500 hover:text-neutral-900"
            >
              {t.upload_letter?.delete_btn || 'Replace file'}
            </button>
          )}
          <button
            type="button"
            onClick={doUpload}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? (t.upload_letter?.uploading || 'Uploading...') : 'Upload'}
          </button>
        </div>
      )}

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
}
