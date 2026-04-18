/**
 * Section 4 — Old way vs Archer way (7-row comparison table, Archer column in subtle blue).
 * TODO: port design-source HTML lines 2172-2280. Prices swap by currency.
 */
import React from 'react';

export default function VsOldWaySection({ language = 'en', country = 'US', currency }) {
  return (
    <section className="section-vs" data-testid="home-vs-old-way">
      <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#8a8a95' }}>
        VS-old-way scaffold — currency={currency?.symbol}
      </div>
    </section>
  );
}
