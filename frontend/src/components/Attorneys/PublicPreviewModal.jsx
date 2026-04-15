import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-medium text-neutral-900">{value}</div>
      <div className="text-[11px] tracking-widest uppercase text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

export default function PublicPreviewModal({ open, attorneyId, onClose }) {
  const { t } = useAttorneyT();
  const tx = t.public_preview || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !attorneyId) return;
    axios.get(`${API}/attorneys/${attorneyId}/public-profile`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.detail || 'Error'));
  }, [open, attorneyId]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} labelledBy="public-preview-title">
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        <h2 id="public-preview-title" className="text-lg font-serif text-neutral-900 mb-1">
          {tx.title || 'How clients see you'}
        </h2>
        <p className="text-xs text-neutral-500 mb-5">
          Fiche que les clients voient quand vous êtes leur avocat assigné.
        </p>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {!data && !error && <div className="text-sm text-neutral-500">Chargement...</div>}

        {data && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              {data.photo_url ? (
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL}${data.photo_url}`}
                  alt="" className="w-20 h-20 rounded-full object-cover border border-neutral-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xl font-medium">
                  {(data.first_name?.[0] || '?')}{(data.last_name?.[0] || '?')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-serif text-xl text-neutral-900">
                  {[data.title, data.first_name, data.last_name].filter(Boolean).join(' ')}
                </div>
                <div className="text-sm text-neutral-500">
                  {data.bar_jurisdiction || data.jurisdiction}
                  {data.bar_number && <> · #{data.bar_number}</>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 py-3 border-y border-neutral-200">
              <Stat
                value={data.years_of_experience ?? '—'}
                label={tx.experience || 'Years of experience'}
              />
              <Stat
                value={data.stats?.cases_handled ?? 0}
                label={tx.cases_handled || 'Cases handled'}
              />
              <Stat
                value={data.stats?.avg_rating ?? '—'}
                label="★★★★★"
              />
            </div>

            {data.specialties?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-neutral-600 mb-2">
                  {tx.specialties || 'Specialties'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.specialties.map((s) => (
                    <span key={s} className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.languages_spoken?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-neutral-600 mb-2">
                  {tx.languages || 'Languages'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.languages_spoken.map((l) => (
                    <span key={l} className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.bio_long && (
              <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                {data.bio_long}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="button" onClick={onClose}
            className="text-sm px-4 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
