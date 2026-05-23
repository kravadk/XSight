import { useEffect, useState } from 'react';
import { Anchor, ExternalLink, Github, Sparkles, Wallet, Activity, Trophy, TrendingDown } from 'lucide-react';
import { useWalletStore } from '@shared/store/walletStore';
import { useUiStore } from '@shared/store/uiStore';
import { explorerAddress } from '@shared/config/links';

const HACKATHON_URL = 'https://web3.okx.com/xlayer/build-x-hackathon/hook';
const HOOK_REPO_URL = 'https://github.com/kravadk/XHook';

interface HookState {
  deployed: boolean;
  chainId: number;
  poolManager: string;
  universalRouter: string;
  hook: string;
  fanScoreRegistry: string;
  cupSidePot: string;
  poolId: string;
  tierFeeTable: { tier: number; label: string; bps: number }[];
}

interface TierInfo {
  wallet: string;
  score: number;
  tier: number;
  tierLabel: string;
  feeBps: number;
  hasFanPass: boolean;
  verdict: string;
}

interface Backtest {
  windowDays: number;
  paidCalls: number;
  uniqueWallets: number;
  totalVolume: number;
  totalSaved: number;
  byTier: { tier: number; label: string; bps: number; wallets: number; saved: number }[];
  note: string;
}

const TIER_COLOR: Record<number, string> = {
  0: 'text-stadium-text-muted',
  1: 'text-outcome-away',
  2: 'text-pitch',
  3: 'text-gold',
};

const TIER_BG: Record<number, string> = {
  0: 'bg-[rgba(255,255,255,0.04)] border-stadium-line',
  1: 'bg-[rgba(74,168,224,0.08)] border-[rgba(74,168,224,0.3)]',
  2: 'bg-pitch-bg border-pitch-border',
  3: 'bg-gold-bg border-gold-border',
};

/**
 * Hook hackathon landing - Uniswap V4 + X Layer.
 * Live dashboard: connected wallet's tier-fee + deployed contracts +
 * link to hackathon. Day-3 ships with hook addresses pending (env-driven).
 */
