import { useState } from 'react';
import { ArrowLeft, ShieldCheck, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/uiStore';
import { useWalletStore } from '../store/walletStore';
import { toast } from '../store/toastStore';
import { MatchupHeader, MarketStatusBadge, StatePanel, toBaseUnits, formatPool } from '../components/cup/CupKit';
import { cn } from '../utils/format';
import { FreePickPanel } from '../components/cup/FreePickPanel';
import { PunditReadCard } from '../components/cup/PunditReadCard';

const OUTCOMES = [
  { id: 1, label: 'Home', color: 'var(--color-outcome-home)' },
  { id: 2, label: 'Draw', color: 'var(--color-outcome-draw)' },
  { id: 3, label: 'Away', color: 'var(--color-outcome-away)' },
] as const;

export function MarketDetailPage() {
  const matchId = useUiStore((s) => s.marketDetailId);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const { connected, connect, sendTx } = useWalletStore();
  const { data, loading, error, reload } = useApi(
    () => (matchId ? api.market(matchId) : Promise.resolve(null)),
    [matchId],
  );

  const [outcome, setOutcome] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<null | 'approve' | 'stake'>(null);

  if (!matchId) {
    return <div className="mx-auto max-w-md py-20 text-center text-sm text-stadium-text-secondary">No market selected.</div>;
  }

  const canStake = data?.marketStatus === 'open';
  const amountNum = Number(amount) || 0;

  async function handleApprove() {
    if (!data || amountNum <= 0) return;
    setBusy('approve');
    try {
      const { approveTx } = await api.marketStakeTx(matchId!, outcome, toBaseUnits(amountNum));
      await sendTx(approveTx);
      toast.success('Approval submitted — confirm it, then stake');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleStake() {
    if (!data || amountNum <= 0) return;
    setBusy('stake');
    try {
      const { stakeTx } = await api.marketStakeTx(matchId!, outcome, toBaseUnits(amountNum));
      const hash = await sendTx(stakeTx);
      toast.success(`Stake submitted · ${hash.slice(0, 10)}…`);
      setAmount('');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Stake failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <button
        onClick={() => setActiveTab('markets')}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-stadium-text-secondary hover:text-stadium-text"
      >
        <ArrowLeft className="h-4 w-4" /> All markets
      </button>

      <StatePanel loading={loading} error={error} empty={!data} emptyLabel="Market not found" onRetry={reload}>
        {data && (
          <div className="flex flex-col gap-4">
            {/* hero */}
            <div className="stadium-card pitch-stripes overflow-hidden p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stadium-text-muted">{data.stage}</span>
                <MarketStatusBadge status={data.marketStatus} />
              </div>
              <MatchupHeader home={data.home} away={data.away} size="lg" kickoffUtc={data.kickoffUtc} />
              <div className="mt-4 flex justify-between border-t border-stadium-line pt-3 text-xs">
                <span className="text-stadium-text-secondary">
                  Pool <span className="font-mono font-semibold text-stadium-text">{formatPool(data.pools.total)}</span>
                </span>
                <span className="text-stadium-text-secondary">{data.venue}</span>
              </div>
            </div>

            {/* AI pundit read */}
            <PunditReadCard matchId={matchId} />

            {/* outcome buckets */}
            <div className="grid grid-cols-3 gap-2">
              {OUTCOMES.map((o) => {
                const implied = [0, data.impliedOdds.home, data.impliedOdds.draw, data.impliedOdds.away][o.id];
                const fair = data.aiFairOdds
                  ? [0, data.aiFairOdds.home, data.aiFairOdds.draw, data.aiFairOdds.away][o.id]
                  : null;
                const active = outcome === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setOutcome(o.id as 1 | 2 | 3)}
                    disabled={!canStake}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all disabled:opacity-60',
                      active ? 'border-pitch bg-pitch-bg' : 'border-stadium-line hover:border-stadium-line-strong',
                    )}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">{o.label}</div>
                    <div className="font-display mt-1 text-xl" style={{ color: o.color }}>
                      {Math.round(implied * 100)}%
                    </div>
                    <div className="text-[10px] text-stadium-text-secondary">
                      AI fair {fair !== null ? `${Math.round(fair * 100)}%` : '—'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* stake panel */}
            <div className="stadium-card p-4">
              {canStake ? (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-pitch" />
                    <span className="text-sm font-bold text-stadium-text">Stake on {OUTCOMES[outcome - 1].label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="w-full rounded-lg border border-stadium-line bg-stadium-base px-3 py-2.5 font-mono text-sm text-stadium-text outline-none focus:border-pitch-border"
                    />
                    <span className="text-xs font-bold text-stadium-text-secondary">USDT / USDC</span>
                  </div>
                  {!connected ? (
                    <button
                      onClick={() => void connect()}
                      className="mt-3 w-full rounded-xl bg-pitch py-2.5 text-sm font-bold text-stadium-base hover:bg-pitch-bright glow-pitch"
                    >
                      Connect wallet to stake
                    </button>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void handleApprove()}
                        disabled={busy !== null || amountNum <= 0}
                        className="rounded-xl border border-stadium-line-strong py-2.5 text-sm font-bold text-stadium-text hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-50"
                      >
                        {busy === 'approve' ? 'Approving…' : '1 · Approve'}
                      </button>
                      <button
                        onClick={() => void handleStake()}
                        disabled={busy !== null || amountNum <= 0}
                        className="rounded-xl bg-pitch py-2.5 text-sm font-bold text-stadium-base hover:bg-pitch-bright disabled:opacity-50"
                      >
                        {busy === 'stake' ? 'Staking…' : '2 · Stake'}
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-stadium-text-muted">
                    Approve lets the pool pull your stablecoin; stake enters the pool. Winners split the pool pro-rata
                    after the oracle finalizes.
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2.5 text-sm text-stadium-text-secondary">
                  <ShieldCheck className="h-4 w-4 text-gold" />
                  {data.marketStatus === 'contract_not_deployed'
                    ? 'The pool contract is not deployed yet — staking opens after the mainnet deploy.'
                    : data.marketStatus === 'market_not_created'
                      ? 'This market has not been opened on-chain yet.'
                      : data.marketStatus === 'awaiting_settlement'
                        ? 'Staking is closed — waiting for the oracle to finalize the result.'
                        : 'This market is settled. Claim winnings from My Bets.'}
                </div>
              )}
            </div>

            {/* free-to-play pick */}
            <FreePickPanel matchId={matchId} locked={data.matchStatus !== 'scheduled'} />

            {/* oracle strip */}
            <div className="stadium-card flex items-center justify-between p-3.5 text-xs">
              <span className="text-stadium-text-secondary">Settlement oracle</span>
              <span className="font-mono text-stadium-text">
                CupOracleV2 {data.oracle?.registered ? `· state ${data.oracle.state ?? 0}` : '· awaiting registration'}
              </span>
            </div>
          </div>
        )}
      </StatePanel>
    </div>
  );
}
