import { create } from 'zustand';

/**
 * X Cup destinations (DESIGN §5). Legacy XSight tabs are kept in the union so the
 * retired trading components still type-check; they are no longer in the nav.
 */
export type Tab =
  | 'markets'
  | 'market-detail'
  | 'bets'
  | 'bracket'
  | 'leaderboard'
  | 'pundit'
  | 'fanpass'
  | 'developers'
  // legacy — retired from the X Cup nav
  | 'dashboard'
  | 'chat'
  | 'portfolio'
  | 'api'
  | 'earn'
  | 'cup'
  | 'agentbet'
  | 'guide'
  | 'build'
  | 'files'
  | 'rewards';

export type SubTab = 'chat' | 'trade';

interface UiState {
  activeTab: Tab;
  activeSubTab: SubTab;
  /** CupHub match id of the market open in the detail screen. */
  marketDetailId: string | null;
  setActiveTab: (tab: Tab) => void;
  setActiveSubTab: (subTab: SubTab) => void;
  /** Open the Market detail screen for a given match. */
  openMarket: (matchId: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'markets',
  activeSubTab: 'chat',
  marketDetailId: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveSubTab: (subTab) => set({ activeSubTab: subTab }),
  openMarket: (matchId) => set({ marketDetailId: matchId, activeTab: 'market-detail' }),
}));
