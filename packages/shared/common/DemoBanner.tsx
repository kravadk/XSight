import { motion } from 'motion/react';
import { Compass, Wallet } from 'lucide-react';
import { useWalletStore } from '@shared/store/walletStore';
import { useUiStore } from '@shared/store/uiStore';

/**
 * Explore-mode strip shown while no wallet is connected. Every screen and the
 * free pick stay fully usable without a wallet — this just frames that as a
 * deliberate demo mode and offers the two next steps. Disappears on connect.
 */
export function DemoBanner() {
  const connected = useWalletStore((s) => s.connected);
  const product = useUiStore((s) => s.product);
  const setConnectModalOpen = useUiStore((s) => s.setConnectModalOpen);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  if (connected) return null;
  // Banner copy + free-pick CTA are X-Cup-specific. Don't surface on other products.
  if (product !== 'xcup') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mb-4 flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-pitch-border bg-pitch-bg px-3.5 py-2.5"
    >
      <Compass className="h-4 w-4 shrink-0 text-pitch" />
      <span className="min-w-0 flex-1 text-xs text-stadium-text-secondary">
        <span className="font-bold text-stadium-text">You're exploring X Cup.</span> Every
        screen is open — connect a wallet to stake real funds, or make a free pick with no
        wallet at all.
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setActiveTab('markets')}
          className="rounded-lg border border-stadium-line-strong px-3 py-1.5 text-[11px] font-bold text-stadium-text hover:bg-[rgba(255,255,255,0.06)]"
        >
          Make a free pick
        </button>
        <button
          onClick={() => setConnectModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-pitch px-3 py-1.5 text-[11px] font-bold text-stadium-base hover:bg-pitch-bright"
        >
          <Wallet className="h-3.5 w-3.5" /> Connect
        </button>
      </div>
    </motion.div>
  );
}
