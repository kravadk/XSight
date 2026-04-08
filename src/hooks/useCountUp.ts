import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from its previous render to the new target.
 * Uses cubic ease-out. Returns the current animated value.
 */
export const useCountUp = (target: number, duration = 900): number => {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    const step = (ts: number) => {
      if (start == null) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + delta * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
};
