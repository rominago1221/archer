import React from 'react';
import SectionHeader from './SectionHeader';
import JourneyTimeline from './JourneyTimeline';
import LiveLawyerBand from './LiveLawyerBand';
import PillarsRow from './PillarsRow';
import CTAStrip from './CTAStrip';

// Keyframes used by the nested glass components. Injected once per mount.
// Non-critical but keeps the component self-contained — no external CSS needed.
const KEYFRAMES = `
@keyframes liveDotPulse {
  0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}
@keyframes pulseGreen {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}
`;

// Props:
//   language    'fr' | 'en' — passed from the parent Landing page
//   country     'BE' | 'US'
//   onStart     handler for the CTA strip button (→ navigate('/upload'))
//   onBookCall  handler for the live lawyer band (→ navigate('/lawyers/book'))
export default function HomeJourneySection({
  language = 'en',
  country = 'BE',
  onStart,
  onBookCall,
}) {
  return (
    <section
      data-testid="home-journey-section"
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 50%, #ecfdf5 100%)',
        overflow: 'hidden',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Decorative blurred circles — purely cosmetic, pointerEvents none */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: 200, left: -150,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(96, 165, 250, 0.35) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', top: 600, right: -150,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Content wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '100px 40px',
        maxWidth: 1280,
        margin: '0 auto',
      }}>
        <SectionHeader language={language} />
        <JourneyTimeline language={language} country={country} />
        <LiveLawyerBand language={language} onBookCall={onBookCall} />
        <PillarsRow language={language} country={country} />
        <CTAStrip language={language} onStart={onStart} />
      </div>
    </section>
  );
}
