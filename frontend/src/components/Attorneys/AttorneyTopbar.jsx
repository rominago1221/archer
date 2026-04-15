import React from 'react';
import AvailabilityToggle from './AvailabilityToggle';

export default function AttorneyTopbar({ attorney, onAvailabilityChange }) {
  return (
    <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="text-sm text-neutral-500">
        Maître {attorney?.first_name} {attorney?.last_name}
      </div>
      <div className="flex items-center gap-3">
        <AvailabilityToggle
          available={!!attorney?.available_for_cases}
          onChange={onAvailabilityChange}
        />
      </div>
    </header>
  );
}
