import { motion } from 'framer-motion';
import { shortAddress } from '../../utils/format';

interface Props {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  hash: string;
}

export const TxSuccess = ({
  fromSymbol,
  toSymbol,
  fromAmount,
  toAmount,
  hash,
}: Props) => (
  <div className="card relative w-full max-w-[360px] overflow-hidden p-5 pt-6">
    <div className="absolute inset-x-0 top-0 h-[3px] bg-[#00C853]" />
    <div className="mb-4 flex items-center gap-2">
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00C853] text-[12px] font-bold text-white"
      >
        ✓
      </motion.span>
      <div className="text-[15px] font-semibold">Swap Complete</div>
    </div>

    <div className="mb-4 rounded-[12px] bg-[#FAFAFA] px-4 py-3 text-[14px] font-semibold">
      {fromAmount} {fromSymbol} → {toAmount} {toSymbol}
    </div>

    <div className="mb-2 flex items-center justify-between text-[13px]">
      <span className="text-[#6B7280]">Tx hash</span>
      <span className="font-mono text-[12px]">{shortAddress(hash)}</span>
    </div>
    <div className="mb-3 text-right">
      <a href="#" className="text-[12px] text-[#00C853]">
        View on explorer ↗
      </a>
    </div>

    <div className="flex items-center justify-between rounded-[12px] bg-[#F3F0FF] px-4 py-3 text-[13px]">
      <span className="text-[#6B7280]">New balance</span>
      <span className="font-semibold">
        {toAmount} {toSymbol}
      </span>
    </div>
  </div>
);
