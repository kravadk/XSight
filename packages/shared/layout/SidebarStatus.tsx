import { useSyncStore } from '@shared/store/syncStore';
import { useWalletStore } from '@shared/store/walletStore';
import { useRpcPing } from '@shared/hooks/useRpcPing';
import { cn } from '@shared/utils/format';

/**
 * Bottom-of-sidebar live status:
 *  • Network indicator (online/offline based on RPC ping + backend health)
 *  • Chain name
 *  • Latency (ms) to X Layer RPC, color-coded
 */
export function SidebarStatus() {
  const network = useWalletStore((s) => s.network);
  const backendOnline = useSyncStore((s) => s.online);
  const { latencyMs, online: rpcOnline } = useRpcPing();

  const allOnline = backendOnline && rpcOnline;
  // Latency is informational, not an error — a working-but-slow RPC stays amber,
  // and the muted grey is used when the RPC is unreachable or not yet measured.
  const latencyColor =
    latencyMs == null || !rpcOnline
      ? 'text-[#666]'
      : latencyMs < 300
        ? 'text-[#22C55E]'
        : 'text-[#F59E0B]';

  return (
    <div className="px-6 py-3 border-t border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            allOnline ? 'bg-[#BFFF00] animate-pulse' : 'bg-[#666]',
          )}
        />
        <span className="text-[11px] font-bold text-[#F5F5F5] flex-1 truncate">{network || 'X Layer'}</span>
        {!backendOnline && (
          // Explicit "backend unreachable" badge — the indicator dot above can
          // mean either RPC or backend; this names it when it is the API that
          // is down, so the user knows the live data is stale, not the chain.
          <span
            className="rounded bg-[rgba(239,68,68,0.12)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#FCA5A5]"
            title="Backend API unreachable — data may be stale"
          >
            API ↓
          </span>
        )}
        {latencyMs != null && (
          <span className={cn('text-[10px] tabular font-mono', latencyColor)}>
            <span className="text-[#666]">RPC </span>
            {latencyMs}ms
          </span>
        )}
      </div>
    </div>
  );
}
