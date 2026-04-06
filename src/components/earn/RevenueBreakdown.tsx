import { ECONOMY } from '../../utils/mockData';
import { formatUsd } from '../../utils/format';

interface Row {
  label: string;
  value: number;
  pct: number;
  color: string;
}

export const RevenueBreakdown = () => {
  const income: Row[] = [
    { label: 'x402 API', value: 4.82, pct: 87, color: '#00C853' },
    { label: 'LP Yield', value: 0.72, pct: 13, color: '#7C5CFC' },
  ];
  const expenses: Row[] = [
    { label: 'Gas', value: ECONOMY.expenses.gas, pct: 4, color: '#9CA3AF' },
    { label: 'Claude API', value: ECONOMY.expenses.ai, pct: 96, color: '#9CA3AF' },
  ];
  return (
    <div className="card p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-[14px] font-semibold">Income</h3>
          <div className="space-y-3">
            {income.map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-[#6B7280]">{r.label}</span>
                  <span className="font-medium">
                    {formatUsd(r.value)}{' '}
                    <span className="text-[#9CA3AF]">({r.pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#F0F0F0]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.pct}%`, background: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-[14px] font-semibold">Expenses</h3>
          <div className="space-y-3">
            {expenses.map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-[#6B7280]">{r.label}</span>
                  <span className="font-medium">{formatUsd(r.value)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#F0F0F0]">
                  <div
                    className="h-full rounded-full bg-[#9CA3AF]"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-[#F0F0F0] pt-4">
        <div className="text-[13px] font-medium text-[#6B7280]">Net profit</div>
        <div className="text-[24px] font-bold text-[#00C853]">
          {formatUsd(ECONOMY.net)}
        </div>
      </div>
    </div>
  );
};
