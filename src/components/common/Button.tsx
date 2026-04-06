import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'green' | 'ai' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref' | 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  full?: boolean;
}

const styles: Record<Variant, string> = {
  primary: 'bg-[#000000] text-white hover:bg-[#1a1a1a]',
  green: 'bg-[#00C853] text-white hover:brightness-110',
  ai: 'bg-[#7C5CFC] text-white hover:brightness-110',
  secondary:
    'bg-white text-[#0D0D0D] border-[1.5px] border-[#0D0D0D] hover:bg-[#F5F5F5]',
  ghost: 'bg-transparent text-[#6B7280] hover:bg-[#F5F5F5]',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  full,
  className = '',
  ...rest
}: ButtonProps) => {
  const h = size === 'sm' ? 'h-9 text-[13px] px-4' : 'h-11 text-sm px-5';
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`inline-flex items-center justify-center gap-2 rounded-[12px] font-medium transition-colors ${h} ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
};
