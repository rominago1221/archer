/**
 * Footer — 4 columns + brand + bottom legal (address adapted FR/EN).
 * TODO: port design-source HTML lines 2308-2366.
 */
import React from 'react';

export default function Footer({ language = 'en', country = 'US' }) {
  return (
    <footer className="footer" data-testid="home-footer">
      <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#8a8a95' }}>
        Footer scaffold — lang={language} · country={country}
      </div>
    </footer>
  );
}
