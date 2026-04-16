import React, { useState } from 'react';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';
import { useStripeConnect } from '../../hooks/attorneys/useStripeConnect';
import SpecialtyPicker from './SpecialtyPicker';

const ALL_LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

const CALENDLY_PATTERN = /^https:\/\/calendly\.com\/[\w\-]+\/[\w\-]+\/?$/;

// -------------------------------------------------------------------------
// Field — simple labeled input/select wrapper
// -------------------------------------------------------------------------
function Field({ label, children, hint, disabled }) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-600 block mb-1">{label}</label>
      {children}
      {hint && <div className={`text-[11px] mt-1 ${disabled ? 'text-neutral-400' : 'text-neutral-500'}`}>{hint}</div>}
    </div>
  );
}

function Section({ title, icon, children, tone }) {
  const border = tone === 'danger' ? 'border-red-200 bg-red-50'
    : tone === 'warning' ? 'border-amber-200 bg-amber-50'
    : tone === 'success' ? 'border-emerald-200 bg-emerald-50'
    : 'border-neutral-200 bg-white';
  return (
    <section className={`border ${border} rounded-lg p-5`}>
      <h3 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-4">
        {icon && <span className="mr-1">{icon}</span>}{title}
      </h3>
      {children}
    </section>
  );
}

// -------------------------------------------------------------------------
// IdentitySection
// -------------------------------------------------------------------------
export function IdentitySection({ profile, onChange }) {
  const { t } = useAttorneyT();
  const p = profile || {};
  const tx = t.profile || {};
  return (
    <Section title={tx.identity || 'Identity'}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={tx.title_field || 'Title'}>
          <select
            value={p.title || ''} onChange={(e) => onChange('title', e.target.value || null)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="Maître">Maître</option>
            <option value="Esq.">Esq.</option>
          </select>
        </Field>
        <Field label={tx.years_experience || 'Years of experience'}>
          <input
            type="number" value={p.years_of_experience ?? ''}
            onChange={(e) => onChange('years_of_experience', e.target.value ? parseInt(e.target.value, 10) : null)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
        </Field>
        <Field label={tx.first_name || 'First name'}>
          <input
            value={p.first_name || ''} onChange={(e) => onChange('first_name', e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
        </Field>
        <Field label={tx.last_name || 'Last name'}>
          <input
            value={p.last_name || ''} onChange={(e) => onChange('last_name', e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
        </Field>
        <Field label={tx.email || 'Email'} hint={tx.email_hint || 'Contactez le support pour changer'} disabled>
          <input
            value={p.email || ''} disabled
            className="w-full border border-neutral-200 bg-neutral-50 rounded-md px-3 py-2 text-sm text-neutral-500"
          />
        </Field>
        <Field label={tx.phone || 'Phone'}>
          <input
            value={p.phone || ''} onChange={(e) => onChange('phone', e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
        </Field>
        <Field label={tx.bar_number || 'Bar number'} hint={tx.bar_hint || 'Read-only — vérifié par Archer'} disabled>
          <input
            value={p.bar_number || ''} disabled
            className="w-full border border-neutral-200 bg-neutral-50 rounded-md px-3 py-2 text-sm text-neutral-500 font-mono"
          />
        </Field>
        <Field label={tx.bar_jurisdiction || 'Bar'} disabled>
          <input
            value={p.bar_jurisdiction || p.jurisdiction || ''} disabled
            className="w-full border border-neutral-200 bg-neutral-50 rounded-md px-3 py-2 text-sm text-neutral-500"
          />
        </Field>
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------------
// SpecialtiesSection
// -------------------------------------------------------------------------
export function SpecialtiesSection({ profile, onChange }) {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  const specialties = profile?.specialties || [];
  const languages = profile?.languages_spoken || [];

  const toggleLang = (v) => {
    onChange('languages_spoken', languages.includes(v)
      ? languages.filter((x) => x !== v)
      : [...languages, v]);
  };

  return (
    <Section title={tx.specialties || 'Specialties'}>
      <SpecialtyPicker value={specialties} onChange={(v) => onChange('specialties', v)} max={3} />
      <div className="mt-6">
        <div className="text-xs font-medium text-neutral-600 mb-2">
          {tx.languages || 'Languages spoken'}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_LANGUAGES.map((l) => {
            const active = languages.includes(l.value);
            return (
              <button
                key={l.value} type="button"
                onClick={() => toggleLang(l.value)}
                className={`px-3 py-1.5 rounded-full border text-sm ${
                  active
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------------
// BioSection
// -------------------------------------------------------------------------
export function BioSection({ profile, onChange }) {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  const p = profile || {};
  return (
    <Section title={tx.bio_short || 'Bio'}>
      <Field label={tx.bio_short || 'Short bio'}>
        <input
          value={p.bio_short || ''}
          onChange={(e) => onChange('bio_short', e.target.value)}
          maxLength={200}
          placeholder="Avocat spécialisé en droit du logement à Bruxelles depuis 12 ans"
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
        />
        <div className="text-[11px] text-neutral-400 mt-1 text-right">
          {(p.bio_short || '').length}/200
        </div>
      </Field>
      <div className="mt-4">
        <Field label={tx.bio_long || 'Detailed bio'}>
          <textarea
            value={p.bio_long || ''} onChange={(e) => onChange('bio_long', e.target.value)}
            rows={6} maxLength={2000}
            placeholder="Décrivez votre parcours, vos spécialités, votre approche..."
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
        </Field>
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------------
// PhotoSection
// -------------------------------------------------------------------------
export function PhotoSection({ profile, onChange }) {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo trop lourde (max 5 MB)'); return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await attorneyApi.post('/attorneys/profile/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange && onChange();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer la photo ?')) return;
    await attorneyApi.delete('/attorneys/profile/photo');
    onChange && onChange();
  };

  const photoSrc = profile?.photo_url
    ? `${process.env.REACT_APP_BACKEND_URL}${profile.photo_url}?v=${Date.now()}`
    : null;

  const initials = `${(profile?.first_name?.[0] || '?')}${(profile?.last_name?.[0] || '?')}`.toUpperCase();

  return (
    <Section title={tx.photo || 'Profile photo'}>
      <div className="flex items-center gap-4">
        {photoSrc ? (
          <img src={photoSrc} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-neutral-200" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xl font-medium">
            {initials}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center justify-center text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer">
            {uploading ? '...' : (tx.upload_photo || 'Upload photo')}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} hidden />
          </label>
          {profile?.photo_url && (
            <button
              type="button" onClick={handleDelete}
              className="text-sm px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
            >
              {tx.delete_photo || 'Delete'}
            </button>
          )}
        </div>
      </div>
      <div className="text-[11px] text-neutral-500 mt-2">
        JPEG, PNG or WebP · Max 5 MB · Visible côté client
      </div>
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </Section>
  );
}

// -------------------------------------------------------------------------
// CalendlyProfileSection
// -------------------------------------------------------------------------
export function CalendlyProfileSection({ profile, onRefresh }) {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  const [url, setUrl] = useState(profile?.calendly_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setError(null);
    if (!CALENDLY_PATTERN.test(url.trim())) {
      setError('Format attendu : https://calendly.com/your-name/30min');
      return;
    }
    setSaving(true);
    try {
      await attorneyApi.post('/attorneys/calendly/connect', { calendly_url: url.trim() });
      onRefresh?.();
    } catch (e) {
      setError(e.response?.data?.detail || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Déconnecter Calendly ?')) return;
    await attorneyApi.post('/attorneys/calendly/disconnect');
    setUrl('');
    onRefresh?.();
  };

  return (
    <Section title={tx.calendly_section || 'Calendly'} icon="📅">
      <Field label={tx.calendly_url || 'Calendly URL'}>
        <input
          type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder={tx.calendly_placeholder || 'https://calendly.com/your-name/30min'}
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
        />
      </Field>
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
      <div className="flex gap-2 mt-3">
        <button
          type="button" onClick={save} disabled={saving}
          className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? '...' : (profile?.calendly_url ? 'Update' : 'Connect')}
        </button>
        {profile?.calendly_url && (
          <button
            type="button" onClick={disconnect}
            className="text-sm px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
          >
            Disconnect
          </button>
        )}
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------------
// StripeProfileSection
// -------------------------------------------------------------------------
export function StripeProfileSection({ profile }) {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  const { openStripeDashboard } = useStripeConnect();

  if (!profile?.stripe_onboarding_completed) {
    return (
      <Section title={tx.stripe_section || 'Stripe Connect'} icon="⚠️" tone="warning">
        <p className="text-sm text-amber-900 mb-3">
          Configuration Stripe requise pour recevoir des dossiers et être payé.
        </p>
        <a
          href="/attorneys/onboarding/stripe"
          className="inline-block text-sm px-3 py-1.5 rounded-md bg-[#635bff] text-white hover:opacity-90"
        >
          Configurer maintenant →
        </a>
      </Section>
    );
  }

  return (
    <Section title={tx.stripe_section || 'Stripe Connect'} icon="✓" tone="success">
      <p className="text-sm text-emerald-900 mb-2">
        {tx.stripe_verified || 'Compte vérifié et actif'}
      </p>
      {profile.stripe_iban_last4 && (
        <div className="text-xs text-emerald-700 mb-3">
          IBAN ···{profile.stripe_iban_last4}
        </div>
      )}
      <button
        type="button" onClick={openStripeDashboard}
        className="text-sm px-3 py-1.5 rounded-md border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
      >
        {tx.manage_stripe || 'Manage in Stripe'} →
      </button>
    </Section>
  );
}

// -------------------------------------------------------------------------
// NotificationsSection
// -------------------------------------------------------------------------
export function NotificationsSection({ profile, onChange }) {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  const n = profile?.email_notifications || {};

  const rows = [
    ['new_case', 'notify_new_case', tx.notify_new_case || 'New case assigned'],
    ['case_expiring', 'notify_case_expiring', tx.notify_case_expiring || 'Case expiring soon'],
    ['live_counsel', 'notify_live_counsel', tx.notify_live_counsel || 'Live Counsel reminders'],
    ['weekly_payout', 'notify_weekly_payout', tx.notify_weekly_payout || 'Weekly payouts'],
    ['marketing', 'notify_marketing', tx.notify_marketing || 'Archer news (optional)'],
  ];

  return (
    <Section title={tx.notifications_section || 'Email notifications'} icon="🔔">
      <div className="space-y-2">
        {rows.map(([uiKey, backendKey, label]) => (
          <label key={uiKey} className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={!!n[uiKey]}
              onChange={(e) => onChange(backendKey, e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-neutral-800">{label}</span>
          </label>
        ))}
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------------
// AccountSection (language toggle + password change trigger)
// -------------------------------------------------------------------------
export function AccountSection({ profile, onChange, onChangePassword }) {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  return (
    <Section title={tx.account_section || 'Account'} icon="⚙️">
      <div className="space-y-4">
        <Field label={tx.preferred_language || 'Preferred language'}>
          <select
            value={profile?.preferred_language || 'fr'}
            onChange={(e) => onChange('preferred_language', e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </Field>
        <button
          type="button" onClick={onChangePassword}
          className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
        >
          {tx.change_password || 'Change password'}
        </button>
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------------
// DangerZone
// -------------------------------------------------------------------------
export function DangerZone() {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleDeactivate = async () => {
    if (!window.confirm(tx.deactivate_warning ||
      'Vous ne recevrez plus de nouveaux cas. Continuer ?')) return;
    if (!window.confirm('Confirmer la désactivation ?')) return;
    setBusy(true);
    setError(null);
    try {
      await attorneyApi.post('/attorneys/account/deactivate');
      window.location.href = '/attorneys/login';
    } catch (e) {
      setError(e.response?.data?.detail || 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title={tx.danger_zone || 'Danger zone'} icon="⚠️" tone="danger">
      <p className="text-sm text-red-900 mb-3">
        {tx.deactivate_warning ||
          "Vous ne recevrez plus de nouveaux cas. Vos cas en cours doivent être terminés ou réassignés par le support."}
      </p>
      {error && <div className="text-xs text-red-800 bg-red-100 rounded p-2 mb-3">{error}</div>}
      <button
        type="button" onClick={handleDeactivate} disabled={busy}
        className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? '...' : (tx.deactivate_account || 'Deactivate my account')}
      </button>
    </Section>
  );
}
