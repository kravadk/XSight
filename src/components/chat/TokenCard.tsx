import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Sparkline } from '../common/Sparkline';
import { TokenIcon } from '../common/TokenIcon';
import { AiBadge } from '../common/AiBadge';
import { TOKENS } from '../../utils/mockData';
import { formatCompact, formatPct, formatUsd } from '../../utils/format';

interface Props {
  symbol: string;
}

export const TokenCard = ({ symbol }: Props) => {
  const token = TOKENS[symbol];
  if (!token) return null;
  const positive = token.change24h >= 0;
  return (
    <div className="card relative w-full max-w-[320px] p-4">
      <div className="absolute right-3 top-3">
        <AiBadge />
      </div>
      <div className="mb-3 flex items-center gap-3">
        <TokenIcon symbol={symbol} />
        <div>
          <div className="text-[15px] font-semibold text-[#0D0D0D]">
            {token.name}
          </div>
          <div className="text-[12px] text-[#9CA3AF]">{token.symbol}</div>
        </div>
      </div>

      <div className="mb-1 flex items-end justify-between gap-2">
        <div className="text-[20px] font-bold">{formatUsd(token.price, token.price < 10 ? 4 : 2)}</div>
        <Badge tone={positive ? 'green' : 'red'}>
          {formatPct(token.change24h)}
        </Badge>
      </div>
      <div className="mb-3 text-[13px] text-[#6B7280]">
        Vol {formatCompact(token.volume24h)} · MCap {formatCompact(token.marketCap)}
      </div>

      <div className="mb-3">
        <Sparkline
          data={token.sparkline}
          color={positive ? '#00C853' : '#EF4444'}
          height={36}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="!text-[#00C853]">
          Buy ↗
        </Button>
        <Button variant="ghost" size="sm">
          Details
        </Button>
        <Button variant="ghost" size="sm">
          🛡️ Risk
        </Button>
      </div>
    </div>
  );
};
