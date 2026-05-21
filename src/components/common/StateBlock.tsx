import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { cn } from '../../utils/format';

type Kind = 'empty' | 'error' | 'success' | 'loading' | 'warning' | 'info';

const kindStyle: Record<Kind, { box: string; icon: string; Icon: typeof Info }> = {
  empty: { box: 'border-[rgba(255,255,255,0.08)] bg-[#0D0D0D]', icon: 'text-[#9CA3AF]', Icon: Info },
  error: { box: 'border-[rgba(239,68,68,0.24)] bg-[rgba(239,68,68,0.07)]', icon: 'text-[#FCA5A5]', Icon: AlertTriangle },
  success: { box: 'border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.07)]', icon: 'text-[#4ADE80]', Icon: CheckCircle2 },
  loading: { box: 'border-[rgba(56,189,248,0.20)] bg-[rgba(56,189,248,0.06)]', icon: 'text-[#7DD3FC]', Icon: Loader2 },
  warning: { box: 'border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.07)]', icon: 'text-[#FBBF24]', Icon: AlertTriangle },
  info: { box: 'border-[rgba(56,189,248,0.20)] bg-[rgba(56,189,248,0.06)]', icon: 'text-[#7DD3FC]', Icon: Info },
};

export function StateBlock({
  kind = 'empty',
  title,
  body,
  action,
  icon,
  compact,
  className,
}: {
  kind?: Kind;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const { box, icon: iconClass, Icon } = kindStyle[kind];
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 text-left',
        compact ? 'p-3' : 'min-h-[132px]',
        box,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/20', iconClass)}>
          {icon ?? <Icon className={cn('h-4 w-4', kind === 'loading' && 'animate-spin')} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold leading-snug text-[#F5F5F5]">{title}</div>
          {body && <div className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{body}</div>}
          {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
