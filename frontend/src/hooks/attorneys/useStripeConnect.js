import { useCallback } from 'react';
import { attorneyApi } from './useAttorneyApi';

export function useStripeConnect() {
  const startOnboarding = useCallback(async () => {
    const { data } = await attorneyApi.post('/attorneys/stripe/onboarding/start');
    if (data?.onboarding_url) {
      window.location.href = data.onboarding_url;
    }
    return data;
  }, []);

  const checkStatus = useCallback(async () => {
    const { data } = await attorneyApi.get('/attorneys/stripe/onboarding/status');
    return data;
  }, []);

  const openStripeDashboard = useCallback(async () => {
    const { data } = await attorneyApi.get('/attorneys/stripe/dashboard-link');
    if (data?.dashboard_url) {
      window.open(data.dashboard_url, '_blank', 'noopener');
    }
    return data;
  }, []);

  return { startOnboarding, checkStatus, openStripeDashboard };
}
