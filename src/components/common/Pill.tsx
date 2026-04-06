import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
}

export const Pill = ({ children, active, className = '', ...rest }: PillProps) => (
  <button
    {...rest}
    className={`inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-colors ${
      active
        ? 'bg-black text-white'
        : 'bg-[#F5F5F5] text-[#0D0D0D] hover:bg-[#E8F5E9]'
    } ${className}`}
  >
    {children}
  </button>
);
