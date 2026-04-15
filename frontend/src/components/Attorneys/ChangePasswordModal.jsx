import React, { useState } from 'react';
import Modal from './Modal';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';

export default function ChangePasswordModal({ open, onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError(null);
    if (next.length < 12) {
      setError('Minimum 12 characters'); return;
    }
    if (next !== confirm) {
      setError('Les mots de passe ne correspondent pas'); return;
    }
    setBusy(true);
    try {
      await attorneyApi.post('/attorneys/profile/change-password', {
        current_password: current, new_password: next,
      });
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/attorneys/login';
      }, 1500);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} labelledBy="cp-title">
      <div className="p-6">
        <h2 id="cp-title" className="text-lg font-serif text-neutral-900 mb-1">
          Change password
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          You'll be logged out after the change on all devices.
        </p>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-900">
            ✓ Mot de passe modifié. Redirection...
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">
                  Current password
                </label>
                <input
                  type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">
                  New password (min 12 chars)
                </label>
                <input
                  type="password" value={next} onChange={(e) => setNext(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">
                  Confirm new password
                </label>
                <input
                  type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button" onClick={onClose} disabled={busy}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button" onClick={submit} disabled={busy}
                className="text-sm px-4 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {busy ? '...' : 'Change password'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
