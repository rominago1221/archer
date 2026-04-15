import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAttorneyAuth } from '../../hooks/attorneys/useAttorneyAuth';

export default function RequireAttorneyAuth({ children }) {
  const { attorney, loading } = useAttorneyAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-400">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }
  if (!attorney) return <Navigate to="/attorneys/login" replace />;
  return typeof children === 'function' ? children({ attorney }) : children;
}
