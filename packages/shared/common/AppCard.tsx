import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@shared/utils/format';

export function AppCard({
  children,
  className,
  hover = false,
  ...props
}: HTMLAttributes<HTMLElement> & { hover?: boolean }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#151515] p-4 md:p-5',
        'shadow-[0_18px_60px_rgba(0,0,0,0.18)]',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(191,255,0,0.18)] hover:bg-[#171717]',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function AppCardHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold leading-snug text-[#F5F5F5]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-[#D1D5DB]">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export const Panel = AppCard;
export const PanelHeader = AppCardHeader;

export function AppShellSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto flex w-full max-w-7xl flex-col gap-5 pb-10', className)}>
      {children}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  tone = 'neutral',
  detail,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: 'lime' | 'blue' | 'amber' | 'green' | 'red' | 'neutral';
  detail?: ReactNode;
  className?: string;
}) {
  const color =
    tone === 'lime' ? 'text-[#BFFF00]'
      : tone === 'blue' ? 'text-[#38BDF8]'
        : tone === 'amber' ? 'text-[#F59E0B]'
          : tone === 'green' ? 'text-[#22C55E]'
            : tone === 'red' ? 'text-[#EF4444]'
              : 'text-[#F5F5F5]';
  return (
    <div className={cn('rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3', className)}>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">{label}</div>
      <div className={cn('mt-1 text-xl font-extrabold tabular leading-none', color)}>{value}</div>
      {detail && <div className="mt-2 text-[11px] leading-relaxed text-[#D1D5DB]">{detail}</div>}
    </div>
  );
}
