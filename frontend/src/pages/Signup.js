import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  const { initiateGoogleLogin } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');

  const handleGoogleSignup = () => {
    initiateGoogleLogin();
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="text-3xl font-bold text-[#1a56db] text-center mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Jasper
        </div>
        <div className="text-xl font-semibold text-center text-[#111827] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Create your account
        </div>
        <div className="text-sm text-[#6b7280] text-center mb-6">
          Your lawyer, without the lawyer fees.
        </div>

        <div className="space-y-4">
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
            className="w-full btn-pill btn-blue py-3"
            onClick={handleGoogleSignup}
            data-testid="signup-submit-btn"
          >
            Create account
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#ebebeb]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[#9ca3af]">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignup}
            className="w-full py-3 px-4 bg-[#f5f5f5] text-[#333] rounded-[24px] text-sm font-medium hover:bg-[#eee] transition-colors flex items-center justify-center gap-2"
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

          <div className="text-center text-sm text-[#6b7280] mt-4">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[#1a56db] hover:underline" data-testid="login-link">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
