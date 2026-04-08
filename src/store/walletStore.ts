import { create } from 'zustand';

export interface WalletToken {
  symbol: string;
  address: string;
  amount: number;
  usdValue: number;
}

interface WalletState {
  connected: boolean;
  address: string;
  short: string;
  network: string;
  chainId: number;
  tokens: WalletToken[];
  totalUsd: number;
  loading: boolean;
  error: string | null;
  setPortfolio: (input: {
    address: string;
    network: string;
    tokens: WalletToken[];
    totalUsd: number;
  }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const shorten = (a: string) => (a && a.length > 10 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a);

export const useWalletStore = create<WalletState>((set) => ({
  connected: false,
  address: '',
  short: '',
  network: 'X Layer Mainnet',
  chainId: 196,
  tokens: [],
  totalUsd: 0,
  loading: false,
  error: null,
  setPortfolio: ({ address, network, tokens, totalUsd }) =>
    set({
      connected: true,
      address,
      short: shorten(address),
      network,
      tokens,
      totalUsd,
      loading: false,
      error: null,
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
