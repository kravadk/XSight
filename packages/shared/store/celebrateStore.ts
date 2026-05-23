import { create } from 'zustand';

/**
 * Tiny pub-sub for one-shot celebrations. A win or a saved bracket calls
 * `celebrate()`; the single mounted <Confetti/> watches `nonce` and fires a
 * burst. Kept as a store (not a prop) so any screen can trigger it.
 */
interface CelebrateState {
  /** Bumped on every celebration — the Confetti component keys off the change. */
  nonce: number;
  celebrate: () => void;
}

export const useCelebrateStore = create<CelebrateState>((set) => ({
  nonce: 0,
  celebrate: () => set((s) => ({ nonce: s.nonce + 1 })),
}));

/** Fire a confetti burst from anywhere. */
export const celebrate = () => useCelebrateStore.getState().celebrate();
