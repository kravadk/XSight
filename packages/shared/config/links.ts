/**
 * Single source of truth for every outbound link in X Cup. Centralised so the
 * footer, Settings panel and connect modal all point at the same, verifiable URLs.
 */

/** X Layer mainnet — the chain X Cup runs on. */
export const X_LAYER = {
  chainId: 196,
  name: 'X Layer',
  /** OKX block explorer root for X Layer. */
  explorer: 'https://www.okx.com/web3/explorer/xlayer',
  /** Where a new user bridges funds / acquires OKB for gas. */
  bridge: 'https://www.okx.com/xlayer',
} as const;

/** Project links. */
export const PROJECT_LINKS = {
  github: 'https://github.com/kravadk/XSight',
  explorer: X_LAYER.explorer,
  bridge: X_LAYER.bridge,
} as const;

/** Build an explorer URL for a contract or wallet address on X Layer. */
export function explorerAddress(address: string): string {
  return `${X_LAYER.explorer}/address/${address}`;
}

/** Build an explorer URL for a transaction hash on X Layer. */
export function explorerTx(hash: string): string {
  return `${X_LAYER.explorer}/tx/${hash}`;
}
