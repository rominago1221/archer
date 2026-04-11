import React from 'react';

const JurisdictionPills = ({ jurisdiction, onSwitch }) => {
  const items = [
    { key: 'US', flag: '\u{1F1FA}\u{1F1F8}', label: 'United States' },
    { key: 'BE', flag: '\u{1F1E7}\u{1F1EA}', label: 'Belgium' },
  ];

  return (
    <div data-testid="jurisdiction-pills" style={{ display: 'flex', gap: 0, background: '#f3f4f6', borderRadius: 22, padding: 2 }}>
      {items.map(item => {
        const active = (jurisdiction || 'US') === item.key;
        return (
          <button
            key={item.key}
            data-testid={`jurisdiction-pill-${item.key}`}
            onClick={() => onSwitch(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 14px', borderRadius: 20, border: 'none',
              background: active ? '#0a0a0f' : 'transparent',
              color: active ? '#fff' : '#6b7280',
              fontSize: 11, fontWeight: active ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 13 }}>{item.flag}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default JurisdictionPills;
