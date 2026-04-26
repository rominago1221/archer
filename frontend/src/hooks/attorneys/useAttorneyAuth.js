import { useEffect, useState, useCallback } from 'react';
import { attorneyApi, clearAttorneyToken } from './useAttorneyApi';

export function useAttorneyAuth() {
  const [attorney, setAttorney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await attorneyApi.get('/attorneys/me');
      setAttorney(data);
      setError(null);
      // Sprint F — sync UI language with the attorney's preferred_language
      // (DB is source of truth; localStorage is UI cache).
      if (data?.preferred_language) {
        const current = typeof window !== 'undefined'
          ? localStorage.getItem('ui_language') : null;
        if (current !== data.preferred_language) {
          localStorage.setItem('ui_language', data.preferred_language);
        }
      }
    } catch (e) {
      setAttorney(null);
      if (e.response && e.response.status === 401) {
        // Stale token — drop it so the next refresh starts clean.
        clearAttorneyToken();
      } else if (e.response) {
        setError(e.response.data?.detail || 'Error loading attorney');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    try { await attorneyApi.post('/attorneys/logout'); } catch (_) { /* ignore */ }
    clearAttorneyToken();
    setAttorney(null);
    window.location.href = '/attorneys/login';
  }, []);

  const setAvailability = useCallback(async (available) => {
    const { data } = await attorneyApi.patch('/attorneys/availability', { available });
    setAttorney((a) => a ? { ...a, available_for_cases: data.available_for_cases } : a);
    return data;
  }, []);

  return { attorney, loading, error, refresh, logout, setAvailability, setAttorney };
}
