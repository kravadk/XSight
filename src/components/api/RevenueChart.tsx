import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { REVENUE_HISTORY } from '../../utils/mockData';

export const RevenueChart = () => (
  <div className="card p-6">
    <h3 className="mb-4 text-[16px] font-semibold">Revenue (7d)</h3>
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={REVENUE_HISTORY}>
          <defs>
            <linearGradient id="revenueG" x1="0" x2="0" y1="0" y2="1">
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
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #F0F0F0',
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#00C853"
            strokeWidth={2}
            fill="url(#revenueG)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);
