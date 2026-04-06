import type { ReactNode } from 'react';

type Tone = 'green' | 'red' | 'ai' | 'grey' | 'warning';

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  green: 'bg-[#E8F5E9] text-[#00A344]',
  red: 'bg-[#FEE2E2] text-[#B91C1C]',
  ai: 'bg-[#F3F0FF] text-[#7C5CFC]',
  grey: 'bg-[#F5F5F5] text-[#6B7280]',
  warning: 'bg-[#FEF3C7] text-[#B45309]',
};

export const Badge = ({ tone = 'grey', children, className = '' }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${tones[tone]} ${className}`}
  >
    {children}
  </span>
);
