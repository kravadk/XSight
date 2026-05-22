import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Props {
  /** Tooltip body — a short, plain-language explanation of one term. */
  children: ReactNode;
  /** Accessible label for the trigger button. */
  label?: string;
  /** Which side the popover opens toward. Defaults to 'top'. */
  side?: 'top' | 'bottom';
}

/**
 * Inline info affordance — a small "i" that reveals a one-paragraph explainer
 * on hover, focus or tap. Used to make X Cup jargon (payout formula, bond,
 * challenge window, score) self-explanatory without leaving the screen.
 */
export function InfoTip({ children, label = 'More info', side = 'top' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="grid h-4 w-4 place-items-center rounded-full text-stadium-text-muted transition-colors hover:text-pitch"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            className={`absolute left-1/2 z-[100] w-56 -translate-x-1/2 rounded-lg border border-stadium-line bg-stadium-card p-2.5 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-stadium-text-secondary shadow-xl ${
              side === 'top' ? 'bottom-6' : 'top-6'
            }`}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
