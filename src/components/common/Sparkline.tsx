import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

interface Props {
  data: number[];
  color?: string;
  height?: number;
  fillOpacity?: number;
}

/**
 * Tiny inline area chart. Renders nothing if no data.
 */
export function Sparkline({ data, color = '#BFFF00', height = 36, fillOpacity = 0.18 }: Props) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center text-[10px] text-[#444]"
      >
        no data
      </div>
    );
  }
  const series = data.map((v, i) => ({ i, v }));
  const gradId = `spark-${color.replace('#', '')}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
