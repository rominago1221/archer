import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Scale, User, ArrowLeft } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import { getStoredLocale } from '../data/landingTranslations';

// ─── i18n copy ────────────────────────────────────────────────────────────
const COPY = {
  fr: {
    tagline: 'Protection juridique nouvelle génération',
    howSignIn: 'Comment souhaitez-vous vous connecter ?',
    iAmClient: 'Je suis un client',
    clientDesc: 'Analysez vos documents, consultez un avocat, protégez vos droits',
    iAmAttorney: 'Je suis un avocat',
    attorneyDesc: 'Rejoignez Archer pour recevoir des dossiers qualifiés',
    back: 'Retour',
    clientSignIn: 'Connexion client',
    clientSignInSub: 'Accédez à vos dossiers et documents',
    email: 'Email',
    emailPlaceholder: 'vous@exemple.com',
    password: 'Mot de passe',
    passwordPlaceholder: 'Min. 8 caractères',
    signIn: 'Se connecter',
    signingIn: 'Connexion en cours…',
    or: 'ou',
    continueGoogle: 'Continuer avec Google',
    newClient: 'Nouveau client ? Inscription gratuite',
  },
  nl: {
    tagline: 'Juridische bescherming, nieuwe generatie',
    howSignIn: 'Hoe wilt u inloggen?',
    iAmClient: 'Ik ben een klant',
    clientDesc: 'Analyseer documenten, raadpleeg een advocaat, bescherm uw rechten',
    iAmAttorney: 'Ik ben een advocaat',
    attorneyDesc: 'Sluit u aan bij Archer om gekwalificeerde dossiers te ontvangen',
    back: 'Terug',
    clientSignIn: 'Klantlogin',
    clientSignInSub: 'Toegang tot uw dossiers en documenten',
    email: 'E-mail',
    emailPlaceholder: 'u@voorbeeld.com',
    password: 'Wachtwoord',
    passwordPlaceholder: 'Min. 8 tekens',
    signIn: 'Inloggen',
    signingIn: 'Inloggen…',
    or: 'of',
    continueGoogle: 'Doorgaan met Google',
    newClient: 'Nieuwe klant? Gratis registreren',
  },
  en: {
    tagline: 'Next-generation legal protection',
    howSignIn: 'How would you like to sign in?',
    iAmClient: "I'm a client",
    clientDesc: 'Analyze documents, talk to attorneys, protect yourself',
    iAmAttorney: "I'm an attorney",
    attorneyDesc: 'Join Archer to receive pre-qualified clients',
    back: 'Back',
    clientSignIn: 'Client sign in',
    clientSignInSub: 'Access your cases and documents',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: 'Min 8 characters',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    or: 'or',
    continueGoogle: 'Continue with Google',
    newClient: 'New client? Sign up free',
  },
};

function pickInitialLanguage() {
  const stored = getStoredLocale() || 'be-fr';
  const lang = (stored.split('-')[1] || 'fr').toLowerCase();
  return ['fr', 'nl', 'en'].includes(lang) ? lang : 'fr';
}

const Login = () => {
  const navigate = useNavigate();
  const { loginWithEmail, initiateGoogleLogin, error, clearError } = useAuth();
  // Account type is either null (selector visible) or 'client' (inline form).
  // The "I'm an attorney" button navigates straight to /attorneys/login —
  // the dedicated portal page — so 'attorney' is never set here anymore.
  const [accountType, setAccountType] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // UI language — initial value from localStorage, then updated live by the
  // PublicHeader's onLanguageChange callback when the user toggles FR/NL/EN.
  const [language, setLanguage] = useState(pickInitialLanguage);
  const t = COPY[language] || COPY.fr;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const user = await loginWithEmail(email, password);
      // Defensive: if a legacy attorney logs in via the client form,
      // route them to the attorney dashboard.
      if (user?.account_type === 'attorney') {
        navigate('/attorneys/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      // error state is set by AuthContext.
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]" data-testid="login-page">
      <PublicHeader onLanguageChange={(lang) => setLanguage((lang || 'fr').toLowerCase())} />

      <div className="max-w-md mx-auto px-4 py-10">
        {/* Brand header — centered logo + single tagline (no duplicate) */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logos/archer-logo-full-color.svg"
            alt="Archer"
            style={{ height: 80, display: 'block', margin: '0 auto' }}
          />
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 10, textAlign: 'center' }}>
            {t.tagline}
          </p>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-2xl p-6">
          {!accountType ? (
            /* ─── Account Type Selection ─── */
            <div data-testid="account-type-selector">
              <h2 className="text-[15px] font-semibold text-[#111827] text-center mb-5">{t.howSignIn}</h2>
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setAccountType('client')}
                  data-testid="select-client-btn"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 220, minHeight: 170, padding: 28, borderRadius: 14, border: '1px solid #e2e0db', background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,86,219,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} className="text-[#1a56db]" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{t.iAmClient}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.4 }}>{t.clientDesc}</div>
                </button>
                <button
                  onClick={() => navigate('/attorneys/login')}
                  data-testid="select-attorney-btn"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 220, minHeight: 170, padding: 28, borderRadius: 14, border: '1px solid #e2e0db', background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,86,219,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scale size={24} className="text-[#1a56db]" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{t.iAmAttorney}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.4 }}>{t.attorneyDesc}</div>
                </button>
              </div>
            </div>
          ) : (
            /* ─── Client login form ─── */
            <div data-testid="login-form">
              <button onClick={() => { setAccountType(null); clearError(); }} className="flex items-center gap-1 text-[11px] text-[#6b7280] hover:text-[#1a56db] mb-4" data-testid="back-to-selector">
                <ArrowLeft size={12} /> {t.back}
              </button>
              <h2 className="text-[15px] font-semibold text-[#111827] mb-1">{t.clientSignIn}</h2>
              <p className="text-[11px] text-[#6b7280] mb-5">{t.clientSignInSub}</p>

              {error && (
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2 text-[11px] text-[#dc2626] mb-4" data-testid="login-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-[#555] block mb-1">{t.email}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full px-3 py-2.5 text-xs border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a56db] focus:border-transparent"
                    placeholder={t.emailPlaceholder} data-testid="login-email-input" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#555] block mb-1">{t.password}</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="w-full px-3 py-2.5 text-xs border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a56db] focus:border-transparent"
                    placeholder={t.passwordPlaceholder} data-testid="login-password-input" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[#1a56db] text-white text-xs font-medium hover:bg-[#1546b3] transition-colors disabled:opacity-60"
                  data-testid="login-submit-btn">
                  {loading ? t.signingIn : t.signIn}
                </button>
              </form>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[#ebebeb]" />
                <span className="text-[10px] text-[#9ca3af]">{t.or}</span>
                <div className="flex-1 h-px bg-[#ebebeb]" />
              </div>
              <button onClick={initiateGoogleLogin}
                className="w-full py-2.5 rounded-lg border border-[#e5e5e5] text-[#333] text-xs font-medium hover:bg-[#f5f5f5] transition-colors flex items-center justify-center gap-2"
                data-testid="google-login-btn">
                <svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {t.continueGoogle}
              </button>

              <div className="text-center mt-4">
                <a href="/signup" className="text-[11px] text-[#1a56db] hover:underline" data-testid="signup-link">{t.newClient}</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
