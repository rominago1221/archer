import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';
import SpecialtyPicker from '../../components/Attorneys/SpecialtyPicker';

const BAR_ASSOCIATIONS = [
  { value: 'ohgb_be', label: 'OHGB (Bruxelles, BE)' },
  { value: 'ovb_be', label: 'OVB (Flandres, BE)' },
  { value: 'obfg_be', label: 'OBFG (Wallonie, BE)' },
  { value: 'nysba_us', label: 'NYSBA (New York, US)' },
  { value: 'calbar_us', label: 'CalBar (California, US)' },
  { value: 'other', label: 'Other' },
];

export default function AttorneyJoin() {
  const { t } = useAttorneyT();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const code = params.get('code');

  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState(null);

  const [form, setForm] = useState({
    password: '', passwordConfirm: '',
    bar_association: 'ohgb_be', bar_number: '', year_admitted: new Date().getFullYear() - 5,
    jurisdiction: 'BE',
    specialties: [], bio: '',
  });

  useEffect(() => {
    if (!code) { setInviteError('not_found'); return; }
    attorneyApi.get(`/attorneys/invitation/${encodeURIComponent(code)}`)
      .then((r) => setInvite(r.data))
      .catch((e) => setInviteError(e.response?.data?.error || 'not_found'));
  }, [code]);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validateStep = () => {
    setFormError(null);
    if (step === 1) {
      if (!form.password || form.password.length < 8) return (setFormError(t.join.passwordTooShort), false);
      if (form.password !== form.passwordConfirm) return (setFormError(t.join.passwordMismatch), false);
    }
    if (step === 3) {
      if (form.specialties.length < 1 || form.specialties.length > 3)
        return (setFormError(t.join.specialtiesLimit), false);
      if (form.bio && form.bio.length > 240) return (setFormError(t.join.bioTooLong), false);
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    setFormError(null);
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      await attorneyApi.post('/attorneys/join', {
        invitation_code: code,
        password: form.password,
        bar_association: form.bar_association,
        bar_number: form.bar_number,
        year_admitted: parseInt(form.year_admitted, 10),
        jurisdiction: form.jurisdiction,
        specialties: form.specialties,
        bio: form.bio || null,
      });
      setDone(true);
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-lg mb-2">
            {inviteError === 'expired' ? t.join.inviteExpired :
             inviteError === 'used' ? t.join.inviteUsed : t.join.inviteInvalid}
          </div>
          <a href="mailto:romain@archer.legal" className="text-sm underline text-neutral-700">
            {t.join.requestInvite}
          </a>
        </div>
      </div>
    );
  }
  if (!invite) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">{t.join.checkingInvite}</div>;
  }
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md text-center bg-white border border-neutral-200 rounded-xl p-8">
          <div className="text-2xl font-serif text-neutral-900 mb-3">{t.join.successTitle}</div>
          <p className="text-sm text-neutral-600 mb-6">{t.join.successBody}</p>
          <button onClick={() => nav('/attorneys/login')} className="bg-neutral-900 text-white px-4 py-2 rounded-md text-sm">
            {t.join.goToLogin}
          </button>
        </div>
      </div>
    );
  }

  const stepLabels = [t.join.step1, t.join.step2, t.join.step3, t.join.step4];

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white border border-neutral-200 rounded-xl p-8">
        <div className="mb-6">
          <div className="font-serif text-2xl text-neutral-900">{t.join.title}</div>
          <div className="flex gap-2 mt-4">
            {stepLabels.map((lbl, i) => (
              <div key={i} className={`flex-1 text-center text-[11px] py-2 rounded-md ${
                step === i + 1 ? 'bg-neutral-900 text-white' :
                step > i + 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
              }`}>
                {i + 1}. {lbl}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Field label={t.join.firstName} value={invite.first_name || ''} readOnly />
            <Field label={t.join.lastName} value={invite.last_name || ''} readOnly />
            <Field label={t.join.email} value={invite.email} readOnly />
            <Field label={t.join.password} type="password" value={form.password} onChange={(v) => upd('password', v)} />
            <Field label={t.join.passwordConfirm} type="password" value={form.passwordConfirm} onChange={(v) => upd('passwordConfirm', v)} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-600">{t.join.barAssociation}</label>
              <select
                value={form.bar_association} onChange={(e) => upd('bar_association', e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              >
                {BAR_ASSOCIATIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <Field label={t.join.barNumber} value={form.bar_number} onChange={(v) => upd('bar_number', v)} />
            <Field label={t.join.yearAdmitted} type="number" value={form.year_admitted} onChange={(v) => upd('year_admitted', v)} />
            <div>
              <label className="text-xs font-medium text-neutral-600">{t.join.jurisdiction}</label>
              <select
                value={form.jurisdiction} onChange={(e) => upd('jurisdiction', e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="BE">Belgium</option>
                <option value="US">United States</option>
              </select>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-600">{t.join.specialties}</label>
              <div className="mt-2">
                <SpecialtyPicker value={form.specialties} onChange={(v) => upd('specialties', v)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600">{t.join.bio}</label>
              <textarea
                rows={4} maxLength={240} value={form.bio}
                onChange={(e) => upd('bio', e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              />
              <div className="text-[11px] text-neutral-400 mt-1">{form.bio.length}/240</div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3 text-sm">
            <Summary label={t.join.email} value={invite.email} />
            <Summary label={t.join.barAssociation} value={BAR_ASSOCIATIONS.find(b => b.value === form.bar_association)?.label} />
            <Summary label={t.join.barNumber} value={form.bar_number} />
            <Summary label={t.join.yearAdmitted} value={form.year_admitted} />
            <Summary label={t.join.jurisdiction} value={form.jurisdiction} />
            <Summary label={t.join.specialties} value={form.specialties.map(s => t.specialties[s]).join(', ')} />
            <Summary label={t.join.bio} value={form.bio || '—'} />
          </div>
        )}

        {formError && <div className="text-sm text-red-600 mt-4">{formError}</div>}

        <div className="flex justify-between mt-6">
          <button type="button" onClick={prev} disabled={step === 1}
            className="text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-30">
            {t.join.previous}
          </button>
          {step < 4 ? (
            <button type="button" onClick={next}
              className="bg-neutral-900 text-white px-4 py-2 rounded-md text-sm">
              {t.join.next}
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting}
              className="bg-neutral-900 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
              {submitting ? t.join.submitting : t.join.submit}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', readOnly = false }) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-600">{label}</label>
      <input
        type={type} value={value} readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 text-sm ${
          readOnly ? 'bg-neutral-100 text-neutral-500' : ''
        }`}
      />
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="flex border-b border-neutral-100 py-2">
      <div className="text-neutral-500 w-1/3">{label}</div>
      <div className="text-neutral-900 flex-1">{String(value || '—')}</div>
    </div>
  );
}
