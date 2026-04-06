import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number | string;
}

export const Sparkline = ({
  data,
  color = '#00C853',
  height = 32,
  width = '100%',
}: SparklineProps) => {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`sp-${color}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#sp-${color})`}
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
