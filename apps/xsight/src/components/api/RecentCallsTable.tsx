import { useMemo, useState } from 'react';
import { Activity, Download, Search } from 'lucide-react';
import { useApiStore } from '@shared/store/apiStore';
import { cn } from '@shared/utils/format';
import { EmptyState } from '@shared/common/EmptyState';
import { downloadCSV } from '@shared/utils/csv';
import { toast } from '@shared/store/toastStore';
import { AppCard } from '@shared/common/AppCard';
import { StatusPill } from '@shared/common/StatusPill';

type StatusFilter = 'all' | 'paid' | 'rejected';

export function RecentCallsTable() {
  const calls = useApiStore((s) => s.recentCalls);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calls.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (q && !c.endpoint.toLowerCase().includes(q) && !c.caller.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [calls, statusFilter, search]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info('Nothing to export');
      return;
    }
    downloadCSV(
      filtered.map((c) => ({
        timestamp: new Date(c.timestamp).toISOString(),
        endpoint: c.endpoint,
        caller: c.caller,
        amount: c.amount,
        asset: c.asset,
        status: c.status,
      })),
      `xsight-x402-calls-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success(`${filtered.length} calls exported`);
  };

  const counts = useMemo(
    () => ({
      all: calls.length,
      paid: calls.filter((c) => c.status === 'paid').length,
      rejected: calls.filter((c) => c.status === 'rejected').length,
    }),
    [calls],
  );

  return (
    <AppCard>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-bold text-[#F5F5F5]">x402 call log</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[rgba(255,255,255,0.04)] rounded-full p-0.5">
            {(['all', 'paid', 'rejected'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors',
                  statusFilter === s
                    ? s === 'paid'
                      ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]'
                      : s === 'rejected'
                        ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
                        : 'bg-[#BFFF00] text-[#0A0A0A]'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]',
                )}
              >
                {s} <span className="tabular ml-1">{counts[s]}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="filter..."
              className="h-7 pl-7 pr-2 w-32 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-full text-[10px] text-[#F5F5F5] focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
            />
          </div>
          {filtered.length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-[#F5F5F5] text-[10px] font-bold uppercase tracking-wider"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          )}
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-6 h-6" />}
          title={calls.length === 0 ? 'No paid calls yet' : 'No calls match the filter'}
          description={
            calls.length === 0
              ? 'When external clients hit your x402 endpoints, paid + rejected attempts will appear here in real time.'
              : 'Try clearing the search or status filter.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#9CA3AF] uppercase tracking-wider text-[10px]">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Endpoint</th>
                <th className="py-2 pr-3">Caller</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((c, i) => (
                <tr key={i} className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="py-2 pr-3 text-[#A3A3A3] font-mono tabular">
                    {new Date(c.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 pr-3 text-[#F5F5F5] font-mono">{c.endpoint}</td>
                  <td className="py-2 pr-3 text-[#A3A3A3] font-mono">
                    {c.caller.length > 10 ? `${c.caller.slice(0, 6)}...${c.caller.slice(-4)}` : c.caller}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[#A3A3A3] tabular text-right">
                    {c.amount} {c.asset}
                  </td>
                  <td className="py-2">
                    <StatusPill tone={c.status === 'paid' ? 'green' : 'red'}>{c.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 50 && (
            <div className="text-center text-[10px] text-[#9CA3AF] mt-2">
              showing 50 of {filtered.length} / export CSV for full list
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
}

