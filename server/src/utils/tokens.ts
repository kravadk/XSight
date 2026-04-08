/**
 * Canonical X Layer token address registry.
 * Single source of truth — import from here everywhere.
 */

export const X_LAYER_CHAIN_ID = '196';

/** Lowercase contract addresses for X Layer tokens */
export const TOKEN_ADDRESSES: Record<string, string> = {
  OKB:  '0xe538905cf8410324e03a5a23c1c177a474d59b2b', // native gas token
  WOKB: '0xe538905cf8410324e03a5a23c1c177a474d59b2b',
  USDT: '0x1e4a5963abfd975d8c9021ce480b42188849d41d',
  USDC: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
  WETH: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c',
  ETH:  '0x5a77f1443d16ee5761d310e38b62f77f726bc71c',
  USDG: '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8',
} as const;

/** Reverse map: address (lowercase) → symbol */
export const ADDRESS_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(TOKEN_ADDRESSES).map(([sym, addr]) => [addr, sym]),
);

export const NATIVE_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export const USDT_DECIMALS = 6;
export const OKB_DECIMALS = 18;
