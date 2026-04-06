import { HOLDINGS, TOKENS } from '../../utils/mockData';
import { formatUsd } from '../../utils/format';

export const Allocation = () => {
  const total = HOLDINGS.reduce((s, h) => s + h.value, 0);
  return (
    <div className="card p-6">
      <h3 className="mb-4 text-[16px] font-semibold">Allocation</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {HOLDINGS.map((h) => {
          const pct = (h.value / total) * 100;
          const color = TOKENS[h.symbol]?.color ?? '#9CA3AF';
          return (
            <div
              key={h.symbol}
              className="rounded-[12px] p-4 text-white"
              style={{
                background: color,
                minHeight: 120,
                gridColumn: pct > 40 ? 'span 2' : undefined,
              }}
            >
              <div className="text-[13px] opacity-90">{h.symbol}</div>
              <div className="text-[20px] font-bold">{formatUsd(h.value)}</div>
              <div className="text-[12px] opacity-90">{pct.toFixed(1)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
