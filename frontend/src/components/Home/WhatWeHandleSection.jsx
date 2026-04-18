/**
 * Section 3 — What we handle (7 bento cards with asymmetric heights, stats).
 * TODO: port design-source HTML lines 2009-2171.
 * Stats (debt/eviction/termination amounts) swap by `corpus` prop:
 *   belgian → EUR figures, BE laws
 *   us      → USD figures, US laws
 */
import React from 'react';

export default function WhatWeHandleSection({ language = 'en', country = 'US', currency, corpus = 'us' }) {
  return (
    <section className="section-handle" data-testid="home-what-we-handle">
      <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#8a8a95' }}>
        What-we-handle scaffold — corpus={corpus}
      </div>
    </section>
  );
}
