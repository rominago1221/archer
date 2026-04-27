import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoredLocale, setStoredLocale } from '../data/landingTranslations';

const localeToSignup = {
  'us-en': { country: 'US', region: '', language: 'en' },
  'us-es': { country: 'US', region: '', language: 'es' },
  'be-fr': { country: 'BE', region: '', language: 'fr' },
  'be-nl': { country: 'BE', region: '', language: 'nl' },
  'be-de': { country: 'BE', region: '', language: 'de' },
  'be-en': { country: 'BE', region: '', language: 'en' },
};

// ─── i18n copy ────────────────────────────────────────────────────────────
// Mirror du pattern de PublicHeader.jsx: object indexé par code langue
// court ('fr' | 'nl' | 'en'), avec fr en fallback.
const COPY = {
  fr: {
    title: 'Créer votre compte',
    tagline: 'Protection juridique nouvelle génération',
    fullName: 'Nom complet',
    fullNamePlaceholder: 'Jean Dupont',
    email: 'Email',
    emailPlaceholder: 'vous@exemple.com',
    password: 'Mot de passe',
    passwordPlaceholder: 'Min. 8 caractères',
    jurisdiction: 'Juridiction applicable',
    interfaceLanguage: "Langue de l'interface",
    region: 'Région',
    regionPlaceholder: '-- Choisissez votre région --',
    beNote: 'Archer Belgique : analyse juridique adaptée au droit fédéral et régional belge.',
    choosePlan: 'Choisissez votre plan',
    perMonth: '/ mois',
    createAccount: 'Créer mon compte',
    orContinueWith: 'ou continuer avec',
    continueGoogle: 'Continuer avec Google',
    continueApple: 'Continuer avec Apple',
    continueFacebook: 'Continuer avec Facebook',
    haveAccount: 'Vous avez déjà un compte ?',
    signIn: 'Se connecter',
    err_name: 'Veuillez entrer votre nom complet',
    err_email: 'Veuillez entrer votre email',
    err_password: 'Le mot de passe doit contenir au moins 8 caractères',
    err_region: 'Veuillez sélectionner votre région',
  },
  nl: {
    title: 'Maak uw account aan',
    tagline: 'Juridische bescherming, nieuwe generatie',
    fullName: 'Volledige naam',
    fullNamePlaceholder: 'Jan Janssens',
    email: 'E-mail',
    emailPlaceholder: 'u@voorbeeld.com',
    password: 'Wachtwoord',
    passwordPlaceholder: 'Min. 8 tekens',
    jurisdiction: 'Toepasselijk recht',
    interfaceLanguage: 'Interfacetaal',
    region: 'Regio',
    regionPlaceholder: '-- Kies uw regio --',
    beNote: 'Archer België: juridische analyse aangepast aan het Belgische federale en regionale recht.',
    choosePlan: 'Kies uw abonnement',
    perMonth: '/ maand',
    createAccount: 'Account aanmaken',
    orContinueWith: 'of doorgaan met',
    continueGoogle: 'Doorgaan met Google',
    continueApple: 'Doorgaan met Apple',
    continueFacebook: 'Doorgaan met Facebook',
    haveAccount: 'Heeft u al een account?',
    signIn: 'Inloggen',
    err_name: 'Vul uw volledige naam in',
    err_email: 'Vul uw e-mailadres in',
    err_password: 'Wachtwoord moet minimaal 8 tekens bevatten',
    err_region: 'Selecteer uw regio',
  },
  en: {
    title: 'Create your account',
    tagline: 'Next-generation legal protection',
    fullName: 'Full name',
    fullNamePlaceholder: 'Jane Doe',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: 'Min. 8 characters',
    jurisdiction: 'Legal jurisdiction',
    interfaceLanguage: 'Interface language',
    region: 'Region',
    regionPlaceholder: '-- Choose your region --',
    beNote: 'Archer Belgium: legal analysis adapted to Belgian federal and regional law.',
    choosePlan: 'Choose your plan',
    perMonth: '/ month',
    createAccount: 'Create account',
    orContinueWith: 'or continue with',
    continueGoogle: 'Continue with Google',
    continueApple: 'Continue with Apple',
    continueFacebook: 'Continue with Facebook',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    err_name: 'Please enter your full name',
    err_email: 'Please enter your email',
    err_password: 'Password must be at least 8 characters',
    err_region: 'Please select your region',
  },
};

