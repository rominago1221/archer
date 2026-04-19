import { useEffect, useRef, useState } from 'react';

/**
 * Fires `true` once the target element crosses the IntersectionObserver
 * threshold. After the first hit it unobserves and stays `true` — we use it
 * to trigger one-shot animations (typing, count-up, etc.) that should play
 * the moment the element becomes visible but never replay on scroll-back.
 */
export function useInView({ threshold = 0.3, rootMargin = '0px' } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}
