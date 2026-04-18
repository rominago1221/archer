import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PAGE_SIZE = 20;

/**
 * Paginated transactions feed. Labels come from the server already in the
 * caller's language (generic — no per-action cost disclosure).
 */
export default function useCreditsHistory(pageSize = PAGE_SIZE) {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (newOffset = 0) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/credits/history`, {
        params: { limit: pageSize, offset: newOffset },
        withCredentials: true,
      });
      setTransactions(newOffset === 0 ? data.transactions : [...transactions, ...data.transactions]);
      setTotal(data.total);
      setOffset(newOffset);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [pageSize, transactions]);

  useEffect(() => { load(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = offset + transactions.length < total;
  const loadMore = () => !loading && hasMore && load(offset + pageSize);

  return { transactions, total, loading, error, hasMore, loadMore, reload: () => load(0) };
}
