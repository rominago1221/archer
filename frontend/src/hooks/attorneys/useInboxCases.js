import { useEffect, useState, useCallback, useRef } from 'react';
import { attorneyApi } from './useAttorneyApi';

const REFRESH_MS = 30 * 1000;

export function useInboxCases({ filter = 'all', auto = true } = {}) {
  const [data, setData] = useState({ cases: [], stats: { pending_count: 0, expiring_soon_count: 0 } });
  const [activeData, setActiveData] = useState({ cases: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      const [inboxRes, activeRes] = await Promise.all([
        attorneyApi.get('/attorneys/cases/inbox', { params: { type: filter === 'all' ? 'all' : filter } }),
        attorneyApi.get('/attorneys/cases/active'),
      ]);
      if (!mounted.current) return;
      setData(inboxRes.data);
      setActiveData(activeRes.data);
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      setError(e.response?.data?.detail || 'Error loading inbox');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    mounted.current = true;
    fetchAll();
    if (!auto) return () => { mounted.current = false; };
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => { mounted.current = false; clearInterval(id); };
  }, [fetchAll, auto]);

  return {
    cases: data.cases,
    stats: data.stats,
    activeCases: activeData.cases,
    loading,
    error,
    refetch: fetchAll,
  };
}
