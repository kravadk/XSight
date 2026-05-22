import { useSyncStore } from '../../store/syncStore';
import { useWalletStore } from '../../store/walletStore';
import { useRpcPing } from '../../hooks/useRpcPing';
import { cn } from '../../utils/format';

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
        <span className="text-[11px] font-bold text-[#F5F5F5] flex-1">{network || 'X Layer'}</span>
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
