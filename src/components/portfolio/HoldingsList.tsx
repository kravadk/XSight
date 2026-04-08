import { useMemo, useState } from 'react';
import { ArrowUpDown, Briefcase, Activity, Download } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { useApiStore } from '../../store/apiStore';
import { useUiStore } from '../../store/uiStore';
import { TokenIcon } from '../common/TokenIcon';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { cn } from '../../utils/format';
import { downloadCSV } from '../../utils/csv';
import { toast } from '../../store/toastStore';

type SortKey = 'symbol' | 'amount' | 'usdValue';

export function HoldingsList({ showHistory = false }: { showHistory?: boolean }) {
  const tokens = useWalletStore((s) => s.tokens);
  const loading = useWalletStore((s) => s.loading);
  const recentCalls = useApiStore((s) => s.recentCalls);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const [sortKey, setSortKey] = useState<SortKey>('usdValue');
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...tokens];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return asc ? av - bv : bv - av;
      return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [tokens, sortKey, asc]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc(!asc);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  const exportHoldings = () => {
    if (tokens.length === 0) {
      toast.info('Nothing to export');
      return;
    }
    downloadCSV(
      tokens.map((t) => ({
        symbol: t.symbol,
        amount: t.amount,
        usdValue: t.usdValue,
      })),
      `xsight-holdings-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: 'symbol', header: 'Symbol' },
        { key: 'amount', header: 'Amount' },
        { key: 'usdValue', header: 'USD Value' },
      ],
    );
    toast.success('Holdings exported');
  };

  const exportHistory = () => {
    if (recentCalls.length === 0) {
      toast.info('Nothing to export');
      return;
    }
    downloadCSV(
      recentCalls.map((c) => ({
        timestamp: new Date(c.timestamp).toISOString(),
        endpoint: c.endpoint,
        caller: c.caller,
        amount: c.amount,
        asset: c.asset,
        status: c.status,
      })),
      `xsight-activity-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success('Activity exported');
  };

  if (showHistory) {
    return (
      <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#F5F5F5]">Recent activity</h3>
          {recentCalls.length > 0 && (
            <button
              onClick={exportHistory}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-[#F5F5F5] text-[10px] font-bold uppercase tracking-wider"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          )}
        </div>
        {recentCalls.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-6 h-6" />}
            title="No activity yet"
            description="Once your AI agent starts executing trades or your API is called, the history will appear here."
            action={{ label: 'Open AI Chat', onClick: () => setActiveTab('chat') }}
          />
        ) : (
          <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.04)]">
            {recentCalls.slice(0, 12).map((c, i) => (
              <div key={i} className="flex items-center justify-between py-3 text-xs">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[#F5F5F5] font-mono truncate">{c.endpoint}</span>
                  <span className="text-[#666]">{new Date(c.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold rounded',
                      c.status === 'paid'
                        ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]'
                        : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]',
                    )}
                  >
                    {c.status}
                  </span>
                  <span className="font-mono text-[#A3A3A3] tabular">
                    {c.amount} {c.asset}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#F5F5F5]">Holdings</h3>
        <div className="flex items-center gap-2">
          <span className="text-micro text-[#666]">{tokens.length} TOKENS</span>
          {tokens.length > 0 && (
            <button
              onClick={exportHoldings}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-[#F5F5F5] text-[10px] font-bold uppercase tracking-wider"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          )}
        </div>
      </div>
      {loading && tokens.length === 0 && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton width={28} height={28} rounded="full" />
              <Skeleton className="flex-1" height={14} />
              <Skeleton width={80} height={14} />
              <Skeleton width={80} height={14} />
            </div>
          ))}
        </div>
      )}
      {!loading && tokens.length === 0 && (
        <EmptyState
          icon={<Briefcase className="w-6 h-6" />}
          title="No holdings yet"
          description="Connect a wallet or deposit OKB on X Layer to see your portfolio here."
          action={{ label: 'Connect wallet', onClick: () => {/* topbar handles */} }}
          secondary={{ label: 'Try AI swap', onClick: () => setActiveTab('chat') }}
        />
      )}
      {tokens.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#666]">
                <th className="py-2 pr-4">
                  <button
                    onClick={() => toggleSort('symbol')}
                    className="flex items-center gap-1 text-micro"
                  >
                    Token <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2 pr-4">
                  <button
                    onClick={() => toggleSort('amount')}
                    className="flex items-center gap-1 text-micro"
                  >
                    Amount <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2">
                  <button
                    onClick={() => toggleSort('usdValue')}
                    className="flex items-center gap-1 text-micro"
                  >
                    USD Value <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.symbol} className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <TokenIcon symbol={t.symbol} size={26} />
                      <span className="font-bold text-[#F5F5F5]">{t.symbol}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[#A3A3A3] tabular">{t.amount.toFixed(4)}</td>
                  <td className="py-3 font-mono text-[#F5F5F5] tabular">${t.usdValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
