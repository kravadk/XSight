import { Network, Lock } from 'lucide-react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { PageHeader } from '../components/cup/CupKit';

const ROUNDS = [
  { name: 'Round of 16', slots: 8 },
  { name: 'Quarter-finals', slots: 4 },
  { name: 'Semi-finals', slots: 2 },
  { name: 'Final', slots: 1 },
];

export function BracketPage() {
  const { data } = useApi(() => api.markets(), []);
  const fixtureCount = data?.markets.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        kicker="Knockout stage"
        title="World Cup Bracket"
        sub="Pick the knockout path end to end. Scored automatically against oracle-finalized results."
      />

      <div className="stadium-card mb-4 flex items-center gap-3 p-4">
        <Lock className="h-5 w-5 shrink-0 text-gold" />
        <div className="text-xs text-stadium-text-secondary">
          The bracket unlocks when the group stage finishes — {fixtureCount} fixtures are already tracked live. Until
          then the knockout slots stay empty (no fabricated teams).
        </div>
      </div>

      <div className="stadium-card pitch-stripes overflow-x-auto p-5">
        <div className="flex min-w-[640px] gap-4">
          {ROUNDS.map((round) => (
            <div key={round.name} className="flex flex-1 flex-col">
              <div className="mb-3 text-center text-micro text-pitch">{round.name}</div>
              <div className="flex flex-1 flex-col justify-around gap-2">
                {Array.from({ length: round.slots }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-12 items-center justify-center rounded-lg border border-dashed border-stadium-line-strong bg-stadium-base text-[10px] uppercase tracking-wider text-stadium-text-muted"
                  >
                    {round.name === 'Final' ? '🏆 Champion' : 'TBD'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-stadium-text-muted">
        <Network className="h-3.5 w-3.5" />
        Bracket picks are off-chain; a completed bracket can be minted as an evolving NFT (stretch).
      </div>
    </div>
  );
}
