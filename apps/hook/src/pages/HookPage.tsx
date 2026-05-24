import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Github, Wallet, Activity } from 'lucide-react';
import { useWalletStore } from '@shared/store/walletStore';
import { useUiStore } from '@shared/store/uiStore';
import { explorerAddress } from '@shared/config/links';
import { SegmentedTabs } from '@shared/common/SegmentedTabs';
import { SwapWidget } from '../components/SwapWidget';
import { HookHero } from '../components/HookHero';
import { HookFeeRing } from '../components/HookFeeRing';
import { HookMiniWidget } from '../components/HookMiniWidget';
import { HookTierLadder } from '../components/HookTierLadder';
import { HookHowItWorks } from '../components/HookHowItWorks';
import { HookActivityChart } from '../components/HookActivityChart';
import { HookPotHero } from '../components/HookPotHero';

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

type TabId = 'overview' | 'swap' | 'pot' | 'activity' | 'contracts';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'swap', label: 'Swap' },
  { id: 'pot', label: 'Pot' },
  { id: 'activity', label: 'Activity' },
  { id: 'contracts', label: 'Contracts' },
];

export function HookPage() {
  const { connected, address } = useWalletStore();
  const setConnectModalOpen = useUiStore((s) => s.setConnectModalOpen);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [state, setState] = useState<HookState | null>(null);
  const [tier, setTier] = useState<TierInfo | null>(null);
  const [tierLoading, setTierLoading] = useState(false);
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [pot, setPot] = useState<PotState | null>(null);
  const [discounts, setDiscounts] = useState<DiscountsResponse | null>(null);

  useEffect(() => {
    fetch('/api/hook/state').then((r) => r.json() as Promise<HookState>).then(setState).catch(() => setState(null));
    fetch('/api/hook/backtest').then((r) => r.json() as Promise<Backtest>).then(setBacktest).catch(() => setBacktest(null));
    fetch('/api/hook/pot').then((r) => r.json() as Promise<PotState>).then(setPot).catch(() => setPot(null));
    fetch('/api/hook/discounts')
      .then((r) => (r.ok ? (r.json() as Promise<DiscountsResponse>) : null))
      .then((d) => setDiscounts(d && Array.isArray(d.events) ? d : null))
      .catch(() => setDiscounts(null));
  }, []);

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

  // Derived mini-widget data
  const savedSeries = useMemo(() => {
    if (!backtest) return [];
    return backtest.byTier.map((t) => t.saved);
  }, [backtest]);

  const firingsHistogram = useMemo(() => {
    if (!discounts?.events || discounts.events.length === 0) return [];
    const events = discounts.events;
    const minBlock = Math.min(...events.map((e) => e.blockNumber));
    const maxBlock = Math.max(...events.map((e) => e.blockNumber));
    const span = Math.max(1, maxBlock - minBlock);
    const buckets = Array.from({ length: 8 }, () => 0);
    events.forEach((e) => {
      const ratio = (e.blockNumber - minBlock) / span;
      const idx = Math.min(7, Math.floor(ratio * 8));
      buckets[idx] += 1;
    });
    return buckets;
  }, [discounts]);

  const potUsd = pot?.tokenBalance ? Number(pot.tokenBalance) / 1e6 : 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-1">
      {/* === HERO BAND ============================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8">
          <HookHero />
        </div>
        <div className="md:col-span-4">
          <div className="stadium-card relative overflow-hidden p-6 h-full flex flex-col items-center justify-center text-center">
            <div className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold mb-2">Your Fee</div>
            {!connected ? (
              <>
                <HookFeeRing score={0} tier={0} feeBps={30} tierLabel="UNKNOWN" size={160} />
                <button
                  onClick={() => setConnectModalOpen(true)}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl btn-premium-pitch px-5 py-2.5 text-sm"
                >
                  <Wallet className="h-4 w-4" /> Connect wallet
                </button>
              </>
            ) : tierLoading ? (
              <div className="py-10 text-xs text-stadium-text-muted">computing tier…</div>
            ) : !tier ? (
              <div className="py-10 text-xs text-outcome-loss">failed to load tier</div>
            ) : (
              <>
                <HookFeeRing
                  score={tier.score}
                  tier={tier.tier}
                  feeBps={tier.feeBps}
                  tierLabel={tier.tierLabel.toUpperCase()}
                  size={160}
                />
                <div className="mt-3 text-[10px] text-stadium-text-muted">
                  score {tier.score}/100{tier.hasFanPass ? ' · FanPass boost' : ''}
                </div>
                <div className="mt-1 text-[10px] text-stadium-text-secondary">
                  vs <span className="font-mono">30 bps</span> default
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* === MINI-WIDGET ROW ======================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HookMiniWidget
          variant="saved"
          label="Saved · 7d"
          value={backtest?.totalSaved ?? 0}
          prefix="$"
          series={savedSeries}
          loading={!backtest}
        />
        <HookMiniWidget
          variant="fans"
          label="Active fans"
          value={backtest?.uniqueWallets ?? 0}
          loading={!backtest}
        />
        <HookMiniWidget
          variant="firings"
          label="Hook firings"
          value={backtest?.paidCalls ?? discounts?.events?.length ?? 0}
          series={firingsHistogram}
          loading={!backtest && !discounts}
        />
        <HookMiniWidget
          variant="pot"
          label={pot?.currentWeekId !== undefined ? `Pot · W#${pot.currentWeekId}` : 'Pot · live'}
          value={potUsd}
          prefix="$"
          footer={pot?.deployed ? 'CupSidePot · X Layer' : 'pending'}
          loading={!pot}
        />
      </div>

      {/* === SEGMENTED TABS ========================================= */}
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <SegmentedTabs<TabId>
          value={activeTab}
          items={TABS}
          onChange={setActiveTab}
          className="!bg-stadium-card !border-stadium-line"
        />
      </div>

      {/* === TAB PANELS ============================================= */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7">
              {state?.tierFeeTable && (
                <HookTierLadder tiers={state.tierFeeTable} activeTier={tier?.tier} />
              )}
            </div>
            <div className="md:col-span-5">
              <HookHowItWorks />
            </div>
          </div>
        )}

        {activeTab === 'swap' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7">
              <SwapWidget feeBps={tier?.feeBps} tierLabel={tier?.tierLabel} />
            </div>
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="stadium-card p-5">
                <div className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold mb-2">Your edge</div>
                {tier ? (
                  <div>
                    <div className="font-display text-3xl text-pitch" style={{ fontWeight: 800 }}>
                      {Math.max(0, 30 - tier.feeBps)} bps
                    </div>
                    <div className="text-xs text-stadium-text-secondary mt-1">
                      saved per swap vs unknown wallet
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-stadium-text-secondary">
                    Connect to see how many bps you save per swap.
                  </div>
                )}
              </div>
              <div className="stadium-card p-5">
                <div className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold mb-2">Last hook firings</div>
                <div className="flex flex-col gap-1.5">
                  {(discounts?.events ?? []).slice(0, 3).map((e) => (
                    <a
                      key={e.txHash}
                      href={`https://www.okx.com/web3/explorer/xlayer/tx/${e.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] px-3 py-2 font-mono text-[11px] hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      <span className={TIER_COLOR[e.tier]}>T{e.tier}</span>
                      <span className="text-stadium-text-muted">{e.swapper.slice(0, 6)}…{e.swapper.slice(-4)}</span>
                      <span className={`font-bold ${TIER_COLOR[e.tier]}`}>{e.feeBps / 100} bps</span>
                    </a>
                  ))}
                  {(!discounts || discounts.events.length === 0) && (
                    <div className="text-xs text-stadium-text-muted">no recent swaps</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pot' && (
          <div className="flex flex-col gap-4">
            <HookPotHero weekId={pot?.currentWeekId} totalLocked={potUsd} />
            {pot?.weeks && pot.weeks.length > 0 && (
              <div className="stadium-card p-5">
                <div className="text-gold text-[10px] tracking-[0.2em] uppercase font-bold mb-3">Weeks history</div>
                <div className="flex flex-col gap-1.5">
                  {pot.weeks.map((w) => (
                    <div
                      key={w.weekId}
                      className="flex items-center justify-between rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-[12px]"
                    >
                      <span className="font-mono text-stadium-text-secondary">week #{w.weekId}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-stadium-text">${(Number(w.potAmount) / 1e6).toFixed(4)}</span>
                        {w.settled ? (
                          <span className="rounded-full bg-pitch-bg border border-pitch-border px-2 py-0.5 text-[10px] text-pitch font-bold">
                            settled · {w.winnersCount}w
                          </span>
                        ) : (
                          <span className="rounded-full bg-[rgba(255,255,255,0.04)] border border-stadium-line px-2 py-0.5 text-[10px] text-stadium-text-muted">
                            open
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="flex flex-col gap-4">
            <HookActivityChart events={discounts?.events ?? []} />
            <div className="stadium-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-3 w-3 text-pitch" />
                <span className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold">Recent swaps stream</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {(discounts?.events ?? []).slice(0, 12).map((e) => (
                  <a
                    key={e.txHash}
                    href={`https://www.okx.com/web3/explorer/xlayer/tx/${e.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] px-3 py-2 font-mono text-[11px] hover:bg-[rgba(255,255,255,0.06)]"
                  >
                    <span className="flex items-center gap-2">
                      <span className={TIER_COLOR[e.tier]}>T{e.tier}</span>
                      <span className="text-stadium-text-muted">block {e.blockNumber}</span>
                      <span className="text-stadium-text-secondary">{e.swapper.slice(0, 6)}…{e.swapper.slice(-4)}</span>
                    </span>
                    <span className={`font-bold ${TIER_COLOR[e.tier]}`}>{e.feeBps / 100} bps</span>
                  </a>
                ))}
                {(!discounts || discounts.events.length === 0) && (
                  <div className="text-xs text-stadium-text-muted py-3 text-center">no on-chain events yet</div>
                )}
              </div>
            </div>
            {backtest && backtest.paidCalls > 0 && (
              <div className="stadium-card p-5">
                <div className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold mb-3">Backtest breakdown by tier</div>
                <div className="flex flex-col gap-2">
                  {backtest.byTier.filter((t) => t.wallets > 0).map((t) => (
                    <div key={t.tier} className="flex items-center justify-between text-[12px] text-stadium-text-secondary">
                      <span>
                        <span className={`font-bold ${TIER_COLOR[t.tier]}`}>T{t.tier}</span> · {t.label} · {t.wallets} wallet{t.wallets > 1 ? 's' : ''} × {t.bps} bps
                      </span>
                      <span className="font-mono text-stadium-text">${t.saved.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[10px] italic text-stadium-text-muted">{backtest.note}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contracts' && state && (
          <div className="stadium-card p-5 md:p-6">
            <div className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold mb-3">
              X Layer chain 196 · deployed contracts
            </div>
            <div className="flex flex-col gap-2 font-mono text-[12px]">
              <ContractRow label="Uniswap V4 PoolManager" address={state.poolManager} />
              <ContractRow label="Universal Router 2.1.1" address={state.universalRouter} />
              <ContractRow label="FanFeeHook (ours)" address={state.hook} fallback="pending deploy" />
              <ContractRow label="FanScoreRegistry (ours)" address={state.fanScoreRegistry} fallback="pending deploy" />
              <ContractRow label="CupSidePot (ours)" address={state.cupSidePot} fallback="pending deploy" />
            </div>
            {state.poolId && (
              <div className="mt-4 rounded-xl border border-pitch-border bg-pitch-bg p-4 font-mono text-[11px]">
                <div className="text-[10px] uppercase tracking-wider text-pitch font-bold">USDT/USDC pool · live</div>
                <div className="mt-1 break-all text-stadium-text">{state.poolId}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* === FOOTER CTAs ============================================ */}
      <div className="flex flex-col gap-3 sm:flex-row mt-2">
        <a
          href={HOOK_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl btn-premium-pitch px-4 py-3 text-sm"
        >
          <Github className="h-4 w-4" /> GitHub repo
          <ExternalLink className="h-3 w-3 opacity-80" />
        </a>
        <a
          href={HACKATHON_URL}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stadium-line bg-stadium-elevated px-4 py-3 text-sm font-bold text-stadium-text hover:bg-[rgba(255,255,255,0.04)]"
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
      <div className="flex items-center justify-between rounded-lg border border-stadium-line/50 bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
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
      className="flex items-center justify-between rounded-lg border border-stadium-line bg-[rgba(255,255,255,0.03)] px-3 py-2.5 hover:bg-[rgba(255,255,255,0.06)]"
    >
      <span className="text-stadium-text-secondary">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-stadium-text">
        {address.slice(0, 8)}…{address.slice(-6)}
        <ExternalLink className="h-3 w-3 opacity-60" />
      </span>
    </a>
  );
}
