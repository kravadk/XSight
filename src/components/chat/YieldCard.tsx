import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, ExternalLink } from 'lucide-react';
import { api, type PoolStatDto } from '../../api/client';
import { useChat } from '../../hooks/useChat';
import { TokenIcon } from '../common/TokenIcon';

interface Props {
  pairs?: string[];
}

/**
 * Yield discovery card. Renders one mini-card per Uniswap pool the AI
 * recommended. Pool data comes from the public /api/status/pools endpoint
 * (real OnchainOS Market data, not fabricated).
 */
export function YieldCard({ pairs }: Props) {
  const [pools, setPools] = useState<PoolStatDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { send } = useChat();

  useEffect(() => {
    let cancelled = false;
    void api
      .pools()
      .then((res) => {
        if (cancelled) return;
        const all = res.pools ?? [];
        // If the AI specified pairs, filter to those; otherwise show all
        const filtered = pairs && pairs.length > 0 ? all.filter((p) => pairs.includes(p.pair)) : all;
        setPools(filtered.length > 0 ? filtered : all);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [pairs]);

  if (error) {
    return (
      <div className="bg-[#161616] rounded-2xl border border-[rgba(239,68,68,0.2)] p-4 mt-1 w-full max-w-[400px] text-xs text-[#EF4444]">
        Pool data unavailable: {error}
      </div>
    );
  }

  if (!pools) {
    return (
      <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 mt-1 w-full max-w-[400px]">
        <div className="skeleton h-4 w-32 mb-3" />
        <div className="skeleton h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-1 w-full max-w-[400px]">
      {pools.slice(0, 3).map((pool) => {
        const [base, quote] = pool.pair.split('/');
        return (
          <div
            key={pool.pair}
            className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-4 hover:border-[rgba(190,255,0,0.15)] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <TokenIcon symbol={base} size={22} />
                  <TokenIcon symbol={quote} size={22} className="ring-2 ring-[#161616]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F5F5F5]">{pool.pair}</div>
                  <div className="text-[10px] text-[#666] uppercase tracking-wider">
                    Uniswap V3 · X Layer
                  </div>
                </div>
              </div>
              <div className="px-2 py-1 bg-[rgba(167,139,250,0.08)] text-[#A78BFA] text-[10px] font-bold rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <div className="text-[10px] text-[#666] uppercase tracking-wider">APR</div>
                <div className="text-base font-extrabold text-[#BFFF00] tabular flex items-center gap-1">
                  {pool.estAprPct.toFixed(2)}%
                  <TrendingUp className="w-3 h-3" />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#666] uppercase tracking-wider">TVL</div>
                <div className="text-sm font-bold text-[#F5F5F5] tabular">
                  ${(pool.tvlUsd / 1_000_000).toFixed(1)}M
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#666] uppercase tracking-wider">Vol 24h</div>
                <div className="text-sm font-bold text-[#F5F5F5] tabular">
                  ${(pool.volume24hUsd / 1000).toFixed(0)}K
                </div>
              </div>
            </div>

            {pool.router && (
              <div className="text-[10px] text-[#666] mb-3 truncate">Router: {pool.router}</div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => void send(`Add ${pool.pair} liquidity`)}
                className="flex-1 h-9 bg-[#BFFF00] hover:bg-[#D4FF33] text-[#0A0A0A] text-xs font-bold rounded-lg transition-colors"
              >
                Add Liquidity
              </button>
              <a
                href="https://www.oklink.com/xlayer"
                target="_blank"
                rel="noreferrer"
                className="h-9 px-3 flex items-center gap-1 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F5] text-xs font-bold rounded-lg transition-colors"
              >
                Pool <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
