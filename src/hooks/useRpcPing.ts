import { useEffect, useState } from 'react';

const X_LAYER_RPC = 'https://rpc.xlayer.tech';
const POLL_MS = 10_000;

interface PingState {
  latencyMs: number | null;
  blockNumber: number | null;
  online: boolean;
  error: string | null;
}

/**
 * Polls X Layer RPC every 10s with eth_blockNumber to measure latency and
 * confirm node availability. Used by SidebarStatus / NetworkStrip.
 */
export function useRpcPing(rpcUrl = X_LAYER_RPC): PingState {
  const [state, setState] = useState<PingState>({
    latencyMs: null,
    blockNumber: null,
    online: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      const start = performance.now();
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_blockNumber',
            params: [],
          }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { result?: string };
        const latency = Math.round(performance.now() - start);
        const block = json.result ? parseInt(json.result, 16) : null;
        if (!cancelled) {
          setState({
            latencyMs: latency,
            blockNumber: block,
            online: true,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            online: false,
            error: err instanceof Error ? err.message : 'rpc unreachable',
          }));
        }
      }
    };

    void ping();
    const id = window.setInterval(() => void ping(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [rpcUrl]);

  return state;
}
