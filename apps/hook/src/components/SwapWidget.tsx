import { useState } from 'react';
import { ArrowDownUp, Loader2, Wallet, ExternalLink, AlertTriangle } from 'lucide-react';
import { useWalletStore } from '@shared/store/walletStore';
import { useUiStore } from '@shared/store/uiStore';
import { toast } from '@shared/store/toastStore';

// ---- X Layer mainnet (chain 196) ----
const DEMO_SWAP_ROUTER = '0x00d1a987beAC42FCB3513b6Fc23429164851694f';
const USDC = '0x74b7F16337b8972027F6196A17a631aC6dE26d22';
// ERC-20 approve(address,uint256) selector
const APPROVE_SELECTOR = '0x095ea7b3';

interface Props {
  /** Optional pre-fetched tier so the widget can show the discount preview. */
  feeBps?: number;
  tierLabel?: string;
}

/**
 * Minimum-viable swap widget for the FanFeeHook demo pool.
 * Approves USDC to DemoSwapRouter, then calls the swap (calldata encoded
 * server-side via /api/hook/encode-swap to keep the bundle lean).
 */
export function SwapWidget({ feeBps, tierLabel }: Props) {
  const { connected, sendTx, waitForTx } = useWalletStore();
  const setConnectModalOpen = useUiStore((s) => s.setConnectModalOpen);
  const [amount, setAmount] = useState('0.005');
  const [busy, setBusy] = useState<'idle' | 'approving' | 'swapping'>('idle');
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const amountBaseUnits = (() => {
    const v = Number(amount);
    if (!Number.isFinite(v) || v <= 0) return 0;
    return Math.floor(v * 1_000_000);
  })();

  const previewOut = feeBps !== undefined
    ? (amountBaseUnits * (10000 - feeBps)) / 10000
    : null;

  async function handleSwap() {
    if (!connected) {
      setConnectModalOpen(true);
      return;
    }
    if (amountBaseUnits === 0) {
      toast.error('Enter a positive USDC amount');
      return;
    }
    try {
      setBusy('approving');
      const approveData =
        APPROVE_SELECTOR +
        DEMO_SWAP_ROUTER.slice(2).toLowerCase().padStart(64, '0') +
        amountBaseUnits.toString(16).padStart(64, '0');
      const approveHash = await sendTx({ to: USDC, data: approveData });
      toast.info(`Approve sent · ${approveHash.slice(0, 10)}…`);
      await waitForTx(approveHash);

      setBusy('swapping');
      const swapResp = await fetch('/api/hook/encode-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountIn: amountBaseUnits, zeroForOne: false }),
      });
      if (!swapResp.ok) throw new Error(await swapResp.text());
      const { calldata } = (await swapResp.json()) as { calldata: string };

      const swapHash = await sendTx({ to: DEMO_SWAP_ROUTER, data: calldata });
      setLastTxHash(swapHash);
      toast.success(`Swap sent · ${swapHash.slice(0, 10)}…`);
      await waitForTx(swapHash);
      toast.success('Swap confirmed — FeeApplied event emitted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setBusy('idle');
    }
  }

  return (
    <div className="stadium-card p-5">
      <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
        <ArrowDownUp className="h-3 w-3" /> Try a real swap on FanFeeHook
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-stadium-line bg-[rgba(255,255,255,0.04)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">you pay</div>
          <div className="flex items-center justify-between">
            <input
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 bg-transparent text-2xl font-bold text-stadium-text outline-none"
            />
            <span className="font-mono text-sm text-stadium-text-secondary">USDC</span>
          </div>
        </div>

        <div className="rounded-xl border border-stadium-line bg-[rgba(255,255,255,0.04)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">you receive (est.)</div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-stadium-text">
              {previewOut !== null ? (previewOut / 1_000_000).toFixed(6) : '—'}
            </span>
            <span className="font-mono text-sm text-stadium-text-secondary">USDT</span>
          </div>
          {tierLabel && feeBps !== undefined && (
            <div className="mt-1 text-[10px] text-stadium-text-muted">
              Tier <span className="text-pitch">{tierLabel}</span> → {feeBps} bps fee
            </div>
          )}
        </div>

        {!connected ? (
          <button
            onClick={() => setConnectModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-pitch px-4 py-3 text-sm font-bold text-stadium-base hover:bg-pitch-bright glow-pitch"
          >
            <Wallet className="h-4 w-4" /> Connect wallet
          </button>
        ) : (
          <button
            onClick={() => void handleSwap()}
            disabled={busy !== 'idle' || amountBaseUnits === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-pitch px-4 py-3 text-sm font-bold text-stadium-base hover:bg-pitch-bright glow-pitch disabled:opacity-50"
          >
            {busy === 'approving' && <><Loader2 className="h-4 w-4 animate-spin" /> Approving USDC…</>}
            {busy === 'swapping' && <><Loader2 className="h-4 w-4 animate-spin" /> Swapping…</>}
            {busy === 'idle' && <><ArrowDownUp className="h-4 w-4" /> Swap USDC → USDT</>}
          </button>
        )}

        {lastTxHash && (
          <a
            href={`https://www.okx.com/web3/explorer/xlayer/tx/${lastTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-[11px] text-stadium-text-secondary hover:text-pitch"
          >
            <ExternalLink className="h-3 w-3" />
            last swap · {lastTxHash.slice(0, 10)}…
          </a>
        )}

        <div className="flex items-start gap-1.5 text-[10px] text-stadium-text-muted">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Demo pool has ~$0.40 liquidity. Keep amounts ≤ 0.01 USDC to avoid
            high slippage. Production users go through Universal Router.
          </span>
        </div>
      </div>
    </div>
  );
}
