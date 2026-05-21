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

let cachedPunditSigner: Wallet | null = null;

/**
 * The AI pundit's own wallet — separate from the operator signer. The pundit is a
 * real market participant (DESIGN §8), so it must stake from its own key, never the
 * operator key that creates and settles markets. Throws if PUNDIT_PRIVATE_KEY and
 * PUNDIT_WALLET_ADDRESS are unset or do not match.
 */
export function getPunditSigner(): Wallet {
  if (!isConfigured.pundit()) {
    throw new WalletError(
      'Pundit wallet not configured: PUNDIT_PRIVATE_KEY and PUNDIT_WALLET_ADDRESS required',
    );
  }
  if (!cachedPunditSigner) {
    let signer: Wallet;
    try {
      signer = new Wallet(env.punditPrivateKey, getProvider());
    } catch (err) {
      throw new WalletError(
        `Invalid PUNDIT_PRIVATE_KEY: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
    const derived = getAddress(signer.address);
    const expected = getAddress(env.punditWalletAddress);
    if (derived !== expected) {
      throw new WalletError(
        `PUNDIT_PRIVATE_KEY derives ${derived} but PUNDIT_WALLET_ADDRESS is ${expected}. They must match.`,
      );
    }
    cachedPunditSigner = signer;
  }
  return cachedPunditSigner;
}
