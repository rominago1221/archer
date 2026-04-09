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
