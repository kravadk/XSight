import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { X402_ENDPOINTS } from '@shared/config/endpoints';
import { AnimatedNumber } from '@shared/common/AnimatedNumber';

/**
 * Real revenue calculator. Pick how many calls/day for each endpoint and see
 * what monthly + annual revenue that translates to. No fluff — just math.
 */
export function PricingCalculator() {
  const [calls, setCalls] = useState<Record<string, number>>(() =>
    Object.fromEntries(X402_ENDPOINTS.map((e) => [e.path, 100])),
  );

  const totals = useMemo(() => {
    let perDay = 0;
    let totalCalls = 0;
    for (const ep of X402_ENDPOINTS) {
      const c = calls[ep.path] ?? 0;
      perDay += c * ep.price;
      totalCalls += c;
    }
    return {
      perDay,
      perMonth: perDay * 30,
      perYear: perDay * 365,
      totalCalls,
    };
  }, [calls]);

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#BFFF00]" />
          <h3 className="text-sm font-bold text-[#F5F5F5]">Revenue calculator</h3>
        </div>
        <span className="text-micro text-[#666]">Estimate your earnings</span>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {X402_ENDPOINTS.map((ep) => (
          <div
            key={ep.path}
            className="flex items-center gap-3 p-2.5 bg-[#1A1A1A] rounded-lg border border-[rgba(255,255,255,0.04)]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-[#F5F5F5] truncate">{ep.path}</code>
                <span className="text-[10px] text-[#BFFF00] tabular shrink-0">${ep.price.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={5000}
                step={50}
                value={calls[ep.path] ?? 0}
                onChange={(e) => setCalls((c) => ({ ...c, [ep.path]: Number(e.target.value) }))}
                className="w-24 md:w-32 accent-[#BFFF00]"
              />
              <input
                type="number"
                value={calls[ep.path] ?? 0}
                onChange={(e) => setCalls((c) => ({ ...c, [ep.path]: Math.max(0, Number(e.target.value)) }))}
                className="w-16 h-7 px-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded text-[11px] font-mono text-[#F5F5F5] tabular text-right focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
              />
              <span className="text-[10px] text-[#666] uppercase tracking-wider w-9 shrink-0">/day</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
        <div>
          <div className="text-[10px] text-[#666] uppercase tracking-wider">Per day</div>
          <div className="text-lg font-extrabold text-[#F5F5F5] tabular">
            <AnimatedNumber value={totals.perDay} prefix="$" decimals={2} />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#666] uppercase tracking-wider">Per month</div>
          <div className="text-lg font-extrabold text-[#BFFF00] tabular">
            <AnimatedNumber value={totals.perMonth} prefix="$" decimals={2} />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#666] uppercase tracking-wider">Per year</div>
          <div className="text-lg font-extrabold text-[#22C55E] tabular">
            <AnimatedNumber value={totals.perYear} prefix="$" decimals={2} />
          </div>
        </div>
      </div>
      <div className="text-[10px] text-[#666] text-center mt-2">
        {totals.totalCalls.toLocaleString()} calls/day total · revenue accrues to the agentic wallet on X Layer
      </div>
    </div>
  );
}
