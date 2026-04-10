import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  const { initiateGoogleLogin, registerWithEmail, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [localError, setLocalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    clearError();
  }, []);

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!fullName.trim()) {
      setLocalError('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      await registerWithEmail(fullName, email, password, selectedPlan);
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
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: 500, letterSpacing: '-0.5px', color: '#1a56db', textAlign: 'center', marginBottom: '24px' }} data-testid="signup-logo">
          Jasper
        </div>
        <div className="text-xl font-semibold text-center text-[#111827] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Create your account
        </div>
        <div className="text-sm text-[#6b7280] text-center mb-6">
          Your lawyer, without the lawyer fees.
        </div>

        {displayError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" data-testid="signup-error">
            {displayError}
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div>
            <label className="form-label">Full name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Michael Rodriguez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              data-testid="signup-name-input"
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="signup-email-input"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="signup-password-input"
            />
          </div>

          <div>
            <label className="form-label">Choose your plan</label>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`plan-card ${selectedPlan === 'free' ? 'selected' : ''}`}
                onClick={() => setSelectedPlan('free')}
                data-testid="plan-free"
              >
                <div className="text-sm font-semibold text-[#111827]">Free</div>
                <div className="text-xs text-[#6b7280]">$0 / month</div>
              </div>
              <div
                className={`plan-card ${selectedPlan === 'pro' ? 'selected' : ''}`}
                onClick={() => setSelectedPlan('pro')}
                data-testid="plan-pro"
              >
                <div className="text-sm font-semibold text-[#111827]">Pro</div>
                <div className="text-xs text-[#6b7280]">$69 / month</div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full btn-pill btn-blue py-3 flex items-center justify-center gap-2"
            data-testid="signup-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : 'Create account'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#ebebeb]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-[#9ca3af]">or continue with</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={initiateGoogleLogin}
            className="w-full py-3 px-4 bg-[#f5f5f5] text-[#333] rounded-[24px] text-sm font-medium hover:bg-[#eee] transition-colors flex items-center justify-center gap-3"
            data-testid="google-signup-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Apple */}
          <button
            onClick={() => setLocalError('Apple Sign In requires Apple Developer credentials. Please configure them in Settings.')}
            className="w-full py-3 px-4 bg-[#000000] text-white rounded-[24px] text-sm font-medium hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-3"
            data-testid="apple-signup-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.53-3.23 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.02 8.55 8.8c1.18.06 2 .7 2.72.75.98-.2 1.92-.77 2.98-.7 1.27.1 2.23.58 2.86 1.48-2.63 1.57-2.01 5.01.36 5.97-.48 1.28-.72 1.85-1.42 2.98zM12.12 8.74c-.14-2.35 1.76-4.38 3.93-4.54.32 2.63-2.33 4.72-3.93 4.54z"/>
            </svg>
            Continue with Apple
          </button>

          {/* Facebook */}
          <button
            onClick={() => setLocalError('Facebook Login requires Facebook App credentials. Please configure them in Settings.')}
            className="w-full py-3 px-4 bg-[#1877F2] text-white rounded-[24px] text-sm font-medium hover:bg-[#166fe5] transition-colors flex items-center justify-center gap-3"
            data-testid="facebook-signup-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        <div className="text-center text-sm text-[#6b7280] mt-5">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#1a56db] hover:underline" data-testid="login-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
