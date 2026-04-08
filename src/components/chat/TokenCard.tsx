import { ShieldAlert, ArrowUpRight, Info, ArrowDownRight } from 'lucide-react';
import { tokenMeta } from '../../config/tokens';
import { useChat } from '../../hooks/useChat';
import { useWalletStore } from '../../store/walletStore';
import { TokenIcon } from '../common/TokenIcon';
import { Sparkline } from '../common/Sparkline';
import { useTokenPrice } from '../../hooks/useTokenPrice';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { cn } from '../../utils/format';

interface Props {
  symbol?: string;
}

export function TokenCard({ symbol = 'OKB' }: Props) {
  const meta = tokenMeta(symbol);
  const { send } = useChat();
  const tokens = useWalletStore((s) => s.tokens);
  const holding = tokens.find((t) => t.symbol.toUpperCase() === meta.symbol.toUpperCase());
  const { price, change24h, loading } = useTokenPrice(meta.symbol);

  // Synthetic 24-step price series from current price + change (intermediate
  // smooth interpolation that lands on `price` and starts at price/(1+chg)).
  const series = (() => {
    if (price == null) return [] as number[];
    const start = change24h != null ? price / (1 + change24h / 100) : price;
    const arr: number[] = [];
    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      // mild sine wiggle on top of linear trend so the line isn't dead-straight
      const wiggle = Math.sin(i * 0.7) * (price * 0.003);
      arr.push(start + (price - start) * t + wiggle);
    }
    return arr;
  })();

  const positive = (change24h ?? 0) >= 0;

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 mt-1 w-full max-w-[360px]">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <TokenIcon symbol={meta.symbol} size={36} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#F5F5F5]">{meta.symbol}</h3>
              <span className="text-xs text-[#A3A3A3]">{meta.name}</span>
            </div>
            <div className="text-[10px] text-[#666] uppercase tracking-wider mt-0.5">X Layer</div>
          </div>
        </div>

        <div className="w-[110px]">
          <Sparkline
            data={series}
            color={positive ? '#22C55E' : '#EF4444'}
            height={40}
          />
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-4">
        <div className="text-2xl font-extrabold text-[#F5F5F5] tabular">
          {loading ? (
            <span className="skeleton inline-block h-7 w-24" />
          ) : price != null ? (
            <AnimatedNumber value={price} prefix="$" decimals={price < 1 ? 4 : 2} />
          ) : (
            '—'
          )}
        </div>
        {change24h != null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded',
              positive
                ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]'
                : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]',
            )}
          >
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {positive ? '+' : ''}
            {change24h.toFixed(2)}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <div className="text-micro text-[#666] mb-1">Your balance</div>
          <div className="text-sm font-mono text-[#F5F5F5] tabular">
            {holding ? holding.amount.toFixed(4) : '0.0000'}
          </div>
        </div>
        <div>
          <div className="text-micro text-[#666] mb-1">USD value</div>
          <div className="text-sm font-mono text-[#F5F5F5] tabular">
            ${holding ? holding.usdValue.toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => void send(`Swap 50 USDT to ${meta.symbol}`)}
          className="flex-1 h-9 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F5] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Buy
        </button>
        <button
          onClick={() => void send(`Tell me more about ${meta.symbol}`)}
          className="flex-1 h-9 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F5] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" /> Details
        </button>
        <button
          onClick={() => void send(`Risk scan ${meta.symbol}`)}
          className="flex-1 h-9 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F5] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Risk
        </button>
      </div>
    </div>
  );
}
