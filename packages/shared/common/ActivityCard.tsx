import { useEffect, useState } from 'react';
import { Activity, Wallet, ExternalLink } from 'lucide-react';
import { api, type ActivitySnapshotDto } from '@shared/api/client';
import { AnimatedNumber } from './AnimatedNumber';

/**
 * "Most Active Agent" surface — pulls from the live /api/status/activity
 * snapshot every 15s and renders the breakdown of OnchainOS calls + x402
 * activity.
 */
export function ActivityCard() {
  const [data, setData] = useState<ActivitySnapshotDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const a = await api.activity();
        if (!cancelled) setData(a);
      } catch {
        /* */
      }
    };
    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
        <div className="skeleton h-4 w-32 mb-3" />
        <div className="skeleton h-10 w-24" />
      </div>
    );
  }

  const stats: { label: string; value: number; color: string }[] = [
    { label: 'Total calls', value: data.totalCalls, color: '#BFFF00' },
    { label: 'Swaps executed', value: data.swapsExecuted, color: '#22C55E' },
    { label: 'Quotes', value: data.quotesRequested, color: '#A78BFA' },
    { label: 'Balance checks', value: data.balanceChecks, color: '#38BDF8' },
    { label: 'Market data', value: data.marketDataCalls, color: '#F59E0B' },
    { label: 'Security scans', value: data.securityScans, color: '#EC4899' },
    { label: 'x402 paid', value: data.x402PaymentsReceived, color: '#BFFF00' },
    { label: 'AI calls', value: data.aiCalls, color: '#A78BFA' },
  ];

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#BFFF00]" />
          <h3 className="text-sm font-bold text-[#F5F5F5]">Agent Activity</h3>
        </div>
        {data.walletExplorer && (
          <a
            href={data.walletExplorer}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold text-[#A3A3A3] hover:text-[#BFFF00]"
          >
            <Wallet className="w-3 h-3" /> Explorer <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[#1A1A1A] border border-[rgba(255,255,255,0.04)] rounded-lg p-3"
          >
            <div className="text-[10px] uppercase tracking-wider text-[#666] mb-1">{s.label}</div>
            <div className="text-lg font-extrabold tabular" style={{ color: s.color }}>
              <AnimatedNumber value={s.value} decimals={0} />
            </div>
          </div>
        ))}
      </div>

      {data.recent.length > 0 && (
        <div className="mt-4">
          <div className="text-micro text-[#666] mb-2">Recent events</div>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-hide">
            {data.recent.slice(0, 8).map((e, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#BFFF00]">{e.kind}</span>
                <span className="text-[#666] tabular">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
