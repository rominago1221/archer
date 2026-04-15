import React from 'react';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16v16H4z" /><path d="M22 6l-10 7L2 6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92V21a1 1 0 01-1.11 1 19.78 19.78 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.78 19.78 0 013.19 4.11 1 1 0 014.18 3h4.09a1 1 0 011 .75l1 4a1 1 0 01-.29 1L8.21 10.21a16 16 0 006 6l1.41-1.79a1 1 0 011-.29l4 1a1 1 0 01.75 1z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function CaseClientCard({ client }) {
  const { t } = useAttorneyT();
  if (!client) return null;

  if (client.anonymized) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-5">
        <div className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
          {t.case?.client_card_title || 'Client'}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
          {t.case?.anonymized_warning ||
            'Client identity is anonymized until you accept the case. Once accepted, attorney-client privilege applies.'}
        </div>
        <dl className="mt-3 space-y-1 text-sm text-neutral-400">
          <div className="flex items-center gap-2"><MailIcon /><span>— — —</span></div>
          <div className="flex items-center gap-2"><PhoneIcon /><span>— — —</span></div>
          <div className="flex items-center gap-2"><PinIcon /><span>— — —</span></div>
        </dl>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5">
      <div className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
        {t.case?.client_card_title || 'Client'}
      </div>
      <div className="text-base font-medium text-neutral-900 mb-2">
        {[client.first_name, client.last_name].filter(Boolean).join(' ') || '—'}
      </div>
      <dl className="space-y-1.5 text-sm">
        {client.email && (
          <div className="flex items-center gap-2 text-neutral-700">
            <MailIcon />
            <a href={`mailto:${client.email}`} className="truncate hover:text-neutral-900">{client.email}</a>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-neutral-700">
            <PhoneIcon />
            <a href={`tel:${client.phone.replace(/\s+/g, '')}`} className="hover:text-neutral-900">
              {client.phone}
            </a>
          </div>
        )}
        {client.full_address && (
          <div className="flex items-start gap-2 text-neutral-700">
            <div className="mt-0.5"><PinIcon /></div>
            <span>{client.full_address}</span>
          </div>
        )}
      </dl>
    </div>
  );
}
