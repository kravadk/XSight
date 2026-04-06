import { Badge } from '../common/Badge';
import { TokenIcon } from '../common/TokenIcon';
import { HOLDINGS, TOKENS } from '../../utils/mockData';
import { formatNum, formatPct, formatUsd } from '../../utils/format';

export const HoldingsTable = () => {
  const total = HOLDINGS.reduce((s, h) => s + h.value, 0);
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[#F0F0F0] p-6 pb-4">
        <h3 className="text-[16px] font-semibold">Holdings</h3>
      </div>
      <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] gap-4 bg-[#FAFAFA] px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
        <span>Token</span>
        <span>Amount</span>
        <span>Value</span>
        <span>Allocation</span>
        <span>Price</span>
        <span>24h</span>
      </div>
      {HOLDINGS.map((h) => {
        const t = TOKENS[h.symbol]!;
        const share = (h.value / total) * 100;
        const pos = t.change24h >= 0;
        return (
          <div
            key={h.symbol}
            className="grid cursor-pointer grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 border-t border-[#F0F0F0] px-6 py-4 text-[14px] transition-colors hover:bg-[#FAFAFA]"
          >
            <div className="flex items-center gap-3">
              <TokenIcon symbol={h.symbol} size={28} />
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-[12px] text-[#9CA3AF]">{t.symbol}</div>
              </div>
            </div>
            <span className="text-[#6B7280]">
              {formatNum(h.amount, h.amount < 1 ? 4 : 2)}
            </span>
            <span className="font-medium">{formatUsd(h.value)}</span>
            <span className="text-[#6B7280]">{share.toFixed(1)}%</span>
            <span className="text-[#6B7280]">
              {formatUsd(t.price, t.price < 10 ? 4 : 2)}
            </span>
            <Badge tone={pos ? 'green' : 'red'}>{formatPct(t.change24h)}</Badge>
          </div>
        );
      })}
    </div>
  );
};
