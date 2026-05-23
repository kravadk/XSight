import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useCelebrateStore } from '@shared/store/celebrateStore';

const COLORS = ['#BFFF00', '#F5C518', '#4AA8E0', '#E0584A', '#FFFFFF'];
const PIECE_COUNT = 56;

/**
 * One-shot confetti burst. Mounted once in App; watches `celebrateStore.nonce`
 * and rains a fresh set of pieces on every bump, then clears itself. Marked
 * aria-hidden and pointer-events-none so it never blocks the UI underneath.
 */
export function Confetti() {
  const nonce = useCelebrateStore((s) => s.nonce);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (nonce === 0) return;
    setActive(nonce);
    const t = setTimeout(() => setActive(0), 3000);
    return () => clearTimeout(t);
  }, [nonce]);

  // Fresh randomised pieces per burst.
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.25,
        duration: 2 + Math.random() * 1.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 7,
        drift: (Math.random() - 0.5) * 260,
        rotate: Math.random() * 720 - 360,
      })),
    [active],
  );

  if (active === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <motion.span
          key={`${active}-${i}`}
          initial={{ y: -32, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: '106vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.42,
            background: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}
