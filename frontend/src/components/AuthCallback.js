import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing under StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const user = await login(sessionId);
          // Navigate to dashboard with user data to skip auth check
          navigate('/dashboard', { replace: true, state: { user } });
        } catch (err) {
          console.error('Auth callback error:', err);
          navigate('/login', { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, [location.hash, login, navigate]);

  return (
    <div className="auth-wrap">
      <div className="auth-card text-center">
        <div className="text-2xl font-semibold text-[#1a56db] mb-4"><img src="/logos/archer-logo-wordmark.svg" alt="Archer" style={{ height: 36 }} /></div>
        <div className="text-gray-600">Signing you in...</div>
        <div className="mt-4 flex justify-center">
          <div className="w-8 h-8 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
