import { useCallback, useEffect, useState } from 'react';
import { attorneyApi } from './useAttorneyApi';

export function useAttorneyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const { data } = await attorneyApi.get('/attorneys/profile');
      setProfile(data);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const patch = useCallback(async (fields) => {
    const { data } = await attorneyApi.patch('/attorneys/profile', fields);
    await refetch();
    return data;
  }, [refetch]);

  return { profile, loading, error, refetch, patch };
}
