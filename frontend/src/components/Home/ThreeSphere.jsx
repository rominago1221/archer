/**
 * ThreeSphere — three.js r128 scene with lifecycle cleanup + rAF pause
 * when the canvas is off-viewport (IntersectionObserver). Stub.
 */
import React, { useRef } from 'react';

export default function ThreeSphere() {
  const mountRef = useRef(null);
  // TODO milestone 2: port the design-source script to mount on `mountRef.current`,
  // keep a cancelled-flag closure, cancelAnimationFrame + renderer.dispose +
  // remove DOM child on unmount, pause on IntersectionObserver inactive.
  return <div ref={mountRef} data-testid="three-sphere-mount" />;
}
