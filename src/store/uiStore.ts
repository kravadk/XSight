import { create } from 'zustand';

export type Tab =
  | 'dashboard'
  | 'chat'
  | 'portfolio'
  | 'api'
  | 'earn'
  | 'guide'
  | 'build'
  | 'files'
  | 'rewards';
export type SubTab = 'chat' | 'trade';

interface UiState {
  activeTab: Tab;
  activeSubTab: SubTab;
  setActiveTab: (tab: Tab) => void;
  setActiveSubTab: (subTab: SubTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'chat', // First-load lands on AI Chat per spec
  activeSubTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveSubTab: (subTab) => set({ activeSubTab: subTab }),
}));

