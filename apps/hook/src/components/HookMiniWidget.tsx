import type { ReactNode } from 'react';
import { Sparkline } from '@shared/common/Sparkline';
import { AnimatedNumber } from '@shared/common/AnimatedNumber';
import { Trophy } from 'lucide-react';

type Variant = 'saved' | 'fans' | 'firings' | 'pot';

interface Props {
  variant: Variant;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  /** Optional micro-chart series (Sparkline / histogram) */
  series?: number[];
  /** Optional footer line (countdown, helper) */
  footer?: string;
  loading?: boolean;
}

const STYLE: Record<Variant, { ring: string; tint: string; glow: string; label: string }> = {
  saved: {
    ring: 'border-[rgba(231,184,79,0.32)]',
    tint: 'bg-[linear-gradient(180deg,rgba(231,184,79,0.10)_0%,rgba(231,184,79,0.02)_100%)]',
    glow: 'shadow-[0_0_24px_rgba(231,184,79,0.18)]',
    label: 'text-gold',
  },
  fans: {
    ring: 'border-[rgba(74,168,224,0.32)]',
    tint: 'bg-[linear-gradient(180deg,rgba(74,168,224,0.10)_0%,rgba(74,168,224,0.02)_100%)]',
    glow: 'shadow-[0_0_24px_rgba(74,168,224,0.18)]',
    label: 'text-outcome-away',
  },
  firings: {
    ring: 'border-[rgba(52,193,114,0.32)]',
    tint: 'bg-[linear-gradient(180deg,rgba(52,193,114,0.10)_0%,rgba(52,193,114,0.02)_100%)]',
    glow: 'shadow-[0_0_24px_rgba(52,193,114,0.18)]',
    label: 'text-pitch',
  },
  pot: {
    ring: 'border-[rgba(231,184,79,0.45)]',
    tint: 'bg-[linear-gradient(180deg,rgba(231,184,79,0.16)_0%,rgba(231,184,79,0.04)_100%)]',
    glow: 'shadow-[0_0_32px_rgba(231,184,79,0.32)]',
    label: 'text-gold',
  },
};

function MiniHistogram({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-8 w-full">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: color,
            opacity: 0.45 + 0.55 * (v / max),
          }}
        />
      ))}
    </div>
  );
}

function FanRings({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="opacity-90">
      <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="55 100" strokeLinecap="round" transform="rotate(-90 18 18)" />
      <circle cx="18" cy="18" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="40 100" strokeLinecap="round" opacity="0.7" transform="rotate(-90 18 18)" />
      <circle cx="18" cy="18" r="6" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="25 100" strokeLinecap="round" opacity="0.45" transform="rotate(-90 18 18)" />
    </svg>
  );
}

export function HookMiniWidget({ variant, label, value, prefix, suffix, series, footer, loading }: Props) {
  const s = STYLE[variant];
  const decoration: ReactNode = (() => {
    if (loading) return null;
    if (variant === 'saved' && series && series.length > 0) {
      return <Sparkline data={series} color="#E7B84F" height={28} />;
    }
    if (variant === 'firings' && series && series.length > 0) {
      return <MiniHistogram data={series} color="#34C172" />;
    }
    if (variant === 'fans') {
      return <FanRings color="#4AA8E0" />;
    }
    if (variant === 'pot') {
      return <Trophy className="w-7 h-7 text-gold drop-shadow-[0_0_8px_rgba(231,184,79,0.6)]" />;
    }
    return null;
  })();

  return (
    <div
      className={`relative rounded-2xl border ${s.ring} ${s.tint} ${s.glow} p-4 flex flex-col justify-between min-h-[130px] overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] tracking-[0.18em] uppercase font-bold ${s.label}`}>{label}</span>
        {(variant === 'fans' || variant === 'pot') && (
          <div className="flex-shrink-0">{decoration}</div>
        )}
      </div>

      <div className="font-display text-stadium-text text-3xl leading-none my-2" style={{ fontWeight: 800 }}>
        {loading ? (
          <span className="skeleton inline-block h-8 w-20" />
        ) : (
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={variant === 'saved' || variant === 'pot' ? 2 : 0} />
        )}
      </div>

      {(variant === 'saved' || variant === 'firings') && decoration}

      {footer && (
        <div className="text-[11px] text-stadium-text-secondary mt-1">{footer}</div>
      )}
    </div>
  );
}
