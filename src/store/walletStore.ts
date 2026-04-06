import { create } from 'zustand';
import { WALLET } from '../utils/mockData';

interface WalletState {
  connected: boolean;
  address: string;
  short: string;
  network: string;
  chainId: number;
  okb: number;
  usdt: number;
}

export const useWalletStore = create<WalletState>(() => ({
  connected: true,
  address: WALLET.address,
  short: WALLET.short,
  network: WALLET.network,
  chainId: WALLET.chainId,
  okb: 0.42,
  usdt: 350,
}));
