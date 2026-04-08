import { useEffect, useRef, useState } from 'react';

const CHARS = 'x9$#kL2@mP0!zQ8*vR1&wS7%yT3^uU4(iI5)oO6-pP+aA=sS[dD]fF{gG}hH;jJ:kK"lL<zZ>xX?cC/vV.bB,nN';

/**
 * Animates a string by gradually revealing the target text from a pool of
 * random characters. Inspired by spy/cipher movie text effects.
 *
 * Frames at 30ms; characters reveal left-to-right at a constant rate so the
 * full text is locked in by `duration`.
 */
export function useCipherScramble(text: string, duration = 600, delay = 0): { value: string; isScrambling: boolean } {
  const [value, setValue] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!text) {
      setValue('');
      return;
    }
    setIsScrambling(true);
    const startAt = performance.now() + delay;
    const stepRate = Math.max(0.5, text.length / (duration / 30));
    let iteration = 0;

    const tick = (now: number) => {
      if (now < startAt) {
        rafRef.current = window.setTimeout(() => tick(performance.now()), 16) as unknown as number;
        return;
      }
      const chars = text.split('').map((c, i) => {
        if (i < iteration) return c;
        if (c === ' ') return ' ';
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      });
      setValue(chars.join(''));
      iteration += stepRate;
      if (iteration < text.length) {
        rafRef.current = window.setTimeout(() => tick(performance.now()), 30) as unknown as number;
      } else {
        setValue(text);
        setIsScrambling(false);
      }
    };

    tick(performance.now());
    return () => {
      if (rafRef.current) window.clearTimeout(rafRef.current);
      setIsScrambling(false);
    };
  }, [text, duration, delay]);

  return { value, isScrambling };
}
