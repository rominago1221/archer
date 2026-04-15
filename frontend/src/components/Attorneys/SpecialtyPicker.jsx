import React from 'react';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

const ALL_SPECIALTIES = [
  'logement', 'travail', 'famille', 'consommation',
  'penal_routier', 'civil', 'administratif', 'assurance',
];

export default function SpecialtyPicker({ value = [], onChange, max = 3 }) {
  const { t } = useAttorneyT();
  const toggle = (s) => {
    if (value.includes(s)) {
      onChange(value.filter((x) => x !== s));
    } else if (value.length < max) {
      onChange([...value, s]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SPECIALTIES.map((s) => {
        const active = value.includes(s);
        const disabled = !active && value.length >= max;
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => toggle(s)}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${
              active
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {t.specialties[s] || s}
          </button>
        );
      })}
    </div>
  );
}
