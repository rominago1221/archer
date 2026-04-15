import React, { useState } from 'react';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';

const URL_PATTERN = /^https:\/\/calendly\.com\/[\w\-]+\/[\w\-]+\/?$/;

export default function CalendlyIntegrationCard({ attorney, onChange }) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(attorney?.calendly_url || '');
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(null);
  const [error, setError] = useState(null);

  const isConnected = !!attorney?.calendly_url;

  const save = async () => {
    setError(null);
    setWarning(null);
    if (!URL_PATTERN.test(url.trim())) {
      setError('Format attendu : https://calendly.com/your-name/30min');
      return;
    }
    setSaving(true);
    try {
      await attorneyApi.post('/attorneys/calendly/connect', { calendly_url: url.trim() });
      // Non-blocking HEAD ping — warning only if 4xx, never blocks the save
      try {
        const r = await fetch(url.trim(), { method: 'HEAD', mode: 'no-cors' });
        // opaque response, can't read status; skip warning
      } catch {
        setWarning(
          "Impossible de vérifier l'URL depuis le navigateur (c'est normal, CORS). "
          + "Assurez-vous que le lien fonctionne en l'ouvrant directement."
        );
      }
      setEditing(false);
      onChange?.();
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Déconnecter Calendly ? Vous ne recevrez plus de Live Counsel.')) return;
    setSaving(true);
    try {
      await attorneyApi.post('/attorneys/calendly/disconnect');
      setUrl('');
      setEditing(false);
      onChange?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">📅</span>
        <h3 className="font-medium text-neutral-900">Calendly integration</h3>
      </div>

      {isConnected && !editing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-emerald-700">Connected</span>
          </div>
          <code className="block text-xs bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-neutral-700 break-all">
            {attorney.calendly_url}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEditing(true); setUrl(attorney.calendly_url); }}
              className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={disconnect}
              className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
            >
              Déconnecter
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendly.com/your-name/30min"
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
          {error && <div className="text-xs text-red-600">{error}</div>}
          {warning && <div className="text-xs text-amber-700">{warning}</div>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? '...' : 'Connecter'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(false); setUrl(attorney.calendly_url || ''); }}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      <details className="mt-5 text-xs text-neutral-600">
        <summary className="cursor-pointer font-medium text-neutral-700">How it works</summary>
        <ol className="mt-2 space-y-1 list-decimal list-inside">
          <li>Client pays €149 on Archer</li>
          <li>Client is redirected to your Calendly to pick a slot</li>
          <li>Daily.co room is auto-generated</li>
          <li>Reminders are sent 1h and 10min before the call</li>
          <li>You join the video call from Archer</li>
          <li>€149 paid out — €104.30 to you, rest to Archer + Stripe</li>
        </ol>
      </details>
    </div>
  );
}
