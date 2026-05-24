import { create } from 'zustand';

/** The product surfaces under the XSight umbrella. */
export type Product = 'xsight' | 'xcup' | 'hook';

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
  | 'docs'
  // Hook hackathon — Overview is canonical 'hook'; sub-sections promoted to sidebar
  | 'hook'
  | 'hook-swap'
  | 'hook-pot'
  | 'hook-activity'
  | 'hook-contracts'
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

const DEFAULT_TAB: Record<Product, Tab> = { xsight: 'chat', xcup: 'markets', hook: 'hook' };

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
  /**
   * Wall-clock timestamp of the last successful on-chain stake. My Bets watches
   * this to trigger a short auto-retry chain — the indexer can lag the chain by
   * 5-15s, so a single `reload()` right after a stake often returns nothing.
   */
  recentStakeAt: number;
  setProduct: (product: Product) => void;
  setActiveTab: (tab: Tab) => void;
  setActiveSubTab: (subTab: SubTab) => void;
  /** Open the X Cup Market detail screen for a given match. */
  openMarket: (matchId: string) => void;
  setConnectModalOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  /** Record that a stake just landed — used to nudge dependent screens. */
  bumpRecentStake: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  product: 'xcup',
  activeTab: 'markets',
  activeSubTab: 'chat',
  marketDetailId: null,
  connectModalOpen: false,
  settingsOpen: false,
  helpOpen: false,
  recentStakeAt: 0,
  // Switching product or tab also dismisses any open overlay (Help, Settings,
  // Connect modal). They are fixed-position panels in App.tsx, so without this
  // they would linger over the new page and block clicks.
  setProduct: (product) =>
    set({ product, activeTab: DEFAULT_TAB[product], helpOpen: false, settingsOpen: false, connectModalOpen: false }),
  setActiveTab: (tab) =>
    set({ activeTab: tab, helpOpen: false, settingsOpen: false, connectModalOpen: false }),
  setActiveSubTab: (subTab) => set({ activeSubTab: subTab }),
  openMarket: (matchId) =>
    set({
      marketDetailId: matchId,
      activeTab: 'market-detail',
      product: 'xcup',
      helpOpen: false,
      settingsOpen: false,
      connectModalOpen: false,
    }),
  setConnectModalOpen: (connectModalOpen) => set({ connectModalOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  bumpRecentStake: () => set({ recentStakeAt: Date.now() }),
}));
