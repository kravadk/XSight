import { useState } from 'react';
import { Gift } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useWalletStore } from '../../store/walletStore';
import { toast } from '../../store/toastStore';
import { cn } from '../../utils/format';

const OUTCOMES = [
  { id: 'HOME', label: 'Home' },
  { id: 'DRAW', label: 'Draw' },
  { id: 'AWAY', label: 'Away' },
] as const;

/**
 * Free-to-play pick panel — records a no-money outcome call for the fixture and shows
 * the player's existing pick + its scored result. Sits below the staking panel.
 */
export function FreePickPanel({ matchId, locked }: { matchId: string; locked: boolean }) {
  const { connected, address, connect } = useWalletStore();
  const { data, reload } = useApi(
    () => (connected && address ? api.freePicks({ wallet: address, matchId }) : Promise.resolve({ picks: [] })),
    [connected, address, matchId],
  );
  const myPick = data?.picks[0] ?? null;
  const [choice, setChoice] = useState<'HOME' | 'DRAW' | 'AWAY' | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!address || !choice) return;
    setBusy(true);
    try {
      await api.makeFreePick(matchId, address, choice);
      toast.success('Free pick recorded');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Free pick failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stadium-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Gift className="h-4 w-4 text-gold" />
        <span className="text-sm font-bold text-stadium-text">Free pick — no stake</span>
        <span className="ml-auto text-[10px] text-stadium-text-muted">earns points, not USDC</span>
      </div>

      {myPick ? (
        <div className="text-xs text-stadium-text-secondary">
          Your free pick: <span className="font-bold text-stadium-text">{myPick.outcome}</span>
          {myPick.resolvedCorrect === null
            ? ' · pending result'
            : myPick.resolvedCorrect
              ? ` · correct +${myPick.points} pts`
              : ' · missed'}
        </div>
      ) : locked ? (
        <div className="text-xs text-stadium-text-secondary">Free picks are closed for this fixture.</div>
      ) : !connected ? (
        <button
          onClick={() => void connect()}
          className="w-full rounded-xl border border-stadium-line-strong py-2 text-sm font-bold text-stadium-text hover:bg-[rgba(255,255,255,0.05)]"
        >
          Connect wallet to make a free pick
        </button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.id}
                onClick={() => setChoice(o.id)}
                className={cn(
                  'rounded-xl border p-2 text-sm font-bold transition-all',
                  choice === o.id
                    ? 'border-pitch bg-pitch-bg text-stadium-text'
                    : 'border-stadium-line text-stadium-text-secondary hover:border-stadium-line-strong',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void submit()}
            disabled={busy || !choice}
            className="mt-3 w-full rounded-xl bg-gold py-2.5 text-sm font-bold text-stadium-base hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Recording…' : 'Make free pick'}
          </button>
        </>
      )}
    </div>
  );
}
