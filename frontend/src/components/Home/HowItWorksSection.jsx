/**
 * Section 2 — How it works (5-node timeline with hover tooltips).
 * TODO: port design-source HTML lines 1893-2008. Timeline uses horizontal nodes +
 * per-node tooltip driven by hover (the HTML has CSS-only tooltips — will port).
 */
import React from 'react';

export default function HowItWorksSection({ language = 'en', country = 'US', currency }) {
  return (
    <section className="section-flow" data-testid="home-how-it-works">
      <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#8a8a95' }}>
        How-it-works scaffold — currency={currency?.symbol}
      </div>
    </section>
  );
}
