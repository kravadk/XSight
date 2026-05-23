import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@shared/utils/format';

type Tone = 'info' | 'warning' | 'error' | 'success';

const config = {
  info: { Icon: Info, className: 'border-[rgba(56,189,248,0.22)] bg-[rgba(56,189,248,0.07)] text-[#7DD3FC]' },
  warning: { Icon: AlertTriangle, className: 'border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.07)] text-[#FBBF24]' },
  error: { Icon: AlertTriangle, className: 'border-[rgba(239,68,68,0.24)] bg-[rgba(239,68,68,0.07)] text-[#FCA5A5]' },
  success: { Icon: CheckCircle2, className: 'border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.07)] text-[#4ADE80]' },
};

export function InlineAlert({
  tone = 'info',
  title,
  body,
  className,
}: {
  tone?: Tone;
  title: string;
  body?: string;
  className?: string;
}) {
  const { Icon, className: toneClass } = config[tone];
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5', toneClass, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs font-extrabold leading-snug">{title}</div>
        {body && <div className="mt-0.5 text-[11px] leading-relaxed text-[#D1D5DB]">{body}</div>}
      </div>
    </div>
  );
}
