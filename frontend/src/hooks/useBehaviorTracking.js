import { useEffect, useRef, useCallback } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Fire-and-forget behavior event. Never throws; never blocks the UI.
 * `options.beacon=true` uses navigator.sendBeacon so it survives page unload.
 */
export async function trackEvent(eventType, caseId = null, metadata = null, options = {}) {
  const payload = { event_type: eventType, case_id: caseId, metadata: metadata || undefined };
  try {
    if (options.beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`${API}/events/track`, blob);
      return;
    }
    await fetch(`${API}/events/track`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* swallow — tracking is best effort */
  }
}

/**
 * Hook: wire the full behavior tracking suite to a case-detail view.
 *
 * Fires:
 *   - analysis_viewed    (on mount, once)
 *   - scrolled_to_bottom (IntersectionObserver on a sentinel ref, once)
 *   - time_spent         (heartbeat every 30s with metadata.time_spent_seconds)
 *   - case_abandoned     (beforeunload if total time on page < 30s AND no click)
 *
 * Returns:
 *   - bottomSentinelRef: attach to an element near the bottom of the page
 *   - markInteracted(): call when user does anything meaningful (prevents case_abandoned)
 *   - fire(eventType, metadata): fire a custom tracked event
 */
export function useCaseBehaviorTracking(caseId) {
  const mountedAtRef = useRef(null);
  const interactedRef = useRef(false);
  const scrolledFiredRef = useRef(false);
  const bottomSentinelRef = useRef(null);
  const heartbeatHandleRef = useRef(null);

  const fire = useCallback((eventType, metadata) => {
    trackEvent(eventType, caseId, metadata);
  }, [caseId]);

  const markInteracted = useCallback(() => {
    interactedRef.current = true;
  }, []);

  useEffect(() => {
    if (!caseId) return undefined;
    mountedAtRef.current = Date.now();
    fire('analysis_viewed');

    // 30-second heartbeat — send cumulative seconds.
    heartbeatHandleRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - mountedAtRef.current) / 1000);
      fire('time_spent', { time_spent_seconds: elapsed });
    }, 30000);

    const onUnload = () => {
      const elapsed = Math.round((Date.now() - mountedAtRef.current) / 1000);
      // Final time_spent regardless.
      trackEvent('time_spent', caseId, { time_spent_seconds: elapsed }, { beacon: true });
      if (elapsed < 30 && !interactedRef.current) {
        trackEvent('case_abandoned', caseId, { time_spent_seconds: elapsed }, { beacon: true });
      }
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);

    return () => {
      clearInterval(heartbeatHandleRef.current);
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
      // Final heartbeat on component unmount too.
      if (mountedAtRef.current) {
        const elapsed = Math.round((Date.now() - mountedAtRef.current) / 1000);
        trackEvent('time_spent', caseId, { time_spent_seconds: elapsed });
      }
    };
  }, [caseId, fire]);

  // Scroll-to-bottom detection via IntersectionObserver on a sentinel.
  useEffect(() => {
    if (!caseId || !bottomSentinelRef.current) return undefined;
    const el = bottomSentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !scrolledFiredRef.current) {
          scrolledFiredRef.current = true;
          const pct = typeof window !== 'undefined' && document?.body
            ? Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100)
            : null;
          fire('scrolled_to_bottom', pct != null ? { scroll_depth_pct: pct } : null);
          markInteracted();
        }
      }
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [caseId, fire, markInteracted]);

  return { bottomSentinelRef, markInteracted, fire };
}
