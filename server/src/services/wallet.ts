import { JsonRpcProvider, Wallet, getAddress } from 'ethers';
import { env, isConfigured } from '../config/env.js';

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

let cachedProvider: JsonRpcProvider | null = null;
let cachedSigner: Wallet | null = null;

export function getProvider(): JsonRpcProvider {
  if (!cachedProvider) {
    cachedProvider = new JsonRpcProvider(env.xLayerRpcUrl);
  }
  return cachedProvider;
}

export function getSigner(): Wallet {
  if (!isConfigured.signer()) {
    throw new WalletError(
      'Signer not configured: DEPLOYER_PRIVATE_KEY and AGENTIC_WALLET_ADDRESS required',
    );
  }
  if (!cachedSigner) {
    let signer: Wallet;
    try {
      signer = new Wallet(env.deployerPrivateKey, getProvider());
    } catch (err) {
      throw new WalletError(
        `Invalid DEPLOYER_PRIVATE_KEY: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
    const derived = getAddress(signer.address);
    const expected = getAddress(env.agenticWalletAddress);
    if (derived !== expected) {
      throw new WalletError(
        `DEPLOYER_PRIVATE_KEY derives ${derived} but AGENTIC_WALLET_ADDRESS is ${expected}. They must match.`,
      );
    }
    cachedSigner = signer;
  }
  return cachedSigner;
}
