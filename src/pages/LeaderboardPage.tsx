import { Crown, Bot, User } from 'lucide-react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useWalletStore } from '../store/walletStore';
import { PageHeader } from '../components/cup/CupKit';

export function LeaderboardPage() {
  const { connected, address, short } = useWalletStore();
  const fan = useApi(
    () => (connected && address ? api.cupFanScore(address) : Promise.resolve(null)),
    [connected, address],
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        kicker="Beat the bots"
        title="Leaderboard"
        sub="Global ranking by pick accuracy and settled P&L — populated from on-chain results."
      />

      <div className="stadium-card pitch-stripes mb-4 p-5">
        <div className="mb-4 flex items-center gap-2 text-micro text-pitch">
          <Crown className="h-3.5 w-3.5" /> You vs Hermes
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-stadium-line bg-stadium-base p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-pitch-bg">
                <User className="h-4 w-4 text-pitch" />
              </div>
              <span className="text-sm font-bold text-stadium-text">{connected ? short : 'You'}</span>
            </div>
            <div className="font-display text-3xl text-pitch">{fan.data ? fan.data.score : '—'}</div>
            <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">
              {connected ? 'FanPass score' : 'connect wallet'}
            </div>
          </div>
          <div className="rounded-xl border border-gold-border bg-gold-bg p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-stadium-base">
                <Bot className="h-4 w-4 text-gold" />
              </div>
              <span className="text-sm font-bold text-stadium-text">Hermes</span>
            </div>
            <div className="font-display text-3xl text-gold">AI</div>
            <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">autonomous pundit</div>
          </div>
        </div>
      </div>

      <div className="stadium-card flex flex-col items-center gap-2 p-12 text-center">
        <Crown className="h-7 w-7 text-gold" />
        <div className="text-sm font-semibold text-stadium-text">Global ranking opens at the first settlement</div>
        <div className="max-w-md text-xs text-stadium-text-secondary">
          Ranks are computed from real settled markets — accuracy and pro-rata P&L. The board fills the moment the
          oracle finalizes its first World Cup result.
        </div>
      </div>
    </div>
  );
}
