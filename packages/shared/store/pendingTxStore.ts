import { create } from 'zustand';

export interface PendingTx {
  hash: string;
  label: string;
  startedAt: number;
}

interface PendingTxState {
  items: PendingTx[];
  add: (hash: string, label?: string) => void;
  remove: (hash: string) => void;
  clear: () => void;
}

/**
 * Tracks in-flight on-chain transactions the app submitted on behalf of the
 * user. Populated by `walletStore.sendTx` and drained by `walletStore.waitForTx`
 * (success or revert), so the TopBar pill always reflects the live count.
 *
 * Used by the small "N pending" indicator next to the notifications bell — a
 * stake or claim that takes 30+ seconds otherwise looks like the app froze.
 */
export const usePendingTxStore = create<PendingTxState>((set) => ({
  items: [],
  add: (hash, label = 'Transaction') =>
    set((s) =>
      s.items.some((t) => t.hash === hash)
        ? s
        : { items: [...s.items, { hash, label, startedAt: Date.now() }] },
    ),
  remove: (hash) => set((s) => ({ items: s.items.filter((t) => t.hash !== hash) })),
  clear: () => set({ items: [] }),
}));
