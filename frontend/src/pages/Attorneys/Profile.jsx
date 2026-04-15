import React, { useState } from 'react';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import {
  IdentitySection, SpecialtiesSection, BioSection, PhotoSection,
  CalendlyProfileSection, StripeProfileSection, NotificationsSection,
  AccountSection, DangerZone,
} from '../../components/Attorneys/ProfileSections';
import ChangePasswordModal from '../../components/Attorneys/ChangePasswordModal';
import PublicPreviewModal from '../../components/Attorneys/PublicPreviewModal';
import { useAttorneyProfile } from '../../hooks/attorneys/useAttorneyProfile';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';
import { useToast } from '../../components/Attorneys/Toasts';

// Track local unsaved changes, flush on "Save changes"
export default function Profile() {
  const { t } = useAttorneyT();
  const tx = t.profile || {};
  const { profile, loading, error, patch, refetch } = useAttorneyProfile();
  const [pending, setPending] = useState({});
  const [saving, setSaving] = useState(false);
  const [cpOpen, setCpOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const toast = useToast();

  const merged = { ...(profile || {}), ...pending };
  if (pending.notify_new_case !== undefined ||
      pending.notify_case_expiring !== undefined ||
      pending.notify_live_counsel !== undefined ||
      pending.notify_weekly_payout !== undefined ||
      pending.notify_marketing !== undefined) {
    merged.email_notifications = {
      ...(profile?.email_notifications || {}),
      ...(pending.notify_new_case !== undefined && { new_case: pending.notify_new_case }),
      ...(pending.notify_case_expiring !== undefined && { case_expiring: pending.notify_case_expiring }),
      ...(pending.notify_live_counsel !== undefined && { live_counsel: pending.notify_live_counsel }),
      ...(pending.notify_weekly_payout !== undefined && { weekly_payout: pending.notify_weekly_payout }),
      ...(pending.notify_marketing !== undefined && { marketing: pending.notify_marketing }),
    };
  }

  const hasChanges = Object.keys(pending).length > 0;

  const onChange = (field, value) => {
    setPending((p) => ({ ...p, [field]: value }));
  };

  const saveAll = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await patch(pending);
      // If preferred_language changed, update localStorage for immediate UI switch
      if (pending.preferred_language) {
        localStorage.setItem('ui_language', pending.preferred_language);
      }
      setPending({});
      toast.push({ kind: 'success', message: 'Profil enregistré ✓' });
      if (pending.preferred_language) {
        // Reload once so useAttorneyT picks up the new language
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (e) {
      toast.push({ kind: 'error', message: e.response?.data?.detail || 'Error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <AttorneyLayout>
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-neutral-200 rounded" />
          <div className="h-48 bg-neutral-200 rounded" />
        </div>
      </AttorneyLayout>
    );
  }

  if (error) return <AttorneyLayout><div className="text-red-600">{error}</div></AttorneyLayout>;

  return (
    <AttorneyLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl text-neutral-900">
              {tx.title || 'Attorney profile'}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {tx.subtitle || 'Your professional information and preferences'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button" onClick={() => setPreviewOpen(true)}
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            >
              👁 {tx.preview_public || 'Preview public'}
            </button>
            <button
              type="button" onClick={saveAll} disabled={!hasChanges || saving}
              className="text-sm px-4 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? '...' : (tx.save_changes || 'Save changes')}
              {hasChanges && !saving && <span className="ml-1.5 text-[10px] opacity-80">({Object.keys(pending).length})</span>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2"><IdentitySection profile={merged} onChange={onChange} /></div>
          <SpecialtiesSection profile={merged} onChange={onChange} />
          <PhotoSection profile={merged} onChange={refetch} />
          <div className="lg:col-span-2"><BioSection profile={merged} onChange={onChange} /></div>
          <CalendlyProfileSection profile={merged} onRefresh={refetch} />
          <StripeProfileSection profile={merged} />
          <NotificationsSection profile={merged} onChange={onChange} />
          <AccountSection profile={merged} onChange={onChange} onChangePassword={() => setCpOpen(true)} />
          <div className="lg:col-span-2"><DangerZone /></div>
        </div>
      </div>

      <ChangePasswordModal open={cpOpen} onClose={() => setCpOpen(false)} />
      <PublicPreviewModal
        open={previewOpen}
        attorneyId={profile.id}
        onClose={() => setPreviewOpen(false)}
      />
    </AttorneyLayout>
  );
}
