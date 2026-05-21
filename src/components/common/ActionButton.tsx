import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/format';

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber' | 'blue';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  loading?: boolean;
  tone?: Tone;
}

const toneClass: Record<Tone, string> = {
  primary: 'bg-[#BFFF00] text-[#080808] border-[#BFFF00] hover:bg-[#D4FF33] hover:border-[#D4FF33] shadow-[0_0_24px_rgba(191,255,0,0.12)]',
  secondary: 'bg-[#111111] text-[#F5F5F5] border-[rgba(255,255,255,0.10)] hover:border-[rgba(191,255,0,0.32)] hover:bg-[#171717]',
  ghost: 'bg-transparent text-[#D1D5DB] border-transparent hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F5F5]',
  danger: 'bg-[rgba(239,68,68,0.08)] text-[#FCA5A5] border-[rgba(239,68,68,0.22)] hover:border-[rgba(239,68,68,0.42)]',
  amber: 'bg-[rgba(245,158,11,0.10)] text-[#FBBF24] border-[rgba(245,158,11,0.24)] hover:border-[rgba(245,158,11,0.45)]',
  blue: 'bg-[rgba(56,189,248,0.10)] text-[#7DD3FC] border-[rgba(56,189,248,0.24)] hover:border-[rgba(56,189,248,0.45)]',
};

export function ActionButton({
  icon,
  loading,
  tone = 'secondary',
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold leading-none transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BFFF00]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
