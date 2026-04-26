import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { attorneyApi } from '../hooks/attorneys/useAttorneyApi';
import { Scale, User, ArrowLeft } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { loginWithEmail, initiateGoogleLogin, error: clientError, clearError } = useAuth();
  const [accountType, setAccountType] = useState(null); // null | 'client' | 'attorney'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attorneyError, setAttorneyError] = useState(null);

  // Surface whichever error matches the active form. Attorney login does
  // not use AuthContext, so its errors live in a local state.
  const error = accountType === 'attorney' ? attorneyError : clientError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    setAttorneyError(null);
    try {
      if (accountType === 'attorney') {
        // Attorney portal (Sprint A) — separate auth stack on db.attorneys.
        // Client AuthContext.loginWithEmail hits /api/auth/login (db.users)
        // and would never find the attorney doc → 401. Use the attorney
        // portal endpoint instead.
        await attorneyApi.post('/attorneys/login', { email, password });
        navigate('/attorneys/dashboard');
      } else {
        const user = await loginWithEmail(email, password);
        // Defensive: if a legacy attorney logs in via the client form,
        // route them to the attorney dashboard.
        if (user?.account_type === 'attorney') {
          navigate('/attorneys/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      if (accountType === 'attorney') {
        const status = err?.response?.status;
        if (status === 403) {
          setAttorneyError('Account not yet verified.');
        } else if (status === 401) {
          setAttorneyError('Invalid email or password.');
        } else {
          setAttorneyError('Sign in failed. Please try again.');
        }
      }
      // Client errors are set by AuthContext.
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{ textAlign: 'center', marginBottom: 8 }}><img src="/logos/archer-logo-full-color.svg" alt="Archer" style={{ height: 80, margin: '0 auto' }} /></div>
          <p className="text-xs text-[#6b7280] mt-1">Legal protection powered by AI</p>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-2xl p-6">
          {!accountType ? (
            /* ─── Account Type Selection ─── */
            <div data-testid="account-type-selector">
              <h2 className="text-[15px] font-semibold text-[#111827] text-center mb-5">How would you like to sign in?</h2>
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 16 }}>
                <button
                  onClick={() => setAccountType('client')}
                  data-testid="select-client-btn"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 220, minHeight: 160, padding: 28, borderRadius: 14, border: '1px solid #e2e0db', background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,86,219,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} className="text-[#1a56db]" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>I'm a client</div>
                  <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.4 }}>Analyze documents, talk to attorneys, protect yourself</div>
                </button>
                <button
                  onClick={() => setAccountType('attorney')}
                  data-testid="select-attorney-btn"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 220, minHeight: 160, padding: 28, borderRadius: 14, border: '1px solid #e2e0db', background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,86,219,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e0db'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scale size={24} className="text-[#1a56db]" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>I'm an attorney</div>
                  <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.4 }}>Join Archer to receive pre-qualified clients</div>
                </button>
              </div>
            </div>
          ) : (
            /* ─── Login Form ─── */
            <div data-testid="login-form">
              <button onClick={() => { setAccountType(null); clearError(); setAttorneyError(null); }} className="flex items-center gap-1 text-[11px] text-[#6b7280] hover:text-[#1a56db] mb-4" data-testid="back-to-selector">
                <ArrowLeft size={12} /> Back
              </button>
              <h2 className="text-[15px] font-semibold text-[#111827] mb-1">
                {accountType === 'client' ? 'Client sign in' : 'Attorney sign in'}
              </h2>
              <p className="text-[11px] text-[#6b7280] mb-5">
                {accountType === 'client' ? 'Access your cases and documents' : 'Access your attorney dashboard'}
              </p>

              {error && (
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2 text-[11px] text-[#dc2626] mb-4" data-testid="login-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-[#555] block mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full px-3 py-2.5 text-xs border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a56db] focus:border-transparent"
                    placeholder="you@example.com" data-testid="login-email-input" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#555] block mb-1">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="w-full px-3 py-2.5 text-xs border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a56db] focus:border-transparent"
                    placeholder="Min 8 characters" data-testid="login-password-input" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[#1a56db] text-white text-xs font-medium hover:bg-[#1546b3] transition-colors disabled:opacity-60"
                  data-testid="login-submit-btn">
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              {accountType === 'client' && (
                <>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[#ebebeb]" />
                    <span className="text-[10px] text-[#9ca3af]">or</span>
                    <div className="flex-1 h-px bg-[#ebebeb]" />
                  </div>
                  <button onClick={initiateGoogleLogin}
                    className="w-full py-2.5 rounded-lg border border-[#e5e5e5] text-[#333] text-xs font-medium hover:bg-[#f5f5f5] transition-colors flex items-center justify-center gap-2"
                    data-testid="google-login-btn">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>
                </>
              )}

              <div className="text-center mt-4">
                {accountType === 'client' ? (
                  <a href="/signup" className="text-[11px] text-[#1a56db] hover:underline" data-testid="signup-link">New client? Sign up free</a>
                ) : (
                  <a href="/attorney/apply" className="text-[11px] text-[#1a56db] hover:underline" data-testid="attorney-apply-link">New attorney? Apply to join Archer</a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
