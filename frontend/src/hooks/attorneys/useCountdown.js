import { useEffect, useState, useRef } from 'react';

function parseToMs(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  const d = new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function formatHMS(sec) {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useCountdown(targetAt, { onExpire } = {}) {
  const targetMs = parseToMs(targetAt);
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    if (!targetMs) return;
    firedRef.current = false;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const remaining = targetMs ? Math.max(0, Math.floor((targetMs - now) / 1000)) : 0;
  const isExpired = !!targetMs && remaining <= 0;

  useEffect(() => {
    if (isExpired && !firedRef.current && onExpire) {
      firedRef.current = true;
      onExpire();
    }
  }, [isExpired, onExpire]);

  return {
    remaining,
    isExpired,
    formatted: targetMs ? formatHMS(remaining) : '—',
    urgent: remaining > 0 && remaining < 15 * 60,
  };
}
