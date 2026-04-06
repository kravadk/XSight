import { create } from 'zustand';

export type TabKey = 'chat' | 'portfolio' | 'api' | 'earn';

interface UiState {
  activeTab: TabKey;
  setTab: (t: TabKey) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'chat',
  setTab: (t) => set({ activeTab: t }),
}));
