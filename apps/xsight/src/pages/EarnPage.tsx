import { RotateCw, Zap, ExternalLink, Sliders } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApiStore } from '@shared/store/apiStore';
import { useWalletStore } from '@shared/store/walletStore';
import { toast } from '@shared/store/toastStore';
import { cn } from '@shared/utils/format';
import { api, ApiError, type DeployEventDto } from '@shared/api/client';
import { useChat } from '@shared/hooks/useChat';
import { useUiStore } from '@shared/store/uiStore';
import { Toggle } from '@shared/common/Toggle';
import { AnimatedNumber } from '@shared/common/AnimatedNumber';
import { StrategiesPanel } from '@xsight/components/earn/StrategiesPanel';
import { EarnLoopDiagram } from '@xsight/components/earn/EarnLoopDiagram';
import { HeartbeatCard } from '@xsight/components/earn/HeartbeatCard';
import { StateBlock } from '@shared/common/StateBlock';
import { ActionButton } from '@shared/common/ActionButton';

export function EarnPage() {
  const economy = useApiStore((s) => s.economy);
  const setEconomy = useApiStore((s) => s.setEconomy);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const tokens = useWalletStore((s) => s.tokens);
  const { send } = useChat();
  const [autoCompound, setAutoCompound] = useState(true);
  const [threshold, setThreshold] = useState('0.05');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deploys, setDeploys] = useState<DeployEventDto[]>([]);

  // Manual deploy form state
  const [deployFraction, setDeployFraction] = useState(50); // %
  const [deploying, setDeploying] = useState(false);

  const loadHistory = async () => {
    try {
      const h = await api.deployHistory();
      setDeploys(h.deploys);
    } catch {
      /* */
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    if (economy) {
      setAutoCompound(economy.autoDeployEnabled);
      setThreshold(String(economy.threshold ?? 0.05));
    }
  }, [economy]);

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      const fresh = await api.economy();
      setEconomy(fresh);
      await loadHistory();
      toast.success('Snapshot refreshed');
    } catch (err) {
      toast.error(err instanceof ApiError && err.detail ? err.detail : 'refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const saveConfig = async () => {
    const num = Number(threshold);
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Threshold must be a non-negative number');
      return;
    }
    setSaving(true);
    try {
      const res = await api.configureEconomy({ autoDeployEnabled: autoCompound, threshold: num });
      setAutoCompound(res.autoDeployEnabled);
      setThreshold(String(res.threshold));
      toast.success('Auto-deploy configuration saved');
      const fresh = await api.economy();
      setEconomy(fresh);
    } catch (err) {
      toast.error(err instanceof ApiError && err.detail ? err.detail : 'save failed');
    } finally {
      setSaving(false);
    }
  };

  const triggerDeploy = async () => {
    setDeploying(true);
    try {
      const res = await api.triggerDeploy({ fraction: deployFraction / 100, force: true });
      if (!res.ok) {
        toast.error(res.reason ?? 'deploy failed');
      } else {
        const from = res.fromAmountUsdt != null ? res.fromAmountUsdt.toFixed(4) : '?';
        const to = res.toAmountOkb != null ? res.toAmountOkb.toFixed(8) : '?';
        toast.success(`Deployed ${from} USDT → ${to} OKB`);
        const fresh = await api.economy();
        setEconomy(fresh);
        await loadHistory();
      }
    } catch (err) {
      toast.error(err instanceof ApiError && err.detail ? err.detail : 'request failed');
    } finally {
      setDeploying(false);
    }
  };

  const withdrawLp = () => {
    setActiveTab('chat');
    void send('Withdraw my OKB/USDT LP position');
  };

  const totalRevenue = economy?.totalRevenueUsdt ?? 0;
  const lpDeposited = economy?.lpDepositedUsdt ?? 0;
  const lpYield = economy?.lpYieldEarnedUsdt ?? 0;
  const lpCurrent = economy?.lpCurrentUsdt ?? 0;
  const lpActive = economy?.lpActive ?? false;
  const expensesGas = economy?.expensesGasOkb ?? 0;
  const expensesAi = economy?.expensesAiUsdt ?? 0;
  const netProfit = economy?.netProfitUsdt ?? 0;

  const usdtBalance = tokens.find((t) => t.symbol.toUpperCase() === 'USDT')?.amount ?? 0;
  const numericThreshold = Number(threshold) || 0;
  const surplus = Math.max(0, usdtBalance - numericThreshold);
  const deployAmount = Math.max(0.001, (surplus * deployFraction) / 100);
  const canDeploy = surplus > 0;

  // Annualize yield using actual elapsed time since first deploy.
  // Formula: (yield / deposited) / (elapsedDays / 365) * 100
  const aprEstimate = useMemo(() => {
    if (!lpActive || lpDeposited <= 0 || lpYield <= 0) return 0;
    const lastDeployAt = economy?.lastDeployAt ?? 0;
    if (!lastDeployAt) return 0;
    const elapsedMs = Date.now() - lastDeployAt;
    const elapsedDays = Math.max(elapsedMs / 86_400_000, 1 / 24); // minimum 1 hour
    return (lpYield / lpDeposited) * (365 / elapsedDays) * 100;
  }, [lpActive, lpDeposited, lpYield, economy?.lastDeployAt]);

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full pb-10">
      <EarnLoopDiagram />
      <HeartbeatCard />
      {/* Compact header — replaces the big animated 4-node banner */}
      <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-4 md:p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-lg font-bold text-[#F5F5F5]">Auto-Yield Loop</h1>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border',
                  autoCompound
                    ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border-[rgba(34,197,94,0.22)]'
                    : 'bg-[rgba(255,255,255,0.06)] text-[#D1D5DB] border-[rgba(255,255,255,0.10)]',
                )}
              >
                {autoCompound ? 'armed' : 'disabled'}
              </span>
            </div>
            <div className="text-xs text-[#A3A3A3]">
              Earn → store → deploy surplus → re-earn. Loop runs on the agentic wallet.
            </div>
          </div>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-[#F5F5F5] text-[11px] font-bold uppercase tracking-wider"
          >
            <RotateCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* 4-column status strip — compact, no animation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">x402 revenue</div>
            <div className="text-base font-extrabold text-[#BFFF00] tabular">
              <AnimatedNumber value={totalRevenue} prefix="$" decimals={4} />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">USDT idle</div>
            <div className="text-base font-extrabold text-[#F5F5F5] tabular">
              <AnimatedNumber value={usdtBalance} decimals={4} />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">deploys</div>
            <div className="text-base font-extrabold text-[#F5F5F5] tabular">
              {economy?.deployCount ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">net profit</div>
            <div className={cn('text-base font-extrabold tabular', netProfit >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
              <AnimatedNumber value={netProfit} prefix="$" decimals={4} />
            </div>
          </div>
        </div>
      </div>

      {/* Manual Deploy form — REAL functional control */}
      <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#BFFF00]" />
            <h3 className="text-sm font-bold text-[#F5F5F5]">Manual deploy</h3>
          </div>
          <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">
            converts surplus USDT into OKB on-chain
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-[#1A1A1A] border border-[rgba(255,255,255,0.04)] rounded-lg p-3">
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">USDT balance</div>
            <div className="text-base font-extrabold text-[#F5F5F5] tabular">{usdtBalance.toFixed(4)}</div>
          </div>
          <div className="bg-[#1A1A1A] border border-[rgba(255,255,255,0.04)] rounded-lg p-3">
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">Threshold</div>
            <div className="text-base font-extrabold text-[#F5F5F5] tabular">{numericThreshold.toFixed(4)}</div>
          </div>
          <div className="bg-[#1A1A1A] border border-[rgba(255,255,255,0.04)] rounded-lg p-3">
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">Surplus available</div>
            <div className={cn('text-base font-extrabold tabular', canDeploy ? 'text-[#BFFF00]' : 'text-[#9CA3AF]')}>
              {surplus.toFixed(4)}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 text-[11px]">
            <label className="text-[#A3A3A3]">Deploy fraction of surplus</label>
            <span className="font-bold text-[#BFFF00] tabular">{deployFraction}%</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={deployFraction}
              onChange={(e) => setDeployFraction(Number(e.target.value))}
              className="flex-1 accent-[#BFFF00]"
            />
            <div className="flex gap-1">
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  onClick={() => setDeployFraction(p)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded-full',
                    deployFraction === p
                      ? 'bg-[#BFFF00] text-[#0A0A0A]'
                      : 'bg-[rgba(255,255,255,0.04)] text-[#A3A3A3] hover:bg-[rgba(255,255,255,0.08)]',
                  )}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[rgba(191,255,0,0.04)] border border-[rgba(191,255,0,0.15)] rounded-lg p-3 mb-4 text-xs">
          <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">You will deploy</div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F5F5F5] tabular">
              {canDeploy ? deployAmount.toFixed(4) : '0.0000'} USDT
            </span>
            <span className="text-[#9CA3AF]">→ swap to OKB via OnchainOS DEX</span>
          </div>
        </div>

        <button
          onClick={triggerDeploy}
          disabled={deploying || !canDeploy}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#BFFF00] hover:bg-[#D4FF33] text-[#0A0A0A] text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-lime"
        >
          <Zap className="w-4 h-4" />
          {deploying ? 'Deploying on-chain...' : canDeploy ? `Execute deploy (${deployAmount.toFixed(4)} USDT)` : 'Surplus too small'}
        </button>
        {!canDeploy && (
          <p className="text-[10px] text-[#9CA3AF] text-center mt-2">
            Deposit USDT or wait for x402 revenue to exceed the {numericThreshold.toFixed(4)} USDT threshold.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* LP Position card */}
        <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5] mb-0.5">
                {lpActive ? 'Active position' : 'No position yet'}
              </h3>
              <div className="text-[11px] text-[#A3A3A3]">USDT → OKB cumulative</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Est APR</div>
              <div className="text-xl font-extrabold text-[#BFFF00] tabular">
                {lpActive ? `${aprEstimate.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          {!lpActive ? (
            <div className="text-[11px] text-[#A3A3A3] leading-relaxed">
              Auto-deploy is {autoCompound ? 'armed' : 'disabled'}. The first execution flips this card
              into a live position with mark-to-market PnL.
            </div>
          ) : (
            <div className="space-y-3">
              <Row label="Deployed (cost basis)" value={`$${lpDeposited.toFixed(4)}`} />
              <Row label="Current value (mark-to-market)" value={`$${lpCurrent.toFixed(4)}`} />
              <Row
                label="Yield earned"
                value={`${lpYield >= 0 ? '+' : ''}$${lpYield.toFixed(4)}`}
                accent={lpYield >= 0 ? 'green' : 'red'}
              />
              <Row label="Deploy executions" value={String(economy?.deployCount ?? 0)} />
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={withdrawLp}
              disabled={!lpActive}
              title="Opens AI chat — ask XSight to help you swap OKB back to USDT"
              className="flex-1 h-9 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F5] text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              Ask AI to withdraw
            </button>
          </div>
        </div>

        {/* Auto-deploy settings */}
        <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
          <h3 className="text-sm font-bold text-[#F5F5F5] mb-4">Auto-deploy settings</h3>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center p-3 bg-[#1A1A1A] rounded-lg border border-[rgba(255,255,255,0.04)]">
              <div>
                <div className="text-xs font-bold text-[#F5F5F5]">Auto-compound</div>
                <div className="text-[10px] text-[#9CA3AF]">Reinvest accumulated x402 fees</div>
              </div>
              <Toggle checked={autoCompound} onChange={setAutoCompound} ariaLabel="Auto-compound" />
            </div>

            <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[rgba(255,255,255,0.04)]">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="text-xs font-bold text-[#F5F5F5]">Trigger threshold</div>
                  <div className="text-[10px] text-[#9CA3AF]">Min USDT in wallet before auto-fire</div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-20 h-7 px-2 text-xs font-mono text-[#F5F5F5] bg-[#0A0A0A] rounded border border-[rgba(255,255,255,0.1)] tabular text-right focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
                  />
                  <span className="text-[10px] text-[#9CA3AF]">USDT</span>
                </div>
              </div>
              {/* Quick presets */}
              <div className="flex gap-1 mt-1">
                {[0.05, 0.5, 5, 50].map((v) => (
                  <button
                    key={v}
                    onClick={() => setThreshold(String(v))}
                    className={cn(
                      'flex-1 px-2 py-1 text-[10px] font-bold rounded',
                      Number(threshold) === v
                        ? 'bg-[#BFFF00] text-[#0A0A0A]'
                        : 'bg-[rgba(255,255,255,0.04)] text-[#A3A3A3] hover:bg-[rgba(255,255,255,0.08)]',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="w-full h-10 bg-[#BFFF00] hover:bg-[#D4FF33] text-[#0A0A0A] text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save configuration'}
          </button>
        </div>
      </div>

      <StrategiesPanel />

      {/* Deploy history */}
      <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
            On-chain deploy history
            <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{deploys.length} events</span>
          </h3>
        </div>
        {deploys.length === 0 ? (
          <StateBlock
            compact
            kind="empty"
            title="No deploys executed yet"
            body="Manual deploys and auto-deploy transactions will appear here with scan links after the first on-chain execution."
            action={<ActionButton tone="secondary" onClick={refreshAll} loading={refreshing}>Refresh history</ActionButton>}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {deploys.slice(0, 10).map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 p-2.5 bg-[#1A1A1A] rounded-lg border border-[rgba(255,255,255,0.04)] text-xs"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono text-[#F5F5F5] tabular truncate">
                    {d.fromAmountUsdt.toFixed(4)} USDT → {d.toAmountOkb.toFixed(8)} OKB
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">{new Date(d.timestamp).toLocaleString()}</span>
                </div>
                <a
                  href={d.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(191,255,0,0.06)] text-[#BFFF00] hover:bg-[rgba(191,255,0,0.12)] text-[10px] font-bold"
                >
                  TX <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compact accounting strip — replaces the 4 huge revenue StatCards */}
      <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
        <h3 className="text-sm font-bold text-[#F5F5F5] mb-3">Accounting</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Cell label="Revenue" value={`$${totalRevenue.toFixed(4)}`} color="text-[#BFFF00]" />
          <Cell label="Gas (OKB)" value={expensesGas.toFixed(6)} color="text-[#A3A3A3]" />
          <Cell label="AI cost" value={`$${expensesAi.toFixed(4)}`} color="text-[#A78BFA]" />
          <Cell
            label="Net profit"
            value={`$${netProfit.toFixed(4)}`}
            color={netProfit >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'red' }) {
  const color = accent === 'green' ? 'text-[#22C55E]' : accent === 'red' ? 'text-[#EF4444]' : 'text-[#F5F5F5]';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#A3A3A3]">{label}</span>
      <span className={cn('font-mono tabular font-bold', color)}>{value}</span>
    </div>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{label}</div>
      <div className={cn('text-base font-extrabold tabular', color)}>{value}</div>
    </div>
  );
}

