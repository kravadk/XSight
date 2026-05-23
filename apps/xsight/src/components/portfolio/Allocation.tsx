import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useWalletStore } from '@shared/store/walletStore';
import { tokenMeta } from '@shared/config/tokens';
import { TokenIcon } from '@shared/common/TokenIcon';
import { AnimatedNumber } from '@shared/common/AnimatedNumber';

const PALETTE = ['#BFFF00', '#A78BFA', '#22C55E', '#F59E0B', '#38BDF8', '#EC4899'];

export function Allocation() {
  const tokens = useWalletStore((s) => s.tokens);
  const totalUsd = useWalletStore((s) => s.totalUsd);
  const loading = useWalletStore((s) => s.loading);

  const slices = useMemo(() => {
    const sorted = [...tokens]
      .filter((t) => t.usdValue > 0)
      .sort((a, b) => b.usdValue - a.usdValue);
    return sorted.map((t, i) => {
      const meta = tokenMeta(t.symbol);
      return {
        ...t,
        color: meta.color !== '#9CA3AF' ? meta.color : PALETTE[i % PALETTE.length],
        pct: totalUsd > 0 ? (t.usdValue / totalUsd) * 100 : 0,
      };
    });
  }, [tokens, totalUsd]);

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#F5F5F5]">Allocation</h3>
        <span className="text-micro text-[#666666]">{slices.length} assets</span>
      </div>

      <div className="flex items-center justify-center relative h-[180px]">
        {loading && slices.length === 0 && (
          <div className="skeleton w-32 h-32 rounded-full" />
        )}
        {!loading && slices.length === 0 && (
          <div className="text-xs text-[#666] text-center">No allocations yet</div>
        )}
        {slices.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="pct"
                  innerRadius={62}
                  outerRadius={84}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive
                  animationDuration={600}
                >
                  {slices.map((s) => (
                    <Cell key={s.symbol} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[10px] text-[#666] uppercase tracking-wider">TVL</div>
              <div className="text-xl font-extrabold text-[#F5F5F5]">
                <AnimatedNumber value={totalUsd} prefix="$" decimals={2} />
              </div>
            </div>
          </>
        )}
      </div>

      {slices.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {slices.slice(0, 5).map((s) => (
            <div key={s.symbol} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <TokenIcon symbol={s.symbol} size={18} />
                <span className="text-[#F5F5F5] font-semibold truncate">{s.symbol}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[#A3A3A3] tabular">{s.pct.toFixed(1)}%</span>
                <span className="text-[#F5F5F5] font-mono">${s.usdValue.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
