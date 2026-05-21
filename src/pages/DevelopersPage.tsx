import { ExternalLink, Boxes, Radio, Plug } from 'lucide-react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { PageHeader } from '../components/cup/CupKit';
import { cn } from '../utils/format';

export function DevelopersPage() {
  const oracle = useApi(() => api.cupContract(), []);
  const market = useApi(() => api.markets(), []);
  const adapters = useApi(() => api.cupAdapters(), []);
  const x402 = useApi(() => api.x402Spec(), []);

  const contracts = [
    oracle.data && {
      name: 'CupOracleV2',
      address: oracle.data.address,
      explorerUrl: oracle.data.explorerUrl,
      status: oracle.data.status,
    },
    market.data && {
      name: 'ParimutuelMarket',
      address: market.data.contract.address,
      explorerUrl: market.data.contract.explorerUrl,
      status: market.data.contract.status,
    },
  ].filter(Boolean) as { name: string; address: string | null; explorerUrl: string | null; status: string }[];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        kicker="Build on the oracle"
        title="Developers"
        sub="The settlement layer is open: verified contracts, a multi-source oracle, and x402-paid data for agents."
      />

      <div className="flex flex-col gap-4">
        <section className="stadium-card p-4">
          <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
            <Boxes className="h-3.5 w-3.5" /> On-chain contracts · X Layer 196
          </div>
          <div className="flex flex-col gap-2">
            {contracts.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-lg border border-stadium-line bg-stadium-base px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-stadium-text">{c.name}</div>
                  <div className="truncate font-mono text-[11px] text-stadium-text-muted">
                    {c.address ?? 'not deployed yet'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                      c.status === 'deployed'
                        ? 'bg-pitch-bg text-pitch'
                        : 'bg-[rgba(255,255,255,0.05)] text-stadium-text-muted',
                    )}
                  >
                    {c.status === 'deployed' ? 'deployed' : 'pending'}
                  </span>
                  {c.explorerUrl && (
                    <a
                      href={c.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-7 w-7 place-items-center rounded-md text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-outcome-away"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="stadium-card p-4">
          <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
            <Radio className="h-3.5 w-3.5" /> Oracle source adapters
          </div>
          {adapters.data ? (
            <>
              <div className="mb-2 text-xs text-stadium-text-secondary">
                {adapters.data.liveSources}/{adapters.data.requiredLiveSources} live sources ·{' '}
                {adapters.data.readyForProductionSettlement ? 'quorum ready' : 'quorum incomplete'}
              </div>
              <div className="flex flex-col gap-1.5">
                {adapters.data.adapters.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <span className="text-stadium-text">{a.name}</span>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                        a.status === 'live'
                          ? 'bg-pitch-bg text-pitch'
                          : 'bg-[rgba(255,255,255,0.05)] text-stadium-text-muted',
                      )}
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-stadium-text-muted">loading sources…</div>
          )}
        </section>

        <section className="stadium-card p-4">
          <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
            <Plug className="h-3.5 w-3.5" /> x402-paid data API
          </div>
          {x402.data ? (
            <div className="flex flex-col gap-1.5">
              {x402.data.endpoints.slice(0, 8).map((e) => (
                <div
                  key={e.path}
                  className="flex items-center justify-between rounded-lg border border-stadium-line px-3 py-2 font-mono text-[11px]"
                >
                  <span className="truncate text-stadium-text">
                    <span className="text-pitch">{e.method}</span> {e.path}
                  </span>
                  <span className="shrink-0 text-gold">{e.priceUsdt} USDT</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-stadium-text-muted">loading x402 spec…</div>
          )}
        </section>
      </div>
    </div>
  );
}
