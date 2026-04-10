import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Emergent Google OAuth session exchange (existing flow)
  const login = async (sessionId) => {
    try {
      const response = await axios.post(`${API}/auth/session`, 
        { session_id: sessionId },
        { withCredentials: true }
      );
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
      throw err;
    }
  };

  // Email/password login
  const loginWithEmail = async (email, password) => {
    setError(null);
    try {
      const response = await axios.post(`${API}/auth/login`, 
        { email, password },
        { withCredentials: true }
      );
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      const msg = formatApiError(err.response?.data?.detail);
      setError(msg);
      throw new Error(msg);
    }
  };

  // Email/password register
  const registerWithEmail = async (name, email, password, plan = 'free') => {
    setError(null);
    try {
      const response = await axios.post(`${API}/auth/register`, 
        { name, email, password, plan },
        { withCredentials: true }
      );
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      const msg = formatApiError(err.response?.data?.detail);
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const initiateGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      loginWithEmail,
      registerWithEmail,
      logout,
      updateUser,
      checkAuth,
      refreshUser: checkAuth,
      initiateGoogleLogin,
      clearError,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
