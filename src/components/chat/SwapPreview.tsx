import { AiBadge } from '../common/AiBadge';
import { Button } from '../common/Button';
import { TokenIcon } from '../common/TokenIcon';
import { TOKENS } from '../../utils/mockData';
import { formatNum } from '../../utils/format';
import { useMockSwap } from '../../hooks/useMockSwap';

interface Props {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
}

export const SwapPreview = ({ fromSymbol, toSymbol, fromAmount, toAmount }: Props) => {
  const { execute } = useMockSwap();
  const fromPrice = TOKENS[fromSymbol]?.price ?? 0;
  const toPrice = TOKENS[toSymbol]?.price ?? 1;
  const rate = +(fromPrice / toPrice).toFixed(6);

  return (
    <div className="card relative w-full max-w-[360px] p-5">
      <div className="absolute right-4 top-4">
        <AiBadge />
      </div>
      <div className="mb-1 text-[13px] font-medium text-[#6B7280]">Swap preview</div>

      <div className="my-3 flex items-center gap-3">
        <div className="flex-1 rounded-[12px] bg-[#FAFAFA] p-3">
          <div className="label mb-1">From</div>
          <div className="mb-1 text-[20px] font-bold">{formatNum(fromAmount, fromAmount < 1 ? 4 : 2)}</div>
          <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
            <TokenIcon symbol={fromSymbol} size={20} />
            {fromSymbol}
          </div>
        </div>
        <div className="text-[18px] text-[#9CA3AF]">→</div>
        <div className="flex-1 rounded-[12px] bg-[#FAFAFA] p-3">
          <div className="label mb-1">To</div>
          <div className="mb-1 text-[20px] font-bold">{formatNum(toAmount, toAmount < 1 ? 4 : 2)}</div>
          <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
            <TokenIcon symbol={toSymbol} size={20} />
            {toSymbol}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <div className="flex justify-between text-[#6B7280]">
          <span>Rate</span>
          <span className="font-medium text-[#0D0D0D]">
            1 {fromSymbol} = {rate} {toSymbol}
          </span>
        </div>
        <div className="flex justify-between text-[#6B7280]">
          <span>Gas</span>
          <span className="font-medium text-[#0D0D0D]">&lt; $0.001</span>
        </div>
        <div className="col-span-2 flex justify-between text-[#6B7280]">
          <span>Route</span>
          <span className="font-medium text-[#0D0D0D]">
            {fromSymbol} → WETH → {toSymbol}
          </span>
        </div>
        <div className="col-span-2 flex justify-between text-[#6B7280]">
          <span>Price impact</span>
          <span className="flex items-center gap-1.5 font-medium text-[#0D0D0D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00C853]" /> 0.02%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="green"
          full
          onClick={() => execute(fromSymbol, toSymbol, fromAmount, toAmount)}
        >
          Execute Swap
        </Button>
        <Button variant="secondary">Cancel</Button>
      </div>
    </div>
  );
};
