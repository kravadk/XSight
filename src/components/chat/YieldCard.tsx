import { AiBadge } from '../common/AiBadge';
import { Button } from '../common/Button';
import { POOLS } from '../../utils/mockData';
import { formatCompact } from '../../utils/format';

interface Props {
  name: string;
}

export const YieldCard = ({ name }: Props) => {
  const pool = POOLS.find((p) => p.name === name) ?? POOLS[0]!;
  return (
    <div className="card relative w-full max-w-[340px] p-5">
      <div className="absolute right-4 top-4">
        <AiBadge />
      </div>
      <div className="mb-1 text-[15px] font-semibold">🏊 {pool.name} Pool</div>
      <div className="mb-4 text-[12px] text-[#9CA3AF]">{pool.platform}</div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div>
          <div className="label mb-1">APR</div>
          <div className="text-[22px] font-bold text-[#00C853]">{pool.apr}%</div>
        </div>
        <div>
          <div className="label mb-1">TVL</div>
          <div className="text-[15px] font-semibold">{formatCompact(pool.tvl)}</div>
        </div>
        <div>
          <div className="label mb-1">24h Vol</div>
          <div className="text-[15px] font-semibold">{formatCompact(pool.volume24h)}</div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1.5 text-[13px] text-[#6B7280]">
        Risk: <span className="font-semibold text-[#00A344]">{pool.risk}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#00C853]" />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="green" size="sm">
          Add Liquidity
        </Button>
        <Button variant="ghost" size="sm">
          Compare Pools
        </Button>
      </div>
    </div>
  );
};
