import { create } from 'zustand';
import type { OKXUniversalConnectUI } from '@okxconnect/ui';
import { useNotificationsStore } from './notificationsStore';
import { usePendingTxStore } from './pendingTxStore';

const X_LAYER_CHAIN_ID = 196;
const X_LAYER_HEX = '0xc4';
const X_LAYER_RPC = 'https://rpc.xlayer.tech';
const X_LAYER_PARAMS = {
  chainId: X_LAYER_HEX,
  chainName: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: [X_LAYER_RPC],
  blockExplorerUrls: ['https://www.okx.com/web3/explorer/xlayer'],
};

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    // `okxwallet` is declared globally by @okxconnect; we read it via a local cast.
    ethereum?: Eip1193Provider;
  }
}

/** Prefer the OKX Wallet injection; fall back to any EIP-1193 provider. */
function getProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  const okx = window.okxwallet as Eip1193Provider | undefined;
  return okx ?? window.ethereum ?? null;
}

/**
 * Connection mode. `injected` — the OKX Wallet browser extension / in-app dApp
 * browser. `okxconnect` — the OKX Connect SDK (QR on desktop, deep link on mobile
 * and Telegram), used when no provider is injected. Both expose the same store API.
 */
type WalletMode = 'injected' | 'okxconnect';
let mode: WalletMode = 'injected';
let okxUi: OKXUniversalConnectUI | null = null;
const EIP155_X_LAYER = 'eip155:196';

/** Lazily load + init the OKX Connect SDK — keeps it out of the main bundle. */
async function getOkxUi(): Promise<OKXUniversalConnectUI> {
  if (okxUi) return okxUi;
  const { OKXUniversalConnectUI } = await import('@okxconnect/ui');
  okxUi = await OKXUniversalConnectUI.init({
    dappMetaData: {
      name: 'X Cup',
      icon: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '',
    },
  });
  return okxUi;
}

/**
 * Background drain for pending-tx entries — most callers `await sendTx(…)`
 * without an explicit `waitForTx`, so without this the pill would grow
 * forever. Polls the receipt for up to 2 minutes, then removes the entry no
 * matter what (so a never-mined tx is not stuck pending forever). Idempotent
 * with `waitForTx` — both end up calling `remove(hash)`, second is a no-op.
 */
