import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@shared/utils/format';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Maximum (e.g. user balance) — enables MAX button and 25/50/75/100% presets */
  max?: number;
  presets?: number[];
  placeholder?: string;
  className?: string;
  rightSlot?: ReactNode;
  /** Optional formatter for display under input ("$X balance") */
  hint?: string;
}

export function AmountInput({
  value,
  onChange,
  max,
  presets = [25, 50, 75, 100],
  placeholder = '0.00',
  className,
  rightSlot,
  hint,
}: Props) {
  const setPercent = (pct: number) => {
    if (max === undefined || max <= 0) return;
    const v = (max * pct) / 100;
    onChange(v.toString());
  };

  const formatted = useMemo(() => {
    if (!value) return '';
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    return value;
  }, [value]);

  return (
    <div className={cn('bg-[#1A1A1A] rounded-xl p-4 border border-[rgba(255,255,255,0.06)] focus-within:border-[rgba(191,255,0,0.3)] transition-colors', className)}>
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          inputMode="decimal"
          value={formatted}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
            onChange(v);
          }}
          placeholder={placeholder}
          className="bg-transparent text-2xl font-extrabold text-[#F5F5F5] tabular w-full focus:outline-none min-w-0"
        />
        {rightSlot}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[#666] uppercase tracking-wider">{hint}</span>
        {max !== undefined && max > 0 && (
          <div className="flex items-center gap-1">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setPercent(p)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(191,255,0,0.1)] hover:text-[#BFFF00] text-[#A3A3A3] transition-colors"
              >
                {p === 100 ? 'MAX' : `${p}%`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
