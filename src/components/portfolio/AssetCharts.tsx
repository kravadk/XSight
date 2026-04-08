import { Settings2 } from 'lucide-react';
import { Toggle } from '../common/Toggle';
import { useState } from 'react';
import { TokenSpotlight } from './TokenSpotlight';
import { useWalletStore } from '../../store/walletStore';
import { useRevenueCumulative } from '../../hooks/useRevenueSeries';
import { Skeleton } from '../common/Skeleton';

const TIMEFRAMES = ['24H', '12H', '6H'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];
const TF_HOURS: Record<Timeframe, number> = { '24H': 24, '12H': 12, '6H': 6 };

export function AssetCharts() {
  const tokens = useWalletStore((s) => s.tokens);
  const totalUsd = useWalletStore((s) => s.totalUsd);
  const loading = useWalletStore((s) => s.loading);
  const [timeframe, setTimeframe] = useState<Timeframe>('24H');
  const [hideDust, setHideDust] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const series = useRevenueCumulative(TF_HOURS[timeframe]);
  const filtered = tokens.filter((t) => (hideDust ? t.usdValue >= 1 : true));
  const top = [...filtered].sort((a, b) => b.usdValue - a.usdValue).slice(0, 2);
  const filterCount = hideDust ? 1 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[#F5F5F5]">Top Holdings</h2>
          <span className="text-micro px-2 py-0.5 bg-[rgba(191,255,0,0.08)] text-[#BFFF00] rounded flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BFFF00]" />
            {filtered.length} ASSETS
          </span>
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="flex bg-[rgba(255,255,255,0.04)] rounded-full p-1">
            {TIMEFRAMES.map((time) => (
              <button
                key={time}
                onClick={() => setTimeframe(time)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors tabular ${
                  timeframe === time ? 'bg-[#BFFF00] text-[#0A0A0A]' : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.04)] text-[#A3A3A3] text-[11px] font-bold hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            Filters
            {filterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#BFFF00] text-[#0A0A0A] flex items-center justify-center text-[9px]">
                {filterCount}
              </span>
            )}
          </button>
          {filtersOpen && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setFiltersOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-xl p-2 z-[70] shadow-xl">
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs text-[#F5F5F5]">
                  <span>Hide dust (&lt; $1)</span>
                  <Toggle checked={hideDust} onChange={setHideDust} size="sm" ariaLabel="Hide dust" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {loading && top.length === 0 && (
          <>
            <div className="flex-1 bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 flex flex-col gap-3">
              <Skeleton width={120} height={14} />
              <Skeleton width={180} height={28} />
              <Skeleton width="100%" height={48} />
            </div>
            <div className="flex-1 bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 flex flex-col gap-3">
              <Skeleton width={120} height={14} />
              <Skeleton width={180} height={28} />
              <Skeleton width="100%" height={48} />
            </div>
          </>
        )}
        {!loading && top.length === 0 && (
          <div className="flex-1 bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-8 text-center text-xs text-[#666]">
            No holdings to display
          </div>
        )}
        {top.map((tok, i) => {
          const pct = totalUsd > 0 ? (tok.usdValue / totalUsd) * 100 : 0;
          return (
            <TokenSpotlight
              key={tok.symbol + timeframe}
              symbol={tok.symbol}
              usdValue={tok.usdValue}
              amount={tok.amount}
              pctOfPortfolio={pct}
              series={series}
              delay={i * 0.08}
            />
          );
        })}
      </div>
    </div>
  );
}
