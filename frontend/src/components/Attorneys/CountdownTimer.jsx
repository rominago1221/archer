import React from 'react';
import { useCountdown } from '../../hooks/attorneys/useCountdown';

export default function CountdownTimer({ expiresAt, onExpire, label, className = '' }) {
  const { formatted, urgent, isExpired } = useCountdown(expiresAt, { onExpire });
  const color = isExpired ? 'text-neutral-400' : urgent ? 'text-red-600' : 'text-neutral-900';
  return (
    <span
      role="timer"
      aria-live="polite"
      aria-label={label || 'countdown'}
      className={`tabular-nums font-medium ${color} ${className}`}
    >
      {isExpired ? 'Expired' : formatted}
    </span>
  );
}
