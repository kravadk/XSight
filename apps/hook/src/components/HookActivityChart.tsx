import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface Event {
  blockNumber: number;
  tier: number;
  feeBps: number;
}

interface Props {
  events: Event[];
}

const TIER_COLOR: Record<number, string> = {
  0: '#9DA89C',
  1: '#4AA8E0',
  2: '#34C172',
  3: '#E7B84F',
};

function bucketByHour(events: Event[]): { hour: string; count: number; tier: number }[] {
  if (events.length === 0) {
    return Array.from({ length: 12 }, (_, i) => ({
      hour: `${i * 2}h`,
      count: 0,
      tier: 0,
    }));
  }
  const buckets: { count: number; tiers: Record<number, number> }[] = Array.from(
    { length: 12 },
    () => ({ count: 0, tiers: {} as Record<number, number> }),
  );
  const minBlock = Math.min(...events.map((e) => e.blockNumber));
  const maxBlock = Math.max(...events.map((e) => e.blockNumber));
  const span = Math.max(1, maxBlock - minBlock);
  events.forEach((e) => {
    const ratio = (e.blockNumber - minBlock) / span;
    const idx = Math.min(11, Math.floor(ratio * 12));
    buckets[idx].count += 1;
    buckets[idx].tiers[e.tier] = (buckets[idx].tiers[e.tier] ?? 0) + 1;
  });
  return buckets.map((b, i) => {
    let topTier = 0;
    let topCount = -1;
    Object.entries(b.tiers).forEach(([t, c]) => {
      if (c > topCount) {
        topTier = Number(t);
        topCount = c;
      }
    });
    return { hour: `${i * 2}h`, count: b.count, tier: topTier };
  });
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: { hour: string; tier: number } }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const color = TIER_COLOR[p.payload.tier];
  return (
    <div
      className="px-3 py-2 rounded-lg font-mono text-xs"
      style={{
        background: '#0A0A0A',
        border: `1px solid ${color}`,
        boxShadow: `0 0 16px ${color}55, 0 4px 12px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="text-stadium-text font-bold">{p.value} {p.value === 1 ? 'swap' : 'swaps'}</div>
      <div className="text-stadium-text-muted mt-0.5">@ {p.payload.hour} · T{p.payload.tier} dominant</div>
    </div>
  );
}

export function HookActivityChart({ events }: Props) {
  const data = useMemo(() => bucketByHour(events), [events]);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="stadium-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold">Hook firings · last activity window</div>
          <div className="font-display text-stadium-text text-2xl md:text-3xl mt-1" style={{ fontWeight: 800 }}>
            {events.length} <span className="text-base text-stadium-text-secondary">swaps</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-stadium-text-muted">
          {[0, 1, 2, 3].map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLOR[t] }} />
              T{t}
            </span>
          ))}
        </div>
      </div>

      <div className="h-44 md:h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
            <defs>
              {[0, 1, 2, 3].map((t) => (
                <linearGradient key={t} id={`bar-grad-${t}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TIER_COLOR[t]} stopOpacity={1} />
                  <stop offset="100%" stopColor={TIER_COLOR[t]} stopOpacity={0.35} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="hour"
              tick={{ fill: '#616B5F', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#616B5F', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              domain={[0, maxCount]}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={<CustomTooltip />}
            />
            <Bar dataKey="count" radius={[6, 6, 2, 2]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={`url(#bar-grad-${entry.tier})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
