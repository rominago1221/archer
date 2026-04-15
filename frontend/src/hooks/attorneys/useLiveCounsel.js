import { useEffect, useState, useCallback, useRef } from 'react';
import { attorneyApi } from './useAttorneyApi';

const REFRESH_MS = 30 * 1000;

export function useLiveCounsel({ auto = true } = {}) {
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([
        attorneyApi.get('/attorneys/live-counsel/stats'),
        attorneyApi.get('/attorneys/live-counsel/upcoming'),
      ]);
      if (!mounted.current) return;
      setStats(s.data);
      setUpcoming(u.data.calls || []);
      setError(null);
    } catch (e) {
      if (mounted.current) setError(e.response?.data?.detail || 'Error');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchAll();
    if (!auto) return () => { mounted.current = false; };
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => { mounted.current = false; clearInterval(id); };
  }, [fetchAll, auto]);

  const join = useCallback(async (assignmentId) => {
    const { data } = await attorneyApi.post(
      `/attorneys/cases/${assignmentId}/live-counsel/join`,
    );
    return data;
  }, []);

  return { stats, upcoming, loading, error, refetch: fetchAll, join };
}
