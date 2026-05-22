import { create } from 'zustand';

/** The two product surfaces under the XSight umbrella. */
export type Product = 'xsight' | 'xcup';

/**
 * Tabs across both products. `xsight` = the trading copilot; `xcup` = the prediction
 * market. The union is shared so the layout chrome stays type-safe across the switch.
 */
export type Tab =
  // X Cup
  | 'markets'
  | 'market-detail'
  | 'bets'
  | 'bracket'
  | 'leaderboard'
  | 'pundit'
  | 'fanpass'
  | 'developers'
  // XSight copilot
  | 'portfolio'
  | 'dashboard'
  | 'chat'
  | 'api'
  | 'earn'
  | 'guide'
  | 'build'
  // legacy / unused
  | 'cup'
  | 'agentbet'
  | 'files'
  | 'rewards';

export type SubTab = 'chat' | 'trade';

const DEFAULT_TAB: Record<Product, Tab> = { xsight: 'chat', xcup: 'markets' };

interface UiState {
  product: Product;
  activeTab: Tab;
  activeSubTab: SubTab;
  /** CupHub match id of the market open in the X Cup detail screen. */
  marketDetailId: string | null;
  /** Wallet connect modal — opened from the TopBar button and the demo banner. */
  connectModalOpen: boolean;
  /** Settings panel — opened from the TopBar gear. */
  settingsOpen: boolean;
  /** Welcome walkthrough — re-openable from the TopBar "?" after first run. */
  helpOpen: boolean;
  setProduct: (product: Product) => void;
  setActiveTab: (tab: Tab) => void;
  setActiveSubTab: (subTab: SubTab) => void;
  /** Open the X Cup Market detail screen for a given match. */
  openMarket: (matchId: string) => void;
  setConnectModalOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  product: 'xcup',
  activeTab: 'markets',
  activeSubTab: 'chat',
  marketDetailId: null,
  connectModalOpen: false,
  settingsOpen: false,
  helpOpen: false,
  setProduct: (product) => set({ product, activeTab: DEFAULT_TAB[product] }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveSubTab: (subTab) => set({ activeSubTab: subTab }),
  openMarket: (matchId) => set({ marketDetailId: matchId, activeTab: 'market-detail', product: 'xcup' }),
  setConnectModalOpen: (connectModalOpen) => set({ connectModalOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
}));
