import { useEffect, useRef, useState } from 'react';

export const useCountUp = (target: number, duration = 1200): number => {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
};
