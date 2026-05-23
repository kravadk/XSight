import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { cn } from '@shared/utils/format';

interface Props {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: ReactNode;
  /** trend percent vs prior period; positive = green, negative = red */
  trendPct?: number;
  trendLabel?: string;
  hint?: string;
  /** progress fraction 0..1 to render the bottom bar */
  progress?: number;
  /** color for the progress bar (defaults to lime) */
  color?: string;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  prefix,
  suffix,
  decimals = 2,
  icon,
  trendPct,
  trendLabel,
  hint,
  progress,
  color = '#BFFF00',
  loading,
}: Props) {
  const trendUp = (trendPct ?? 0) >= 0;
  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 flex flex-col gap-3 hover:border-[rgba(255,255,255,0.1)] transition-colors">
      <div className="flex items-start justify-between">
        <span className="text-micro text-[#666666]">{label}</span>
        {icon && <div className="text-[#444]">{icon}</div>}
      </div>

      <div className="text-mega text-[#F5F5F5]">
        {loading ? (
          <span className="skeleton inline-block h-9 w-32" />
        ) : (
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        )}
      </div>

      {(trendPct !== undefined || hint) && (
        <div className="flex items-center gap-2 text-[11px]">
          {trendPct !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold',
                trendUp
                  ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]'
                  : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]',
              )}
            >
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendUp ? '+' : ''}
              {trendPct.toFixed(1)}%
            </span>
          )}
          {(trendLabel || hint) && (
            <span className="text-[#A3A3A3]">{trendLabel ?? hint}</span>
          )}
        </div>
      )}

      {progress !== undefined && (
        <div className="h-1 w-full rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(2, Math.min(100, progress * 100))}%`,
              background: color,
              boxShadow: `0 0 8px ${color}55`,
            }}
          />
        </div>
      )}
    </div>
  );
}
