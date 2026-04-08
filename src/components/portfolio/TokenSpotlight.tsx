import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Sparkline } from '../common/Sparkline';
import { TokenIcon } from '../common/TokenIcon';
import { tokenMeta } from '../../config/tokens';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface Props {
  symbol: string;
  usdValue: number;
  amount: number;
  pctOfPortfolio: number;
  series: number[];
  delay?: number;
}

/**
 * Replaces the old fake-candlestick CandlestickCard. Shows a real token with
 * its share of the portfolio and a sparkline derived from real backend data.
 */
export function TokenSpotlight({ symbol, usdValue, amount, pctOfPortfolio, series, delay = 0 }: Props) {
  const meta = tokenMeta(symbol);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex-1 bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 hover:border-[rgba(190,255,0,0.15)] transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <TokenIcon symbol={symbol} size={36} />
          <div>
            <div className="text-micro text-[#666]">X Layer</div>
            <h3 className="text-base font-bold text-[#F5F5F5]">{meta.name}</h3>
          </div>
        </div>
        <a
          href={`https://www.oklink.com/xlayer/token/${symbol.toLowerCase()}`}
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#A3A3A3] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F5F5] transition-colors"
          title="Open on explorer"
        >
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] text-[#666] uppercase tracking-wider">Position value</div>
          <div className="text-2xl font-extrabold text-[#F5F5F5] tabular">
            <AnimatedNumber value={usdValue} prefix="$" decimals={2} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#666] uppercase tracking-wider">Share</div>
          <div className="text-base font-bold text-[#BFFF00] tabular">
            {pctOfPortfolio.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="text-[11px] text-[#A3A3A3] font-mono mb-3">
        {amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {meta.symbol}
      </div>

      <Sparkline data={series} color={meta.color !== '#9CA3AF' ? meta.color : '#BFFF00'} height={48} />
    </motion.div>
  );
}