async function autoDrainPending(hash: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const receipt = await walletRpc<{ status?: string } | null>('eth_getTransactionReceipt', [hash]);
      if (receipt) break;
    } catch {
      /* swallow — the next tick will retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  usePendingTxStore.getState().remove(hash);
}

/**
 * Route a JSON-RPC request through whichever wallet mode is active. Also acts as
 * a backstop for wallet-side disconnects: if the provider answers with EIP-1193
 * codes 4900 (`Disconnected`) or 4901 (`Chain Disconnected`), we mirror that
 * into our store so the UI doesn't pretend the wallet is still connected.
 */
async function walletRpc<T>(method: string, params?: unknown[] | object): Promise<T> {
  try {
    if (mode === 'okxconnect') {
      if (!okxUi) throw new Error('Wallet not connected');
      return await okxUi.request<T>({ method, params }, EIP155_X_LAYER);
    }
    const provider = getProvider();
    if (!provider) throw new Error('No wallet found');
    return (await provider.request({ method, params })) as T;
  } catch (err) {
    const code = (err as { code?: number } | undefined)?.code;
    if (code === 4900 || code === 4901) {
      try {
        useWalletStore.getState().disconnect();
      } catch {
        /* defensive — disconnect already idempotent */
      }
    }
    throw err;
  }
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
  /** Poll until a tx is mined — needed to chain dependent txs (swap → approve → stake). */
  waitForTx: (hash: string) => Promise<void>;
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
  // Always true — with the OKX Connect fallback the connect flow works even with
  // no injected wallet (QR on desktop, deep link on mobile / Telegram).
  walletAvailable: true,
  tokens: [],
  totalUsd: 0,
  loading: false,
  error: null,

  connect: async () => {
    set({ connecting: true, error: null });
    try {
      const injected = getProvider();
      if (injected) {
        // --- injected OKX Wallet / EIP-1193 provider ---
        mode = 'injected';
        const accounts = (await injected.request({ method: 'eth_requestAccounts' })) as string[];
        const address = accounts[0] ?? '';
        if (!address) throw new Error('No account returned');
        const chainHex = (await injected.request({ method: 'eth_chainId' })) as string;
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

        if (!listenersBound && injected.on) {
          injected.on('accountsChanged', (...args: unknown[]) => {
            const next = (args[0] as string[] | undefined)?.[0];
            if (!next) {
              // Wallet returned an empty account list — treat as full disconnect.
              get().disconnect();
            } else if (next.toLowerCase() !== get().address.toLowerCase()) {
              // Account switched in-wallet — adopt the new address and reset the
              // session-level notification feed so the previous account's
              // ambient events don't leak into this one.
              set({ address: next, short: shorten(next) });
              useNotificationsStore.getState().clear();
            }
          });
          injected.on('chainChanged', (...args: unknown[]) => {
            const id = Number.parseInt(String(args[0]), 16);
            set({ chainId: id, onXLayer: id === X_LAYER_CHAIN_ID });
          });
          // Wallet-side disconnect (extension locked, mobile session ended,
          // dApp permissions revoked) — sync our UI to that.
          injected.on('disconnect', () => {
            get().disconnect();
          });
          listenersBound = true;
        }
        return;
      }

      // --- no injected provider: OKX Connect (QR / deep link, mobile + Telegram) ---
      mode = 'okxconnect';
      const ui = await getOkxUi();
      await ui.openModal({
        namespaces: {
          eip155: { chains: [EIP155_X_LAYER], rpcMap: { '196': X_LAYER_RPC }, defaultChain: '196' },
        },
      });
      const caip = ui.requestAccountsWithNamespace('eip155')[0] ?? '';
      const address = caip.includes(':') ? caip.split(':').pop() ?? '' : caip;
      if (!address) throw new Error('No account returned');
      set({
        connected: true,
        address,
        short: shorten(address),
        chainId: X_LAYER_CHAIN_ID,
        onXLayer: true,
        connecting: false,
        walletAvailable: true,
      });
    } catch (err) {
      set({ connecting: false, error: err instanceof Error ? err.message : 'Wallet connection failed' });
    }
  },

  disconnect: () => {
    if (mode === 'okxconnect' && okxUi) void okxUi.disconnect().catch(() => undefined);
    // Full session reset — wipe every personal field so nothing from the
    // previous wallet (tokens, balances, errors, chain hints) leaks into the
    // disconnected state or into a different wallet that connects next.
    set({
      connected: false,
      address: '',
      short: '',
      network: 'X Layer Mainnet',
      chainId: 196,
      onXLayer: false,
      connecting: false,
      tokens: [],
      totalUsd: 0,
      loading: false,
      error: null,
    });
    // Notifications are an ambient session feed, not history — clear them so
    // a new wallet (or just-disconnected user) starts from a blank tray.
    useNotificationsStore.getState().clear();
    // In-flight tx tracking belonged to that session too — the user can still
    // see receipts on the explorer if they reconnect; clearing the pill
    // prevents a stale "N pending" lingering after disconnect.
    usePendingTxStore.getState().clear();
  },

  ensureXLayer: async () => {
    // OKX Connect sessions are opened on X Layer directly — no chain switch needed.
    if (mode === 'okxconnect') {
      set({ chainId: X_LAYER_CHAIN_ID, onXLayer: true });
      return true;
    }
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
    const { address } = get();
    if (!address) throw new Error('Wallet not connected');
    if (!(await get().ensureXLayer())) throw new Error('Switch your wallet to X Layer to continue');
    const hash = await walletRpc<string>('eth_sendTransaction', [{ from: address, to, data, value: value ?? '0x0' }]);
    // Surface every submitted tx through the pending-tx pill so the user
    // sees a live count instead of staring at a "Submitted" toast for a
    // minute. waitForTx drains the same store on receipt or timeout; for
    // callers that don't await waitForTx, autoDrainPending guarantees the
    // entry is removed once the receipt lands (or after a 2-minute ceiling).
    usePendingTxStore.getState().add(hash);
    void autoDrainPending(hash);
    return hash;
  },

  waitForTx: async (hash) => {
    try {
      // X Layer blocks are ~1-2s; poll up to ~90s.
      for (let i = 0; i < 45; i++) {
        const receipt = await walletRpc<{ status?: string } | null>('eth_getTransactionReceipt', [hash]);
        if (receipt) {
          if (receipt.status && Number(receipt.status) === 0) {
            throw new Error(`Transaction reverted (${hash.slice(0, 10)}…)`);
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      throw new Error(`Transaction not mined in time (${hash.slice(0, 10)}…)`);
    } finally {
      usePendingTxStore.getState().remove(hash);
    }
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
