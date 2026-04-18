/**
 * Section 1 — Hero (Three.js sphere + 4 glass badges + live counters).
 * TODO: lift content from design-source/archer-hero-v3 (19).html:1760-1892.
 * ThreeSphere will mount the r128 scene with proper cleanup + IntersectionObserver pause.
 */
import React from 'react';
// import { useHomeT } from '../../hooks/useHomeT';
// import ThreeSphere from './ThreeSphere';

export default function HeroSection({ language = 'en', country = 'US', currency }) {
  // const t = useHomeT(language);
  return (
    <section className="hero" data-testid="home-hero">
      {/* Scaffolding placeholder — full hero content added in milestone 2. */}
      <div style={{ padding: '120px 24px 40px', textAlign: 'center', fontSize: 13, color: '#8a8a95' }}>
        Hero scaffold — lang={language} · country={country} · currency={currency?.symbol}
      </div>
    </section>
  );
}
