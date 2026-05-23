import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@shared/api/client';

interface Snapshot {
  timestamp: number;
  totalUsd: number;
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function PortfolioHistoryChart() {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.portfolioHistory()
      .then(({ history: h }) => setHistory(h))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton h-40 rounded-2xl" />;
  if (history.length < 2) return null; // don't show with insufficient data

  const min = Math.min(...history.map(h => h.totalUsd)) * 0.99;
  const max = Math.max(...history.map(h => h.totalUsd)) * 1.01;
  const latest = history[history.length - 1].totalUsd;
  const first = history[0].totalUsd;
  const pct = first > 0 ? ((latest - first) / first) * 100 : 0;
  const isUp = pct >= 0;

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-[#F5F5F5]">Portfolio Equity</h3>
        <span className={`text-xs font-bold ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
          {isUp ? '+' : ''}{pct.toFixed(2)}%
        </span>
      </div>
      <p className="text-[10px] text-[#444] mb-3">Since tracking began · {history.length} snapshots</p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUp ? '#BFFF00' : '#EF4444'} stopOpacity={0.25} />
              <stop offset="95%" stopColor={isUp ? '#BFFF00' : '#EF4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide />
          <YAxis domain={[min, max]} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Snapshot;
              return (
                <div className="bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs">
                  <div className="font-bold text-[#F5F5F5]">${d.totalUsd.toFixed(2)}</div>
                  <div className="text-[#666]">{fmtTime(d.timestamp)}</div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="totalUsd"
            stroke={isUp ? '#BFFF00' : '#EF4444'}
            strokeWidth={1.5}
            fill="url(#portfolioGrad)"
            dot={false}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
