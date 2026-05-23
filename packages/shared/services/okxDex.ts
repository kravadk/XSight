/**
 * OKX DEX Aggregator service — X Layer (chainId 196)
 *
 * All quote requests go through the backend /api/swap/quote endpoint,
 * which uses the okx-dex-sdk with server-side credentials.
 * No mocks, no local fallbacks.
 */

import { api } from '@shared/api/client';
import type { SwapQuoteDto } from '@shared/api/client';
import { tokenMeta } from '@shared/config/tokens';

export type OkxQuote = SwapQuoteDto;

export function toRawAmount(humanAmount: number, decimals: number): string {
  const scaled = humanAmount * 10 ** decimals;
  return BigInt(Math.round(scaled)).toString();
}

export function fromRawAmount(raw: string | number, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

/**
 * Fetch a real-time swap quote via the backend OKX DEX SDK integration.
 * Throws on any error — callers must handle failures explicitly.
 */
export async function getSwapQuote(
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number,
): Promise<OkxQuote> {
  const rawAmount = toRawAmount(fromAmount, tokenMeta(fromSymbol).decimals);
  return api.swapQuote(fromSymbol, toSymbol, rawAmount);
}
