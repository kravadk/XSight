import type { ReactNode } from 'react';
import { cn } from '../../utils/format';

type Tone = 'lime' | 'blue' | 'amber' | 'red' | 'green' | 'neutral' | 'purple';

const tones: Record<Tone, string> = {
  lime: 'bg-[rgba(191,255,0,0.10)] text-[#BFFF00] border-[rgba(191,255,0,0.22)]',
  blue: 'bg-[rgba(56,189,248,0.10)] text-[#7DD3FC] border-[rgba(56,189,248,0.22)]',
  amber: 'bg-[rgba(245,158,11,0.10)] text-[#FBBF24] border-[rgba(245,158,11,0.22)]',
  red: 'bg-[rgba(239,68,68,0.10)] text-[#FCA5A5] border-[rgba(239,68,68,0.22)]',
  green: 'bg-[rgba(34,197,94,0.10)] text-[#4ADE80] border-[rgba(34,197,94,0.22)]',
  neutral: 'bg-[rgba(255,255,255,0.06)] text-[#D1D5DB] border-[rgba(255,255,255,0.10)]',
  purple: 'bg-[rgba(167,139,250,0.10)] text-[#C4B5FD] border-[rgba(167,139,250,0.22)]',
};

export function StatusPill({
  children,
  tone = 'neutral',
  icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-extrabold uppercase leading-none tracking-[0.08em]',
        tones[tone],
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
