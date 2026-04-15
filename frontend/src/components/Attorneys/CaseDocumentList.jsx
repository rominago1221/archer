import React from 'react';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';

function FileIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export default function CaseDocumentList({ documents = [] }) {
  const openPreview = async (doc) => {
    try {
      const { data } = await attorneyApi.get(doc.preview_url, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      alert('Could not load document.');
    }
  };

  if (!documents.length) {
    return <div className="text-sm text-neutral-500 italic">No documents attached.</div>;
  }

  return (
    <ul className="space-y-2">
      {documents.map((d) => (
        <li
          key={d.id}
          className={`flex items-center gap-3 p-3 border rounded-lg ${
            d.is_locked ? 'bg-neutral-50 border-neutral-200' : 'bg-white border-neutral-200 hover:border-neutral-400'
          }`}
        >
          <div className="text-neutral-400 shrink-0"><FileIcon /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-neutral-900 truncate flex items-center gap-2">
              {d.name}
              {d.is_main && (
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                  Main
                </span>
              )}
            </div>
            <div className="text-xs text-neutral-500">
              {d.size_kb != null && `${d.size_kb} KB`}
              {d.pages != null && ` · ${d.pages} pages`}
            </div>
          </div>
          {d.is_locked ? (
            <span className="text-xs text-neutral-500 flex items-center" aria-label="Locked until acceptance">
              <LockIcon /> Locked
            </span>
          ) : (
            <button
              type="button"
              onClick={() => openPreview(d)}
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              aria-label={`Preview ${d.name}`}
            >
              Preview
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
