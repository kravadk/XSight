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
