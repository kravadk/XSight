import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Canonical on-chain id encoding for CupHub matches.
 *
 * CupHub match ids look like `cup-<home>-<away>-<stamp>` and can exceed 31 bytes, so
 * `encodeBytes32String` throws on them. keccak256 handles any length and — crucially —
 * gives the SAME bytes32 to both CupOracleV2 and ParimutuelMarket, so a market settles
 * against exactly the oracle record it was created for.
 */
export function encodeMatchId(cupMatchId: string): string {
  return keccak256(toUtf8Bytes(cupMatchId));
}

/**
 * Deterministic ParimutuelMarket `marketId` for a CupHub match. Namespaced so it never
 * collides with the oracle `matchId` derived from the same string.
 */
export function deriveMarketId(cupMatchId: string): string {
  return keccak256(toUtf8Bytes(`xsight-market:${cupMatchId}`));
}

/**
 * Composite key string for one (fixture × market type) — feed it to `encodeMatchId`
 * and `deriveMarketId` to get distinct on-chain keys per market type. The default
 * '1X2' type returns the bare match id, so existing 1X2 markets keep their exact
 * keys (no re-registration). Over/Under, BTTS etc. each get a namespaced key.
 */
export function encodeMarketKey(cupMatchId: string, marketType: string): string {
  return marketType === '1X2' ? cupMatchId : `${cupMatchId}::${marketType}`;
}
