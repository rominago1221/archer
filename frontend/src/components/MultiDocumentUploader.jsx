import React, { useCallback, useRef, useState } from 'react';

/**
 * Multi-file drag-and-drop uploader (Bug 2).
 *
 * Props:
 *   tier            : "free" | "paid"  (binary for now; refacto to 4 tiers later)
 *   onFilesSelected : (File[]) => void — fired when valid set is chosen
 *   maxFiles        : derived from tier
 *   maxBytesPerFile : derived from tier
 *   allowedFormats  : Set of extensions (without dot)
 *   language        : "fr" | "en"
 *
 * Validation is best-effort client-side (final source of truth = backend 402/413/400).
 */
const COPY = {
  fr: {
    drop_here: 'Déposez vos documents ici',
    or_browse: 'ou cliquez pour parcourir',
    formats: 'Formats acceptés',
    max_files: 'documents max',
    max_size: 'par fichier',
    selected: 'sélectionné(s)',
    remove: 'Retirer',
    too_many: 'Trop de documents. L\'upload multiple est réservé aux abonnés Protect.',
    too_many_paid_n: 'Maximum {n} documents par upload pour votre plan.',
    too_big: 'Le fichier "{name}" dépasse la limite de {mb} MB pour votre plan.',
    bad_format: 'Format non accepté pour "{name}". Formats autorisés : {formats}.',
    upgrade_link: 'Voir les plans →',
    add_more: 'Ajouter d\'autres documents',
  },
  en: {
    drop_here: 'Drop your documents here',
    or_browse: 'or click to browse',
    formats: 'Allowed formats',
    max_files: 'max documents',
    max_size: 'per file',
    selected: 'selected',
    remove: 'Remove',
    too_many: 'Too many documents. Multi-document upload is reserved for Protect subscribers.',
    too_many_paid_n: 'Maximum {n} documents per upload for your plan.',
    too_big: 'File "{name}" exceeds the {mb} MB limit for your plan.',
    bad_format: 'Format not allowed for "{name}". Allowed: {formats}.',
    upgrade_link: 'See plans →',
    add_more: 'Add more documents',
  },
};

function fmt(template, vars) {
  return Object.entries(vars || {}).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, v), template,
  );
}

function fileExt(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export default function MultiDocumentUploader({
  tier = 'free',
  maxFiles,
  maxBytesPerFile,
  allowedFormats,
  language = 'fr',
  onFilesSelected,
}) {
  const t = COPY[language] || COPY.en;
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const allowedSet = allowedFormats instanceof Set ? allowedFormats : new Set(allowedFormats || []);
  const formatsLabel = [...allowedSet].map((f) => `.${f}`).join(', ');
  const mbLabel = Math.round((maxBytesPerFile || 0) / (1024 * 1024));

  const validate = useCallback((incoming) => {
    setError(null);
    const list = Array.from(incoming || []);
    if (list.length === 0) return null;

    if (list.length > maxFiles) {
      if (tier === 'free') {
        setError({ kind: 'tier', message: t.too_many });
      } else {
        setError({ kind: 'count', message: fmt(t.too_many_paid_n, { n: maxFiles }) });
      }
      return null;
    }
    for (const f of list) {
      const ext = fileExt(f.name);
      if (!allowedSet.has(ext)) {
        setError({ kind: 'format', message: fmt(t.bad_format, { name: f.name, formats: formatsLabel }) });
        return null;
      }
      if (f.size > maxBytesPerFile) {
        setError({ kind: 'size', message: fmt(t.too_big, { name: f.name, mb: mbLabel }) });
        return null;
      }
    }
    return list;
  }, [tier, t, maxFiles, allowedSet, formatsLabel, maxBytesPerFile, mbLabel]);

  const handleSelection = (incoming) => {
    const merged = [...files, ...Array.from(incoming || [])];
    const validated = validate(merged);
    if (!validated) return;
    setFiles(validated);
    onFilesSelected && onFilesSelected(validated);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    handleSelection(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const removeFile = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    onFilesSelected && onFilesSelected(next);
    setError(null);
  };

  const accept = [...allowedSet].map((f) => `.${f}`).join(',');
  const showAddMore = files.length > 0 && files.length < maxFiles;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={t.drop_here}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`block w-full rounded-2xl border-2 border-dashed transition cursor-pointer p-10 text-center ${
          dragActive
            ? 'border-[#1a56db] bg-[#eff6ff]'
            : 'border-neutral-300 bg-white hover:border-neutral-500'
        }`}
        data-testid="multi-uploader"
      >
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={(e) => handleSelection(e.target.files)}
          className="hidden"
        />
        <div className="text-3xl mb-2">📎</div>
        <div className="text-sm font-medium text-neutral-900">{t.drop_here}</div>
        <div className="text-xs text-neutral-500 mt-1">{t.or_browse}</div>
        <div className="text-[11px] text-neutral-400 mt-3">
          {t.formats}: {formatsLabel} · {maxFiles} {t.max_files} · {mbLabel} MB {t.max_size}
        </div>
      </div>

      {error && (
        <div
          className="mt-3 rounded-lg p-3 text-sm bg-red-50 border border-red-200 text-red-800"
          role="alert"
        >
          {error.message}
          {error.kind === 'tier' && (
            <a href="/pricing" className="ml-2 underline font-medium">
              {t.upgrade_link}
            </a>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-neutral-600 mb-2">
            {files.length} {t.selected}
          </div>
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between bg-white border border-neutral-200 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-neutral-100 text-neutral-500 flex items-center justify-center text-xs font-mono">
                    .{fileExt(f.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-neutral-900 truncate">{f.name}</div>
                    <div className="text-[11px] text-neutral-500">
                      {Math.round(f.size / 1024)} KB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  {t.remove}
                </button>
              </li>
            ))}
          </ul>
          {showAddMore && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-3 text-sm text-[#1a56db] hover:underline"
            >
              + {t.add_more}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
