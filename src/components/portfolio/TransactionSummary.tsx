import { useApiStore } from '../../store/apiStore';
import { Sparkline } from '../common/Sparkline';
import { useRevenueCumulative, useRevenueSeries } from '../../hooks/useRevenueSeries';
import { AnimatedNumber } from '../common/AnimatedNumber';

export function TransactionSummary() {
  const callsToday = useApiStore((s) => s.callsToday);
  const totalEarned = useApiStore((s) => s.totalEarned);
  const cumSeries = useRevenueCumulative(24);
  const hourSeries = useRevenueSeries(24);

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#F5F5F5]">x402 Activity</h3>
        <span className="text-micro text-[#666]">24H</span>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-micro text-[#666] mb-1">Total earned</div>
          <div className="text-2xl font-extrabold text-[#F5F5F5] tabular">
            <AnimatedNumber value={totalEarned} prefix="$" decimals={2} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-micro text-[#666] mb-1">Calls 24h</div>
          <div className="text-2xl font-extrabold text-[#BFFF00] tabular">{callsToday}</div>
        </div>
      </div>

      <Sparkline data={cumSeries} color="#BFFF00" height={56} />

      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-[#666]">
        {['Quiet', 'Active', 'Peak'].map((label, i) => {
          const peak = Math.max(...hourSeries, 0);
          const intensity = peak > 0 ? (hourSeries[hourSeries.length - 1 - i * 7] ?? 0) / peak : 0;
          return (
            <div key={label} className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: intensity > 0.5 ? '#BFFF00' : intensity > 0 ? '#A78BFA' : '#333',
                }}
              />
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
