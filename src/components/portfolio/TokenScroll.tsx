import { motion } from 'framer-motion';
import { Badge } from '../common/Badge';
import { Sparkline } from '../common/Sparkline';
import { TokenIcon } from '../common/TokenIcon';
import { TOKENS } from '../../utils/mockData';
import { formatPct, formatUsd } from '../../utils/format';

export const TokenScroll = () => {
  const tokens = Object.values(TOKENS);
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto">
      {tokens.map((t, i) => {
        const pos = t.change24h >= 0;
        return (
          <motion.div
            key={t.symbol}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card flex-none p-4"
            style={{ width: 220 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <TokenIcon symbol={t.symbol} size={28} />
              <div>
                <div className="text-[14px] font-semibold">{t.symbol}</div>
                <div className="text-[11px] text-[#9CA3AF]">{t.name}</div>
              </div>
            </div>
            <div className="mb-1 text-[18px] font-bold">
              {formatUsd(t.price, t.price < 10 ? 4 : 2)}
            </div>
            <Sparkline
              data={t.sparkline}
              color={pos ? '#00C853' : '#EF4444'}
              height={28}
            />
            <div className="mt-2">
              <Badge tone={pos ? 'green' : 'red'}>{formatPct(t.change24h)}</Badge>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
