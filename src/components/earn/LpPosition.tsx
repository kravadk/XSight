import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ECONOMY } from '../../utils/mockData';
import { formatUsd } from '../../utils/format';

export const LpPosition = () => (
  <div className="card p-6">
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="text-[16px] font-semibold">ETH/USDT · Uniswap v3</h3>
        <p className="text-[12px] text-[#9CA3AF]">X Layer</p>
      </div>
      <Badge tone="green">{ECONOMY.apr}% APR</Badge>
    </div>
    <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div>
        <div className="label mb-1">Deposited</div>
        <div className="text-[18px] font-bold">{formatUsd(ECONOMY.lpDeposited)}</div>
      </div>
      <div>
        <div className="label mb-1">Current</div>
        <div className="text-[18px] font-bold">
          {formatUsd(ECONOMY.lpCurrent)}{' '}
          <span className="text-[12px] font-medium text-[#00A344]">
            +{ECONOMY.lpChangePct}%
          </span>
        </div>
      </div>
      <div>
        <div className="label mb-1">Earned</div>
        <div className="text-[18px] font-bold text-[#00C853]">
          +{formatUsd(ECONOMY.lpEarned)}
        </div>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm">
        Withdraw
      </Button>
      <Button variant="green" size="sm">
        Add More
      </Button>
      <Button variant="ghost" size="sm">
        Explorer ↗
      </Button>
    </div>
  </div>
);
