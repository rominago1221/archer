import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Fetches /api/credits/balance and exposes refetch.
 * Callers are expected to be authenticated (cookie session).
 */
export default function useCreditsBalance() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/credits/balance`, { withCredentials: true });
      setBalance(data);
      setError(null);
    } catch (e) {
      setError(e);
      // Don't clobber an existing balance on transient 5xx errors.
      if (!balance) setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [balance]);

  useEffect(() => { refetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { balance, loading, error, refetch };
}
