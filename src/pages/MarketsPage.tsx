import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api, type MarketViewDto } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/uiStore';
import { MatchupHeader, OutcomeBar, MarketStatusBadge, PageHeader, StatePanel, formatPool } from '../components/cup/CupKit';
import { cn } from '../utils/format';

type Filter = 'all' | 'upcoming' | 'live' | 'finished';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'live', label: 'Live' },
  { id: 'finished', label: 'Finished' },
];

export function MarketsPage() {
  const { data, loading, error, reload } = useApi(() => api.markets(), []);
  const openMarket = useUiStore((s) => s.openMarket);
  const [filter, setFilter] = useState<Filter>('all');

  const markets = useMemo(() => data?.markets ?? [], [data]);
  const filtered = useMemo(
    () =>
      markets.filter((m) => {
        if (filter === 'live') return m.matchStatus === 'live';
        if (filter === 'finished') return m.matchStatus === 'final' || m.matchStatus === 'settled';
        if (filter === 'upcoming') return m.matchStatus === 'scheduled';
        return true;
      }),
    [markets, filter],
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        kicker="World Cup 2026 · X Layer"
        title="Match Markets"
        sub="Real-money pari-mutuel pools on football outcomes — settled by a trustless multi-source oracle."
        action={
          data?.contract.address ? (
            <span className="hidden rounded-lg border border-pitch-border bg-pitch-bg px-3 py-1.5 text-xs font-bold text-pitch md:block">
              Pool contract live
            </span>
          ) : undefined
        }
      />

      <div className="mb-5 flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
              filter === f.id
                ? 'bg-pitch text-stadium-base'
                : 'border border-stadium-line text-stadium-text-secondary hover:text-stadium-text',
            )}
          >
            {f.label}
          </button>
        ))}
        {!loading && !error && (
          <span className="ml-auto text-xs tabular text-stadium-text-muted">{filtered.length} markets</span>
        )}
      </div>

      <StatePanel
        loading={loading}
        error={error}
        empty={filtered.length === 0}
        emptyLabel="No fixtures in this filter yet"
        onRetry={reload}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MarketCard key={m.id} market={m} onOpen={() => openMarket(m.id)} />
          ))}
        </div>
      </StatePanel>
    </div>
  );
}

function MarketCard({ market, onOpen }: { market: MarketViewDto; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="stadium-card stadium-card-hover group flex flex-col gap-3.5 p-4 text-left">
      <div className="flex items-center justify-between">
        <span className="truncate text-[11px] font-semibold text-stadium-text-muted">{market.stage}</span>
        <MarketStatusBadge status={market.marketStatus} />
      </div>

      <MatchupHeader home={market.home} away={market.away} kickoffUtc={market.kickoffUtc} />

      <OutcomeBar odds={market.impliedOdds} winningOutcome={market.winningOutcome} />

      <div className="flex items-center justify-between border-t border-stadium-line pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">Pool</div>
          <div className="font-mono text-sm font-semibold text-stadium-text">{formatPool(market.pools.total)}</div>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-pitch opacity-0 transition-opacity group-hover:opacity-100">
          Predict <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}
