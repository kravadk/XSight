import { motion } from 'motion/react';
import { cn } from '../../utils/format';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Standard XSight toggle. Lime when on, dark surface when off, with a spring
 * animation on the knob and a soft lime glow around the track when active.
 * Used everywhere a boolean preference appears so the look stays consistent.
 */
export function Toggle({ checked, onChange, size = 'md', disabled, className, ariaLabel }: Props) {
  const dims =
    size === 'sm'
      ? { track: 'w-8 h-[18px]', knob: 'w-3.5 h-3.5', offset: 12 }
      : { track: 'w-11 h-[22px]', knob: 'w-[18px] h-[18px]', offset: 18 };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative shrink-0 rounded-full transition-colors duration-200 outline-none',
        'border',
        dims.track,
        checked
          ? 'bg-[#BFFF00] border-[#BFFF00] shadow-[0_0_12px_rgba(191,255,0,0.35)]'
          : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)]',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      <motion.span
        layout
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded-full',
          dims.knob,
          checked ? 'bg-[#0A0A0A]' : 'bg-[#A3A3A3]',
        )}
        initial={false}
        animate={{ left: checked ? dims.offset : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}
