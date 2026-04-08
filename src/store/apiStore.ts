import { create } from 'zustand';
import type { X402CallLogEntry, EconomySnapshotDto } from '../api/client';

interface ApiState {
  totalEarned: number;
  today: number;
  callsToday: number;
  recentCalls: X402CallLogEntry[];
  economy: EconomySnapshotDto | null;
  loading: boolean;
  error: string | null;
  setStats: (input: { totalEarned: number; today: number; callsToday: number }) => void;
  setRecentCalls: (calls: X402CallLogEntry[]) => void;
  setEconomy: (snapshot: EconomySnapshotDto) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useApiStore = create<ApiState>((set) => ({
  totalEarned: 0,
  today: 0,
  callsToday: 0,
  recentCalls: [],
  economy: null,
  loading: false,
  error: null,
  setStats: (input) => set(input),
  setRecentCalls: (calls) => set({ recentCalls: calls }),
  setEconomy: (snapshot) => set({ economy: snapshot }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
