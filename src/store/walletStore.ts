import { create } from 'zustand';

const X_LAYER_CHAIN_ID = 196;
const X_LAYER_HEX = '0xc4';
const X_LAYER_PARAMS = {
  chainId: X_LAYER_HEX,
  chainName: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: ['https://rpc.xlayer.tech'],
  blockExplorerUrls: ['https://www.okx.com/web3/explorer/xlayer'],
};

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    okxwallet?: Eip1193Provider;
    ethereum?: Eip1193Provider;
  }
}

/** Prefer the OKX Wallet injection; fall back to any EIP-1193 provider. */
function getProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  return window.okxwallet ?? window.ethereum ?? null;
}

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
  onXLayer: boolean;
  connecting: boolean;
  walletAvailable: boolean;
  tokens: WalletToken[];
  totalUsd: number;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  ensureXLayer: () => Promise<boolean>;
  sendTx: (tx: { to: string; data: string; value?: string }) => Promise<string>;
  setPortfolio: (input: { address: string; network: string; tokens: WalletToken[]; totalUsd: number }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const shorten = (a: string) => (a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

let listenersBound = false;

export const useWalletStore = create<WalletState>((set, get) => ({
  connected: false,
  address: '',
  short: '',
  network: 'X Layer Mainnet',
  chainId: 196,
  onXLayer: false,
  connecting: false,
  walletAvailable: typeof window !== 'undefined' && Boolean(window.okxwallet ?? window.ethereum),
  tokens: [],
  totalUsd: 0,
  loading: false,
  error: null,

  connect: async () => {
    const provider = getProvider();
    if (!provider) {
      set({ error: 'No wallet found. Install OKX Wallet to connect.', walletAvailable: false });
      return;
    }
    set({ connecting: true, error: null });
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts[0] ?? '';
      if (!address) throw new Error('No account returned');
      const chainHex = (await provider.request({ method: 'eth_chainId' })) as string;
      const chainId = Number.parseInt(chainHex, 16);
      set({
        connected: true,
        address,
        short: shorten(address),
        chainId,
        onXLayer: chainId === X_LAYER_CHAIN_ID,
        connecting: false,
        walletAvailable: true,
      });

      if (!listenersBound && provider.on) {
        provider.on('accountsChanged', (...args: unknown[]) => {
          const next = (args[0] as string[] | undefined)?.[0];
          if (!next) get().disconnect();
          else set({ address: next, short: shorten(next) });
        });
        provider.on('chainChanged', (...args: unknown[]) => {
          const id = Number.parseInt(String(args[0]), 16);
          set({ chainId: id, onXLayer: id === X_LAYER_CHAIN_ID });
        });
        listenersBound = true;
      }
    } catch (err) {
      set({ connecting: false, error: err instanceof Error ? err.message : 'Wallet connection failed' });
    }
  },

  disconnect: () => set({ connected: false, address: '', short: '', onXLayer: false }),

  ensureXLayer: async () => {
    const provider = getProvider();
    if (!provider) return false;
    if (get().chainId === X_LAYER_CHAIN_ID) return true;
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: X_LAYER_HEX }] });
      set({ chainId: X_LAYER_CHAIN_ID, onXLayer: true });
      return true;
    } catch (err) {
      // 4902 — chain not added to the wallet yet.
      if ((err as { code?: number }).code === 4902) {
        try {
          await provider.request({ method: 'wallet_addEthereumChain', params: [X_LAYER_PARAMS] });
          set({ chainId: X_LAYER_CHAIN_ID, onXLayer: true });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  },

  sendTx: async ({ to, data, value }) => {
    const provider = getProvider();
    const { address } = get();
    if (!provider) throw new Error('No wallet found');
    if (!address) throw new Error('Wallet not connected');
    if (!(await get().ensureXLayer())) throw new Error('Switch your wallet to X Layer to continue');
    const txHash = (await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: address, to, data, value: value ?? '0x0' }],
    })) as string;
    return txHash;
  },

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
