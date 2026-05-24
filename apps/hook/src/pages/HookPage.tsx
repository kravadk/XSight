import { useEffect, useState } from 'react';
import { Anchor, ExternalLink, Github, Sparkles, Wallet, Activity, Trophy, TrendingDown } from 'lucide-react';
import { useWalletStore } from '@shared/store/walletStore';
import { useUiStore } from '@shared/store/uiStore';
import { explorerAddress } from '@shared/config/links';
import { SwapWidget } from '../components/SwapWidget';

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

interface PotState {
  deployed: boolean;
  potAddress?: string;
  payoutToken?: string;
  currentWeekId?: number;
  tokenBalance?: string;
  weeks?: { weekId: number; potAmount: string; settled: boolean; sharePerWinner: string; winnersCount: number }[];
}

interface DiscountEvent {
  blockNumber: number;
  txHash: string;
  swapper: string;
  poolId: string;
  tier: number;
  feeBps: number;
}

interface DiscountsResponse {
  deployed: boolean;
  events: DiscountEvent[];
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
  const [pot, setPot] = useState<PotState | null>(null);
  const [discounts, setDiscounts] = useState<DiscountsResponse | null>(null);

  // Fetch global hook state + backtest + pot + recent discounts once.
  useEffect(() => {
    fetch('/api/hook/state').then((r) => r.json() as Promise<HookState>).then(setState).catch(() => setState(null));
    fetch('/api/hook/backtest').then((r) => r.json() as Promise<Backtest>).then(setBacktest).catch(() => setBacktest(null));
    fetch('/api/hook/pot').then((r) => r.json() as Promise<PotState>).then(setPot).catch(() => setPot(null));
    fetch('/api/hook/discounts').then((r) => r.json() as Promise<DiscountsResponse>).then(setDiscounts).catch(() => setDiscounts(null));
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
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <div className="text-[10px] text-stadium-text-muted">22-28 May 2026</div>
          <div className="font-display text-base md:text-lg text-gold">14k USDT</div>
        </div>
      </div>

      {/* Plain-English explainer for non-crypto judges */}
      <div className="rounded-xl border border-pitch-border bg-pitch-bg p-3 text-xs text-stadium-text">
        <span className="font-bold text-pitch">In plain English:</span>{' '}
        the longer you've been a loyal X Cup fan, the lower your swap fee — automatically.
        6× cheaper for top-tier holders. Same pool, just different identities.
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

      {/* Interactive swap widget — lets judges fire a real swap */}
      <SwapWidget feeBps={tier?.feeBps} tierLabel={tier?.tierLabel} />

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

      {/* Side pot — live on-chain state */}
      {pot && pot.deployed && pot.weeks && (
        <div className="stadium-card p-5">
          <div className="mb-3 flex items-center gap-2 text-micro text-gold">
            <Trophy className="h-3 w-3" /> CupSidePot — live state
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-gold-border bg-gold-bg p-3">
              <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">current week</div>
              <div className="font-display text-2xl text-gold">#{pot.currentWeekId}</div>
            </div>
            <div className="rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] p-3">
              <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">total locked</div>
              <div className="font-display text-2xl text-stadium-text">
                ${pot.tokenBalance ? (Number(pot.tokenBalance) / 1e6).toFixed(4) : '0'}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {pot.weeks.map((w) => (
              <div
                key={w.weekId}
                className="flex items-center justify-between rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[11px]"
              >
                <span className="font-mono text-stadium-text-secondary">week #{w.weekId}</span>
                <span className="font-mono text-stadium-text">
                  ${(Number(w.potAmount) / 1e6).toFixed(4)}
                  {w.settled ? (
                    <span className="ml-2 rounded bg-pitch-bg px-1.5 py-0.5 text-[9px] text-pitch">
                      settled · {w.winnersCount}w
                    </span>
                  ) : (
                    <span className="ml-2 rounded bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 text-[9px] text-stadium-text-muted">
                      open
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-stadium-text-muted">
            Half of the extra-spread above 5 bps lands here. Operator settles each week
            after CupOracleV3 finalizes match outcomes; correct BracketNFT pickers split
            it pro-rata.
          </div>
        </div>
      )}

      {/* Recent FeeApplied events — proof that the hook actually fires */}
      {discounts && discounts.events && discounts.events.length > 0 && (
        <div className="stadium-card p-5">
          <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
            <Activity className="h-3 w-3" /> Live swaps through FanFeeHook
          </div>
          <div className="flex flex-col gap-1.5">
            {discounts.events.slice(0, 8).map((e) => (
              <a
                key={e.txHash}
                href={`https://www.okx.com/web3/explorer/xlayer/tx/${e.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] px-3 py-2 font-mono text-[11px] hover:bg-[rgba(255,255,255,0.06)]"
              >
                <span className="flex items-center gap-2">
                  <span className={TIER_COLOR[e.tier] || 'text-stadium-text-muted'}>T{e.tier}</span>
                  <span className="text-stadium-text-muted">block {e.blockNumber}</span>
                  <span className="text-stadium-text-secondary">
                    {e.swapper.slice(0, 6)}…{e.swapper.slice(-4)}
                  </span>
                </span>
                <span className={`font-bold ${TIER_COLOR[e.tier] || 'text-stadium-text'}`}>
                  {e.feeBps / 100} bps
                </span>
              </a>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-stadium-text-muted">
            Each entry is a real `FeeApplied(poolId, swapper, tier, feeBps)` event from
            FanFeeHook on X Layer mainnet. Click to open the swap tx on the OKX explorer.
          </div>
        </div>
      )}

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
