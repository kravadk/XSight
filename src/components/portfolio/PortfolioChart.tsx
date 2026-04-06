import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Pill } from '../common/Pill';
import { PORTFOLIO_HISTORY } from '../../utils/mockData';
import { formatUsd } from '../../utils/format';

const ranges = ['1D', '1W', '1M', '3M', 'All'];

export const PortfolioChart = () => {
  const [range, setRange] = useState('1M');
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[16px] font-semibold">Value over time</h3>
        <div className="flex gap-1.5">
          {ranges.map((r) => (
            <Pill key={r} active={range === r} onClick={() => setRange(r)}>
              {r}
            </Pill>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={PORTFOLIO_HISTORY}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#00C853" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00C853" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F0F0F0" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${Math.round(v)}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #F0F0F0',
                fontSize: 12,
              }}
              formatter={(value: number) => [formatUsd(value), 'Value']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00C853"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
