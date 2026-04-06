import { AiBadge } from '../common/AiBadge';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { TokenIcon } from '../common/TokenIcon';
import { HOLDINGS, WALLET } from '../../utils/mockData';
import { formatNum, formatUsd } from '../../utils/format';

interface Props {
  advice: string;
}

export const PortfolioCard = ({ advice }: Props) => {
  const total = HOLDINGS.reduce((s, h) => s + h.value, 0);
  return (
    <div className="card relative w-full max-w-[440px] p-5">
      <div className="absolute right-4 top-4">
        <AiBadge />
      </div>
      <div className="mb-1 text-[13px] font-medium text-[#6B7280]">Portfolio</div>
      <div className="mb-4 flex items-end gap-3">
        <div className="text-[28px] font-bold leading-none">{formatUsd(total)}</div>
        <Badge tone="green">+{formatUsd(WALLET.todayPnl)} ({WALLET.todayPnlPct}%)</Badge>
      </div>

      <div className="mb-4 overflow-hidden rounded-[12px] border border-[#F0F0F0]">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr] gap-2 bg-[#FAFAFA] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
          <span>Token</span>
          <span>Balance</span>
          <span>Value</span>
          <span>Share</span>
        </div>
        {HOLDINGS.map((h) => {
          const share = (h.value / total) * 100;
          return (
            <div
              key={h.symbol}
              className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr] items-center gap-2 border-t border-[#F0F0F0] px-4 py-3 text-[13px]"
            >
              <div className="flex items-center gap-2">
                <TokenIcon symbol={h.symbol} size={22} />
                <span className="font-medium">{h.symbol}</span>
              </div>
              <span className="text-[#6B7280]">{formatNum(h.amount, h.amount < 1 ? 4 : 2)}</span>
              <span className="font-medium">{formatUsd(h.value)}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-[#F0F0F0]">
                  <div
                    className="h-full rounded-full bg-[#00C853]"
                    style={{ width: `${share}%` }}
                  />
                </div>
                <span className="w-9 text-right text-[#6B7280]">{share.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 rounded-[12px] border-l-2 border-[#7C5CFC] bg-[#F3F0FF] px-4 py-3 text-[13px] italic text-[#4B3AA8]">
        "{advice}"
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ai">Rebalance ✦</Button>
        <Button variant="ghost">Refresh</Button>
      </div>
    </div>
  );
};
