import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { useApiStore } from '@shared/store/apiStore';

export function RevenueChart() {
  const calls = useApiStore((s) => s.recentCalls);

  const data = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = Date.now();
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now - i * 3600 * 1000);
      const key = `${t.getHours()}:00`;
      buckets[key] = 0;
    }
    for (const c of calls) {
      if (c.status !== 'paid') continue;
      const ageH = Math.floor((now - c.timestamp) / (3600 * 1000));
      if (ageH >= 24) continue;
      const t = new Date(c.timestamp);
      const key = `${t.getHours()}:00`;
      buckets[key] = (buckets[key] ?? 0) + c.amount;
    }
    return Object.entries(buckets).map(([hour, value]) => ({ hour, value }));
  }, [calls]);

  return (
    <div className="bg-[#151515] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#F5F5F5]">Revenue (24h)</h3>
        <span className="text-[10px] text-[#666666] uppercase tracking-wider">USDT</span>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BFFF00" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#BFFF00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fill: '#666', fontSize: 10 }} interval={3} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: '#0A0A0A',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: '#A3A3A3' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#BFFF00"
              strokeWidth={2}
              fill="url(#revGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
