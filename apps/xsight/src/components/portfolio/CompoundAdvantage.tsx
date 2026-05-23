import { Zap } from 'lucide-react';
import { useApiStore } from '@shared/store/apiStore';
import { AnimatedNumber } from '@shared/common/AnimatedNumber';

/**
 * Wide banner showing the value-add of XSight automated trading vs a
 * passive baseline. Uses real economy snapshot from backend.
 */
export function CompoundAdvantage() {
  const economy = useApiStore((s) => s.economy);

  const baseline = economy?.totalRevenueUsdt ?? 0;
  const withXsight = (economy?.netProfitUsdt ?? 0) + (economy?.lpYieldEarnedUsdt ?? 0);
  const advantage = baseline > 0 ? ((withXsight - baseline) / baseline) * 100 : 0;
  const positive = advantage >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[#0A0A0A] via-[#0E0E0E] to-[#0A0A0A] p-5 md:p-6">
      <div className="absolute -right-20 -top-20 w-60 h-60 bg-[rgba(191,255,0,0.04)] rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[rgba(191,255,0,0.08)] border border-[rgba(191,255,0,0.2)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#BFFF00]" />
          </div>
          <div>
            <div className="text-base font-bold text-[#F5F5F5]">XSight Edge</div>
            <div className="text-xs text-[#A3A3A3]">Why automated trading pays</div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10">
          <div className="text-left md:text-right">
            <div className="text-micro text-[#666]">Baseline</div>
            <div className="text-lg md:text-xl font-extrabold text-[#A3A3A3] tabular">
              <AnimatedNumber value={baseline} prefix="$" decimals={2} />
            </div>
          </div>
          <div className="text-left md:text-right">
            <div className="text-micro text-[#666]">With XSight</div>
            <div className="text-lg md:text-xl font-extrabold text-[#F5F5F5] tabular">
              <AnimatedNumber value={withXsight} prefix="$" decimals={2} />
            </div>
          </div>
          <div className="text-left md:text-right">
            <div className="text-micro text-[#666]">Edge</div>
            <div
              className={`text-xl md:text-2xl font-extrabold tabular ${positive ? 'text-[#BFFF00]' : 'text-[#EF4444]'}`}
            >
              {positive ? '+' : ''}
              {advantage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
