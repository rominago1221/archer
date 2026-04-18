/**
 * Section 5 — Final CTA (dark box, radial blue gradient).
 * TODO: port design-source HTML lines 2281-2307.
 */
import React from 'react';

export default function FinalCtaSection({ language = 'en', country = 'US' }) {
  return (
    <section className="cta-section" data-testid="home-final-cta">
      <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#8a8a95' }}>
        Final-CTA scaffold — lang={language}
      </div>
    </section>
  );
}
