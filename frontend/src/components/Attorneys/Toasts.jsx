import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    const t = { id, kind: 'info', duration: 3500, ...toast };
    setToasts((xs) => [...xs, t]);
    if (t.duration) {
      setTimeout(() => {
        setToasts((xs) => xs.filter((x) => x.id !== id));
      }, t.duration);
    }
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((xs) => xs.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm"
      >
        {toasts.map((t) => {
          const colors =
            t.kind === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
            t.kind === 'error' ? 'bg-red-50 border-red-300 text-red-900' :
            t.kind === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' :
            'bg-white border-neutral-200 text-neutral-900';
          return (
            <div key={t.id} className={`border rounded-lg px-4 py-3 shadow-sm text-sm ${colors}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">{t.message}</div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="opacity-50 hover:opacity-100"
                  aria-label="Dismiss"
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Fallback no-op if used outside provider (e.g. during SSR)
    return { push: () => {}, dismiss: () => {} };
  }
  return ctx;
}
