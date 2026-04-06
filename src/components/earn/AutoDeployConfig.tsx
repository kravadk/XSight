import { useState } from 'react';
import { Button } from '../common/Button';
import { ECONOMY } from '../../utils/mockData';

export const AutoDeployConfig = () => {
  const [enabled, setEnabled] = useState(ECONOMY.auto.enabled);
  const [threshold, setThreshold] = useState(ECONOMY.auto.threshold);
  const [amount, setAmount] = useState(ECONOMY.auto.amount);
  const [pool, setPool] = useState(ECONOMY.auto.pool);

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-[16px] font-semibold">Auto-deploy</h3>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <div className="label mb-2">Enabled</div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              enabled ? 'bg-[#00C853]' : 'bg-[#E5E7EB]'
            }`}
          >
            <span
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
              style={{ transform: `translateX(${enabled ? 22 : 2}px)` }}
            />
          </button>
        </div>

        <div>
          <div className="label mb-2">Threshold (USDT)</div>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="h-11 w-full rounded-[12px] border border-[#F0F0F0] bg-[#FAFAFA] px-4 text-[14px] outline-none focus:border-[#0D0D0D]"
          />
        </div>

        <div>
          <div className="label mb-2">Deploy amount: {amount}%</div>
          <input
            type="range"
            min={0}
            max={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-[#00C853]"
          />
        </div>

        <div>
          <div className="label mb-2">Target pool</div>
          <select
            value={pool}
            onChange={(e) => setPool(e.target.value)}
            className="h-11 w-full rounded-[12px] border border-[#F0F0F0] bg-[#FAFAFA] px-4 text-[14px] outline-none focus:border-[#0D0D0D]"
          >
            <option>ETH/USDT</option>
            <option>OKB/USDT</option>
            <option>USDC/USDT</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        <Button>Save</Button>
      </div>
    </div>
  );
};
