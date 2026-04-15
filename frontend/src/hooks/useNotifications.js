import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_MS = 30 * 1000;

/**
 * Phase 2 — client notifications hook.
 * Polls /api/notifications every 30s. Exposes:
 *   - notifications: full list (max 50, newest first)
 *   - unreadCount
 *   - markAsRead(id), markAllAsRead()
 *   - refetch()
 *   - firstUnread(type): pick the most recent unread of a given type
 */
export function useNotifications({ enabled = true } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/notifications`, { withCredentials: true });
      if (!mounted.current) return;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (_) {
      // 401 is normal pre-login — silent
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return () => { mounted.current = false; };
    refetch();
    const id = setInterval(refetch, POLL_MS);
    return () => { mounted.current = false; clearInterval(id); };
  }, [refetch, enabled]);

  const markAsRead = useCallback(async (id) => {
    try {
      await axios.patch(`${API}/notifications/${id}/mark-read`, {}, { withCredentials: true });
    } catch (_) { /* swallow */ }
    setNotifications((xs) => xs.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.post(`${API}/notifications/mark-all-read`, {}, { withCredentials: true });
    } catch (_) { /* swallow */ }
    setNotifications((xs) => xs.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const firstUnread = useCallback((type) =>
    notifications.find((n) => !n.read && (!type || n.type === type)) || null,
    [notifications],
  );

  return { notifications, unreadCount, loading, refetch, markAsRead, markAllAsRead, firstUnread };
}
