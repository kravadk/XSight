import { Wallet, Coins, Sparkles, Briefcase } from 'lucide-react';
import { useWalletStore } from '@shared/store/walletStore';
import { useApiStore } from '@shared/store/apiStore';
import { StatCard } from '@shared/common/StatCard';

export function StatCards() {
  const totalUsd = useWalletStore((s) => s.totalUsd);
  const tokens = useWalletStore((s) => s.tokens);
  const loading = useWalletStore((s) => s.loading);
  const economy = useApiStore((s) => s.economy);

  const lpYield = economy?.lpYieldEarnedUsdt ?? 0;
  const lpDeposited = economy?.lpDepositedUsdt ?? 0;
  const callsToday = useApiStore((s) => s.callsToday);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
      <StatCard
        label="Total Value"
        value={totalUsd}
        prefix="$"
        decimals={2}
        icon={<Briefcase className="w-4 h-4" />}
        hint="across all tokens"
        progress={Math.min(1, totalUsd / 1000)}
        loading={loading}
      />
      <StatCard
        label="Holdings"
        value={tokens.length}
        decimals={0}
        icon={<Wallet className="w-4 h-4" />}
        hint="distinct tokens"
        progress={Math.min(1, tokens.length / 8)}
        color="#A78BFA"
      />
      <StatCard
        label="LP Yield"
        value={lpYield}
        prefix="$"
        decimals={2}
        icon={<Coins className="w-4 h-4" />}
        hint={`on $${lpDeposited.toFixed(0)} deployed`}
        progress={lpDeposited > 0 ? lpYield / lpDeposited : 0}
        color="#22C55E"
      />
      <StatCard
        label="API Calls 24h"
        value={callsToday}
        decimals={0}
        icon={<Sparkles className="w-4 h-4" />}
        hint="x402 paid endpoints"
        progress={Math.min(1, callsToday / 100)}
        color="#F59E0B"
      />
    </div>
  );
}
