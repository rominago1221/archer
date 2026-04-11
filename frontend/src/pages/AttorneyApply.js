import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Check, Loader2, Scale, DollarSign } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SPECIALTIES = [
  'Employment law', 'Tenant rights', 'Contract law', 'Debt collection',
  'Consumer protection', 'Family law', 'Immigration', 'Business law',
  'Real estate', 'Insurance disputes', 'Criminal defense', 'IP law'
];
const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const LANGUAGES = [
  { id: 'en', label: 'English' }, { id: 'fr', label: 'French' },
  { id: 'nl', label: 'Dutch' }, { id: 'de', label: 'German' }, { id: 'es', label: 'Spanish' }
];

const AttorneyApply = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '',
    bar_number: '', states_licensed: [], country: 'US',
    years_experience: '', law_school: '', graduation_year: '',
    specialties: [],
    bio: '', photo_url: null, languages: ['en'], linkedin_url: '',
    session_price: 149
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const toggleArray = (key, val) => setForm(p => ({
    ...p, [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val]
  }));

  const canNext = () => {
    if (step === 1) return form.full_name && form.email && form.phone && form.password.length >= 8;
    if (step === 2) return form.bar_number && form.states_licensed.length > 0 && form.years_experience;
    if (step === 3) return form.specialties.length > 0 && form.specialties.length <= 5;
    if (step === 4) return form.bio.length > 0 && form.bio.length <= 300;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/attorney/apply`, {
        ...form,
        years_experience: parseInt(form.years_experience),
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null
      }, { withCredentials: true });
      if (res.data.session_token) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Application failed. Please try again.');
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4" data-testid="attorney-apply-success">
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-[#f0fdf4] flex items-center justify-center mx-auto mb-4">
            <Check size={20} className="text-[#16a34a]" />
          </div>
          <h2 className="text-lg font-semibold text-[#111827] mb-2">Application received</h2>
          <p className="text-xs text-[#6b7280] mb-6">We'll review your application within 24 hours. You'll receive an email notification once approved.</p>
          <button onClick={() => navigate('/login')} className="px-5 py-2.5 rounded-lg bg-[#1a56db] text-white text-xs font-medium hover:bg-[#1546b3]">
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  const payout = Math.round(form.session_price * 0.80);
  const steps = ['Personal', 'Professional', 'Specialties', 'Profile', 'Pricing', 'Connect', 'Review'];

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4" data-testid="attorney-apply-page">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-[#111827] tracking-tight">Join Jasper as an Attorney</h1>
          <p className="text-xs text-[#6b7280] mt-1">Receive pre-qualified clients and grow your practice</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6 px-4">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-medium flex-shrink-0 ${i + 1 < step ? 'bg-[#16a34a] text-white' : i + 1 === step ? 'bg-[#1a56db] text-white' : 'bg-[#e5e5e5] text-[#999]'}`}>
                {i + 1 < step ? <Check size={10} /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i + 1 < step ? 'bg-[#16a34a]' : 'bg-[#e5e5e5]'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-2xl p-6">
          {error && <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2 text-[11px] text-[#dc2626] mb-4">{error}</div>}

          {/* Step 1: Personal */}
          {step === 1 && (
            <div className="space-y-3" data-testid="step-1">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Personal information</h3>
              <input className="form-input text-xs py-2.5" placeholder="Full legal name" value={form.full_name} onChange={e => set('full_name', e.target.value)} data-testid="input-full-name" />
              <input className="form-input text-xs py-2.5" type="email" placeholder="Email address" value={form.email} onChange={e => set('email', e.target.value)} data-testid="input-email" />
              <input className="form-input text-xs py-2.5" placeholder="Phone number" value={form.phone} onChange={e => set('phone', e.target.value)} data-testid="input-phone" />
              <input className="form-input text-xs py-2.5" type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={e => set('password', e.target.value)} data-testid="input-password" />
            </div>
          )}

          {/* Step 2: Professional */}
          {step === 2 && (
            <div className="space-y-3" data-testid="step-2">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Professional information</h3>
              <input className="form-input text-xs py-2.5" placeholder="Bar number" value={form.bar_number} onChange={e => set('bar_number', e.target.value)} data-testid="input-bar" />
              <div>
                <label className="text-[10px] font-medium text-[#555] mb-1 block">State(s) of licensure</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-[#e5e5e5] rounded-lg p-2">
                  {US_STATES.map(s => (
                    <button key={s} onClick={() => toggleArray('states_licensed', s)} type="button"
                      className={`px-2 py-1 rounded-full text-[9px] font-medium transition-colors ${form.states_licensed.includes(s) ? 'bg-[#1a56db] text-white' : 'bg-[#f5f5f5] text-[#555] hover:bg-[#eee]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className="form-input text-xs py-2.5" value={form.country} onChange={e => set('country', e.target.value)} data-testid="select-country">
                  <option value="US">United States</option><option value="BE">Belgium</option>
                </select>
                <input className="form-input text-xs py-2.5" type="number" placeholder="Years of experience" value={form.years_experience} onChange={e => set('years_experience', e.target.value)} data-testid="input-years" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="form-input text-xs py-2.5" placeholder="Law school" value={form.law_school} onChange={e => set('law_school', e.target.value)} />
                <input className="form-input text-xs py-2.5" type="number" placeholder="Graduation year" value={form.graduation_year} onChange={e => set('graduation_year', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3: Specialties */}
          {step === 3 && (
            <div data-testid="step-3">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-1">Specialties</h3>
              <p className="text-[10px] text-[#6b7280] mb-3">Select up to 5 practice areas ({form.specialties.length}/5)</p>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALTIES.map(s => (
                  <button key={s} onClick={() => { if (form.specialties.includes(s) || form.specialties.length < 5) toggleArray('specialties', s); }} type="button"
                    className={`px-3 py-2.5 rounded-lg text-[11px] font-medium text-left transition-all border ${form.specialties.includes(s) ? 'bg-[#eff6ff] border-[#1a56db] text-[#1a56db]' : 'bg-white border-[#e5e5e5] text-[#555] hover:border-[#bbb]'}`}
                    data-testid={`specialty-${s.replace(/\s/g, '-')}`}>
                    {form.specialties.includes(s) && <Check size={10} className="inline mr-1" />}{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Profile */}
          {step === 4 && (
            <div className="space-y-3" data-testid="step-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Profile setup</h3>
              <div>
                <label className="text-[10px] font-medium text-[#555] mb-1 block">Bio ({form.bio.length}/300 characters)</label>
                <textarea className="form-input text-xs py-2.5" rows={4} maxLength={300} placeholder="Tell clients about your experience..."
                  value={form.bio} onChange={e => set('bio', e.target.value)} data-testid="input-bio" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#555] mb-1 block">Languages spoken</label>
                <div className="flex gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l.id} onClick={() => toggleArray('languages', l.id)} type="button"
                      className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${form.languages.includes(l.id) ? 'bg-[#1a56db] text-white' : 'bg-[#f5f5f5] text-[#555]'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <input className="form-input text-xs py-2.5" placeholder="LinkedIn profile URL (optional)" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} />
            </div>
          )}

          {/* Step 5: Pricing */}
          {step === 5 && (
            <div data-testid="step-5">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-1">Set your session price</h3>
              <p className="text-[10px] text-[#6b7280] mb-5">Clients pay your rate directly. Jasper takes a 20% platform fee.</p>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-[#111827]">${form.session_price}</div>
                <div className="text-[11px] text-[#6b7280]">per 30-minute session</div>
              </div>
              <input type="range" min={149} max={500} step={1} value={form.session_price}
                onChange={e => set('session_price', parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#e5e5e5] rounded-full appearance-none cursor-pointer accent-[#1a56db]"
                data-testid="price-slider" />
              <div className="flex justify-between text-[9px] text-[#9ca3af] mt-1"><span>$149</span><span>$500</span></div>
              <div className="mt-4 p-3 bg-[#f0fdf4] border border-[#86efac] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-[#16a34a]" />
                  <span className="text-[12px] font-semibold text-[#16a34a]">You receive: ${payout}/session</span>
                </div>
                <span className="text-[10px] text-[#6b7280]">after Jasper's 20% fee</span>
              </div>
            </div>
          )}

          {/* Step 6: Stripe Connect */}
          {step === 6 && (
            <div className="text-center" data-testid="step-6">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-1">Connect your bank account</h3>
              <p className="text-[10px] text-[#6b7280] mb-5">Connect with Stripe to receive payments from client sessions.</p>
              <div className="inline-flex flex-col items-center gap-3 p-6 bg-[#f8f8f8] rounded-xl border border-[#ebebeb]">
                <Scale size={24} className="text-[#6b7280]" />
                <p className="text-[11px] text-[#6b7280]">Stripe Connect will be available after your application is approved.</p>
                <span className="text-[9px] px-3 py-1 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">Setup after approval</span>
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {step === 7 && (
            <div data-testid="step-7">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Review your application</h3>
              <div className="space-y-2 text-[11px]">
                <Row label="Name" val={form.full_name} /><Row label="Email" val={form.email} /><Row label="Phone" val={form.phone} />
                <Row label="Bar Number" val={form.bar_number} /><Row label="Licensed in" val={form.states_licensed.join(', ')} /><Row label="Country" val={form.country === 'US' ? 'United States' : 'Belgium'} />
                <Row label="Experience" val={`${form.years_experience} years`} /><Row label="Specialties" val={form.specialties.join(', ')} />
                <Row label="Session Price" val={`$${form.session_price} (you receive $${payout})`} /><Row label="Bio" val={form.bio} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#ebebeb]">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 text-[11px] text-[#6b7280] hover:text-[#111]"><ArrowLeft size={12} /> Back</button>
            ) : (
              <a href="/login" className="flex items-center gap-1 text-[11px] text-[#6b7280] hover:text-[#111]"><ArrowLeft size={12} /> Sign in instead</a>
            )}
            {step < 7 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1a56db] text-white text-[11px] font-medium hover:bg-[#1546b3] disabled:opacity-40"
                data-testid="next-step-btn">
                Next <ArrowRight size={12} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-1 px-5 py-2 rounded-lg bg-[#16a34a] text-white text-[11px] font-medium hover:bg-[#15803d] disabled:opacity-60"
                data-testid="submit-application-btn">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Submit application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, val }) => (
  <div className="flex gap-2"><span className="text-[#9ca3af] w-24 flex-shrink-0">{label}:</span><span className="text-[#333]">{val}</span></div>
);

export default AttorneyApply;
