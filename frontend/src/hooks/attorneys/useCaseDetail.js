import { useEffect, useState, useCallback, useRef } from 'react';
import { attorneyApi } from './useAttorneyApi';

const REFRESH_PENDING_MS = 60 * 1000;

export function useCaseDetail(assignmentId, { auto = true } = {}) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetch = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const { data } = await attorneyApi.get(`/attorneys/cases/${encodeURIComponent(assignmentId)}`);
      if (mounted.current) { setCaseData(data); setError(null); }
    } catch (e) {
      if (mounted.current) setError(e.response?.data?.detail || 'Error loading case');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    mounted.current = true;
    fetch();
    if (!auto) return () => { mounted.current = false; };
    const id = setInterval(() => {
      if (caseData?.status === 'pending') fetch();
    }, REFRESH_PENDING_MS);
    return () => { mounted.current = false; clearInterval(id); };
  }, [fetch, auto, caseData?.status]);

  const accept = useCallback(async () => {
    const { data } = await attorneyApi.post(`/attorneys/cases/${assignmentId}/accept`);
    await fetch();
    return data;
  }, [assignmentId, fetch]);

  const decline = useCallback(async ({ reason, notes }) => {
    const { data } = await attorneyApi.post(
      `/attorneys/cases/${assignmentId}/decline`,
      { reason, notes },
    );
    await fetch();
    return data;
  }, [assignmentId, fetch]);

  const uploadLetter = useCallback(async (file, { onProgress } = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await attorneyApi.post(
      `/attorneys/cases/${assignmentId}/upload-letter`,
      fd,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress,
      },
    );
    await fetch();
    return data;
  }, [assignmentId, fetch]);

  return { caseData, loading, error, refetch: fetch, accept, decline, uploadLetter };
}
