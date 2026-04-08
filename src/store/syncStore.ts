import { create } from 'zustand';

interface SyncState {
  /** Wall-clock timestamp of last successful poll */
  lastSyncMs: number;
  /** Interval between polls (ms) */
  pollIntervalMs: number;
  /** Backend health flag */
  online: boolean;
  setLastSync: (ms: number) => void;
  setOnline: (online: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  lastSyncMs: 0,
  pollIntervalMs: 15_000,
  online: false,
  setLastSync: (ms) => set({ lastSyncMs: ms, online: true }),
  setOnline: (online) => set({ online }),
}));