export function HookPage() {
  const { connected, address } = useWalletStore();
  const setConnectModalOpen = useUiStore((s) => s.setConnectModalOpen);

  const [state, setState] = useState<HookState | null>(null);
  const [tier, setTier] = useState<TierInfo | null>(null);
  const [tierLoading, setTierLoading] = useState(false);
  const [backtest, setBacktest] = useState<Backtest | null>(null);

  // Fetch global hook state + backtest once
  useEffect(() => {
    fetch('/api/hook/state')
      .then((r) => r.json() as Promise<HookState>)
      .then(setState)
      .catch(() => setState(null));
    fetch('/api/hook/backtest')
      .then((r) => r.json() as Promise<Backtest>)
      .then(setBacktest)
      .catch(() => setBacktest(null));
  }, []);

  // Fetch per-wallet tier whenever address changes
  useEffect(() => {
    if (!connected || !address) {
      setTier(null);
      return;
    }
    setTierLoading(true);
    fetch(`/api/hook/tier?address=${address}`)
      .then((r) => (r.ok ? (r.json() as Promise<TierInfo>) : null))
      .then(setTier)
      .catch(() => setTier(null))
      .finally(() => setTierLoading(false));
  }, [connected, address]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {/* Hero */}
      <div className="stadium-card flex items-center gap-4 p-5">
        <Anchor className="h-8 w-8 text-pitch" />
        <div className="min-w-0 flex-1">
          <div className="text-micro text-stadium-text-muted">Uniswap V4 · OKX Hackathon</div>
          <div className="font-display text-2xl text-stadium-text">FanFeeHook</div>
          <div className="mt-1 text-xs text-stadium-text-secondary">
            Identity-gated swap fees on X Layer. Real fans pay less; the spread funds a
            weekly side-pot paid out to correct World Cup pickers.
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end gap-1 text-right">
          <div className="text-[10px] text-stadium-text-muted">22-28 May 2026</div>
          <div className="font-display text-gold">14 000 USDT</div>
        </div>
      </div>

      {/* Live tier-fee for connected wallet */}
      <div className="stadium-card p-5">
        <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
          <Sparkles className="h-3 w-3" /> Your fee on FanFeeHook
        </div>
        {!connected ? (
          <button
            onClick={() => setConnectModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pitch px-4 py-3 text-sm font-bold text-stadium-base hover:bg-pitch-bright glow-pitch"
          >
            <Wallet className="h-4 w-4" /> Connect wallet to see your tier
          </button>
        ) : tierLoading ? (
          <div className="py-3 text-center text-xs text-stadium-text-muted">computing tier…</div>
        ) : !tier ? (
          <div className="py-3 text-center text-xs text-outcome-loss">failed to load tier</div>
        ) : (
          <div className={`flex items-center justify-between rounded-xl border p-4 ${TIER_BG[tier.tier]}`}>
            <div className="flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">tier</div>
              <div className={`font-display text-xl tracking-wide ${TIER_COLOR[tier.tier]}`}>
                {tier.tierLabel.toUpperCase()}
              </div>
              <div className="text-[10px] text-stadium-text-muted">
                score {tier.score} / 100{tier.hasFanPass ? ' · FanPass boost' : ''}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">swap fee</div>
              <div className={`font-display text-3xl ${TIER_COLOR[tier.tier]}`}>{tier.feeBps} bps</div>
              <div className="text-[10px] text-stadium-text-muted">vs 30 bps default</div>
            </div>
          </div>
        )}
      </div>

      {/* Tier-fee table */}
      {state?.tierFeeTable && (
        <div className="stadium-card p-5">
          <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
            <Activity className="h-3 w-3" /> Tier ladder
          </div>
          <div className="flex flex-col gap-2">
            {state.tierFeeTable.map((row) => (
              <div
                key={row.tier}
                className={`flex items-center justify-between rounded-lg border p-3 ${TIER_BG[row.tier]}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`font-mono text-xs ${TIER_COLOR[row.tier]}`}>T{row.tier}</span>
                  <span className={`text-sm font-bold ${TIER_COLOR[row.tier]}`}>
                    {row.label}
                  </span>
                </div>
                <span className={`font-display text-base ${TIER_COLOR[row.tier]}`}>
                  {row.bps} bps
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-stadium-text-muted">
            Fee charged on swap input via Uniswap V4 dynamic-fee flag. Computed each swap
            from your FanPass + on-chain reputation score.
          </div>
        </div>
      )}

      {/* 7-day backtest */}
      {backtest && backtest.paidCalls > 0 && (
        <div className="stadium-card p-5">
          <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
            <TrendingDown className="h-3 w-3" /> 7-day backtest — what FanFeeHook would have saved
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">saved</div>
              <div className="font-display text-xl text-pitch">${backtest.totalSaved.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">wallets</div>
              <div className="font-display text-xl text-stadium-text">{backtest.uniqueWallets}</div>
            </div>
            <div className="rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">events</div>
              <div className="font-display text-xl text-stadium-text">{backtest.paidCalls}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1 text-[10px]">
            {backtest.byTier.filter((t) => t.wallets > 0).map((t) => (
              <div key={t.tier} className="flex items-center justify-between text-stadium-text-secondary">
                <span>
                  T{t.tier} {t.label} — {t.wallets} wallet{t.wallets > 1 ? 's' : ''} × {t.bps} bps
                </span>
                <span className="font-mono text-stadium-text">${t.saved.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] italic text-stadium-text-muted">{backtest.note}</div>
        </div>
      )}

      {/* Side pot teaser */}
      <div className="stadium-card flex items-start gap-3.5 p-5">
        <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <div className="flex-1">
          <div className="text-sm font-bold text-stadium-text">CupSidePot — coming this week</div>
          <div className="mt-1 text-xs text-stadium-text-secondary">
            A portion of the spread above 5 bps flows into a weekly prediction pot.
            Holders of correct BracketNFT picks split it pro-rata, settled by CupOracleV3.
          </div>
        </div>
      </div>

      {/* Deployed contracts panel */}
      {state && (
        <div className="stadium-card p-5">
          <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
            X Layer chain 196 · deployed contracts
          </div>
          <div className="flex flex-col gap-2 font-mono text-[11px]">
            <ContractRow label="Uniswap V4 PoolManager" address={state.poolManager} />
            <ContractRow label="Universal Router 2.1.1" address={state.universalRouter} />
            <ContractRow
              label="FanFeeHook (ours)"
              address={state.hook}
              fallback="pending Day-3 deploy"
            />
            <ContractRow
              label="FanScoreRegistry (ours)"
              address={state.fanScoreRegistry}
              fallback="pending Day-3 deploy"
            />
            <ContractRow
              label="CupSidePot (ours)"
              address={state.cupSidePot}
              fallback="pending Day-3 deploy"
            />
          </div>
          {state.poolId && (
            <div className="mt-3 rounded-lg border border-pitch-border bg-pitch-bg p-3 font-mono text-[10px]">
              <div className="text-[9px] uppercase tracking-wider text-pitch">USDT/USDC pool · live</div>
              <div className="mt-1 break-all text-stadium-text">{state.poolId}</div>
            </div>
          )}
        </div>
      )}

      {/* Footer CTAs */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={HOOK_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pitch px-4 py-2.5 text-sm font-bold text-stadium-base hover:bg-pitch-bright glow-pitch"
        >
          <Github className="h-4 w-4" /> GitHub repo
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
        <a
          href={HACKATHON_URL}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stadium-line bg-[rgba(255,255,255,0.04)] px-4 py-2.5 text-sm font-bold text-stadium-text hover:bg-[rgba(255,255,255,0.08)]"
        >
          Hackathon page
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>
    </div>
  );
}

function ContractRow({ label, address, fallback }: { label: string; address: string; fallback?: string }) {
  if (!address) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-stadium-line/50 bg-[rgba(255,255,255,0.02)] px-3 py-2">
        <span className="text-stadium-text-secondary">{label}</span>
        <span className="text-[10px] italic text-stadium-text-muted">{fallback ?? 'not set'}</span>
      </div>
    );
  }
  return (
    <a
      href={explorerAddress(address)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] px-3 py-2 hover:bg-[rgba(255,255,255,0.06)]"
    >
      <span className="text-stadium-text-secondary">{label}</span>
      <span className="inline-flex items-center gap-1 text-stadium-text">
        {address.slice(0, 8)}…{address.slice(-6)}
        <ExternalLink className="h-3 w-3 opacity-60" />
      </span>
    </a>
  );
}