// 4 tiers v8 — same IDs across languages, prices in EUR.
const PLAN_TIERS = [
  { id: 'free',  name: 'Free',  price: '0 €',      sub: 'Pour découvrir' },
  { id: 'solo',  name: 'Solo',  price: '29,99 €',  sub: '1 dossier actif' },
  { id: 'plus',  name: 'Plus',  price: '59 €',     sub: 'Multi-dossiers' },
  { id: 'elite', name: 'Elite', price: '119 €',    sub: 'Accès complet' },
];

const Signup = () => {
  const { initiateGoogleLogin, registerWithEmail, error, clearError } = useAuth();
  const navigate = useNavigate();

  const storedLocale = getStoredLocale();
  // FREEZE US — default be-fr at signup. Legacy users may still have a US
  // locale stored, but the form forces BE.
  const initial = localeToSignup[storedLocale] || localeToSignup['be-fr'];

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [jurisdiction, setJurisdiction] = useState(initial.country === 'US' ? 'BE' : (initial.country || 'BE'));
  const [region, setRegion] = useState(initial.region || '');
  const [language, setLanguage] = useState(initial.language || 'fr');
  const [localError, setLocalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => { clearError(); }, []);

  // Pick copy by selected interface language; fallback to fr.
  const t = COPY[language] || COPY.fr;

  const handleJurisdictionChange = (val) => {
    const safeVal = val === 'US' ? 'BE' : val;
    setJurisdiction(safeVal);
    setRegion('');
    setStoredLocale('be-fr');
  };

  const handleRegionChange = (val) => {
    setRegion(val);
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!fullName.trim()) { setLocalError(t.err_name); return; }
    if (!email.trim()) { setLocalError(t.err_email); return; }
    if (password.length < 8) { setLocalError(t.err_password); return; }
    if (jurisdiction === 'BE' && !region) { setLocalError(t.err_region); return; }
    setIsLoading(true);
    try {
      await registerWithEmail(fullName, email, password, selectedPlan, jurisdiction, region || null, language);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }} data-testid="signup-logo">
          <img
            src="/logos/archer-logo-full-color.svg"
            alt="Archer"
            style={{ height: 80, display: 'block', margin: '0 auto' }}
          />
        </div>
        <div className="text-xl font-semibold text-center text-[#111827] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {t.title}
        </div>
        <div className="text-sm text-[#6b7280] text-center mb-6">
          {t.tagline}
        </div>

        {displayError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" data-testid="signup-error">
            {displayError}
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div>
            <label className="form-label">{t.fullName}</label>
            <input type="text" className="form-input" placeholder={t.fullNamePlaceholder} value={fullName} onChange={(e) => setFullName(e.target.value)} data-testid="signup-name-input" />
          </div>
          <div>
            <label className="form-label">{t.email}</label>
            <input type="email" className="form-input" placeholder={t.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="signup-email-input" />
          </div>
          <div>
            <label className="form-label">{t.password}</label>
            <input type="password" className="form-input" placeholder={t.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="signup-password-input" />
          </div>

          {/* Jurisdiction selector — FREEZE US: option US masquée jusqu'à M6. */}
          <div>
            <label className="form-label">{t.jurisdiction}</label>
            <select className="form-input" value={jurisdiction} onChange={(e) => handleJurisdictionChange(e.target.value)} data-testid="signup-jurisdiction-select">
              <option value="BE">{'\u{1F1E7}\u{1F1EA}'} Belgique — droit fédéral et régional</option>
            </select>
          </div>

          {/* Interface language selector */}
          <div>
            <label className="form-label">{t.interfaceLanguage}</label>
            <select className="form-input" value={language} onChange={(e) => setLanguage(e.target.value)} data-testid="signup-language-select">
              <option value="fr">{'\u{1F1EB}\u{1F1F7}'} Français</option>
              <option value="nl">{'\u{1F1F3}\u{1F1F1}'} Nederlands</option>
              <option value="en">{'\u{1F1EC}\u{1F1E7}'} English</option>
            </select>
          </div>

          {/* Belgium-specific: Region */}
          {jurisdiction === 'BE' && (
            <>
              <div>
                <label className="form-label">{t.region}</label>
                <select className="form-input" value={region} onChange={(e) => handleRegionChange(e.target.value)} data-testid="signup-region-select">
                  <option value="">{t.regionPlaceholder}</option>
                  <option value="Wallonie">Wallonie</option>
                  <option value="Bruxelles-Capitale">Bruxelles-Capitale</option>
                  <option value="Flandre">Vlaanderen / Flandre</option>
                  <option value="Communaute germanophone">Communauté germanophone</option>
                </select>
              </div>
              <div className="p-3 bg-[#fffbeb] border border-[#fde68a] rounded-lg">
                <div className="text-xs text-[#92400e]">{t.beNote}</div>
              </div>
            </>
          )}

          <div>
            <label className="form-label">{t.choosePlan}</label>
            <div className="grid grid-cols-2 gap-3">
              {PLAN_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`plan-card ${selectedPlan === tier.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan(tier.id)}
                  data-testid={`plan-${tier.id}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan(tier.id); }}
                >
                  <div className="text-sm font-semibold text-[#111827]">{tier.name}</div>
                  <div className="text-xs text-[#6b7280]">
                    {tier.price}{tier.id !== 'free' ? ` ${t.perMonth}` : ''}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] mt-1">{tier.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full btn-pill btn-blue py-3 flex items-center justify-center gap-2" data-testid="signup-submit-btn" disabled={isLoading}>
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : t.createAccount}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#ebebeb]"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-[#9ca3af]">{t.orContinueWith}</span></div>
        </div>

        <div className="space-y-3">
          <button onClick={initiateGoogleLogin} className="w-full py-3 px-4 bg-[#f5f5f5] text-[#333] rounded-[24px] text-sm font-medium hover:bg-[#eee] transition-colors flex items-center justify-center gap-3" data-testid="google-signup-btn">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {t.continueGoogle}
          </button>
          <button onClick={() => setLocalError('Apple Sign In requires Apple Developer credentials. Please configure them in Settings.')} className="w-full py-3 px-4 bg-[#000000] text-white rounded-[24px] text-sm font-medium hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-3" data-testid="apple-signup-btn">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.53-3.23 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.02 8.55 8.8c1.18.06 2 .7 2.72.75.98-.2 1.92-.77 2.98-.7 1.27.1 2.23.58 2.86 1.48-2.63 1.57-2.01 5.01.36 5.97-.48 1.28-.72 1.85-1.42 2.98zM12.12 8.74c-.14-2.35 1.76-4.38 3.93-4.54.32 2.63-2.33 4.72-3.93 4.54z"/></svg>
            {t.continueApple}
          </button>
          <button onClick={() => setLocalError('Facebook Login requires Facebook App credentials. Please configure them in Settings.')} className="w-full py-3 px-4 bg-[#1877F2] text-white rounded-[24px] text-sm font-medium hover:bg-[#166fe5] transition-colors flex items-center justify-center gap-3" data-testid="facebook-signup-btn">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            {t.continueFacebook}
          </button>
        </div>

        <div className="text-center text-sm text-[#6b7280] mt-5">
          {t.haveAccount}{' '}
          <Link to="/login" className="font-medium text-[#1a56db] hover:underline" data-testid="login-link">{t.signIn}</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
