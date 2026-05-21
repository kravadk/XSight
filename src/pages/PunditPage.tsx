import { Bot } from 'lucide-react';
import { api, type MarketViewDto } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/uiStore';
import { MatchupHeader, PageHeader, StatePanel } from '../components/cup/CupKit';
import { cn } from '../utils/format';

export function PunditPage() {
  const { data, loading, error, reload } = useApi(() => api.markets(), []);
  const openMarket = useUiStore((s) => s.openMarket);

  const upcoming = (data?.markets ?? []).filter((m) => m.matchStatus === 'scheduled').slice(0, 9);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        kicker="Autonomous opponent"
        title="Hermes — AI Pundit"
        sub="An autonomous agent that reads every fixture, posts a conviction-weighted pick, and stakes its own wallet. Beat it."
      />

      <div className="stadium-card pitch-stripes mb-5 flex items-center gap-4 p-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gold-bg ring-1 ring-gold-border">
          <Bot className="h-8 w-8 text-gold" />
        </div>
        <div className="flex-1">
          <div className="font-display text-2xl tracking-wide text-stadium-text">HERMES</div>
          <div className="text-xs text-stadium-text-secondary">
            Autonomous football pundit · stakes real USDC from its own wallet · posts every pick to X.
          </div>
        </div>
        <div className="text-right">
          <div className="text-micro text-stadium-text-muted">Record</div>
          <div className="font-mono text-sm text-stadium-text">tracks from kickoff</div>
        </div>
      </div>

      <div className="mb-3 text-micro text-pitch">Open picks</div>
      <StatePanel
        loading={loading}
        error={error}
        empty={upcoming.length === 0}
        emptyLabel="No upcoming fixtures to read"
        onRetry={reload}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((m) => (
            <PunditPick key={m.id} market={m} onOpen={() => openMarket(m.id)} />
          ))}
        </div>
      </StatePanel>
    </div>
  );
}

function PunditPick({ market, onOpen }: { market: MarketViewDto; onOpen: () => void }) {
  const { data: edge, loading } = useApi(() => api.cupAiEdge(market.id), [market.id]);

  return (
    <button onClick={onOpen} className="stadium-card stadium-card-hover flex flex-col gap-3 p-4 text-left">
      <span className="truncate text-[11px] font-semibold text-stadium-text-muted">{market.stage}</span>
      <MatchupHeader home={market.home} away={market.away} size="sm" kickoffUtc={market.kickoffUtc} />
      <div className="flex items-center justify-between border-t border-stadium-line pt-3">
        {loading ? (
          <span className="skeleton h-5 w-24 rounded" />
        ) : edge ? (
          <>
            <span className="flex items-center gap-1.5 text-sm font-bold">
              <Bot className="h-3.5 w-3.5 text-gold" />
              <span className={cn(edge.edge === 'NO_TRADE' ? 'text-stadium-text-muted' : 'text-stadium-text')}>
                {edge.edge === 'NO_TRADE' ? 'No pick' : edge.edge}
              </span>
            </span>
            <span className="rounded bg-gold-bg px-2 py-0.5 text-[10px] font-bold tabular text-gold">
              conv {edge.confidence.toFixed(2)}
            </span>
          </>
        ) : (
          <span className="text-xs text-stadium-text-muted">read unavailable</span>
        )}
      </div>
    </button>
  );
}
