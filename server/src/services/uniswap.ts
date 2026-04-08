/**
 * Uniswap V3 pool data on X Layer.
 *
 * X Layer hosts forks of Uniswap V3 (QuickSwap V3, OKC Swap). The OKX
 * `dex/aggregator/quote` already returns the routing DEX names, and
 * `dex/market/price-info` exposes per-token liquidity + 24h volume — which is
 * a faithful proxy for V3 pool TVL/volume aggregated across all pairs of that
 * token.
 *
 * For yield card recommendations we surface this as "pools" the AI can reason
 * about (TVL, est APR from fees / TVL ratio).
 */
import { getTokenPriceInfo, getSwapQuote, OnchainOsError } from './onchainos.js';
import { recordActivity } from './activityTracker.js';

const TOKENS: Record<string, string> = {
  OKB: '0xe538905cf8410324e03A5A23C1c177a474D59b2b',
  USDT: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
  USDC: '0x74b7F16337b8972027F6196A17a631aC6dE26d22',
  WETH: '0x5A77f1443D16ee5761d310e38b62f77f726bC71c',
};

export interface PoolStat {
  pair: string;
  baseSymbol: string;
  quoteSymbol: string;
  tvlUsd: number;
  volume24hUsd: number;
  /** estimated APR from fees: 0.3% × volume × 365 / TVL */
  estAprPct: number;
  router?: string;
}

const FEE_TIER = 0.003;

/**
 * Reads liquidity + volume for the base token via OnchainOS market price-info,
 * then probes a small swap quote to discover which DEX router actually settles
 * the trade. The result is a real pool snapshot used by the AI for yield
 * recommendations and by the frontend Earn page.
 */
export async function getPoolStat(baseSymbol: keyof typeof TOKENS, quoteSymbol: keyof typeof TOKENS): Promise<PoolStat> {
  const baseAddr = TOKENS[baseSymbol];
  const quoteAddr = TOKENS[quoteSymbol];
  if (!baseAddr || !quoteAddr) throw new OnchainOsError(`unknown pair ${baseSymbol}/${quoteSymbol}`);

  const info = await getTokenPriceInfo(baseAddr);
  const tvl = Number(info.liquidity ?? 0);
  const vol = Number(info.volume24H ?? 0);
  const estApr = tvl > 0 ? (FEE_TIER * vol * 365 * 100) / tvl : 0;

  let router: string | undefined;
  try {
    // Tiny probe swap to learn the router for this pair
    const probeAmount = '1000000'; // 1 USDT raw (6 decimals)
    const q = await getSwapQuote({
      fromToken: quoteAddr,
      toToken: baseAddr,
      amount: probeAmount,
      userAddress: '0x0000000000000000000000000000000000000001',
    });
    router = q.routeSummary;
  } catch {
    /* no router probe — pool stat is still valid */
  }

  recordActivity('market.priceInfo', `pool ${baseSymbol}/${quoteSymbol}`);
  return {
    pair: `${baseSymbol}/${quoteSymbol}`,
    baseSymbol,
    quoteSymbol,
    tvlUsd: tvl,
    volume24hUsd: vol,
    estAprPct: estApr,
    router,
  };
}

export async function getTopPools(): Promise<PoolStat[]> {
  const pairs: [keyof typeof TOKENS, keyof typeof TOKENS][] = [
    ['OKB', 'USDT'],
    ['WETH', 'USDT'],
    ['OKB', 'USDC'],
  ];
  const results = await Promise.allSettled(pairs.map(([b, q]) => getPoolStat(b, q)));
  return results
    .filter((r): r is PromiseFulfilledResult<PoolStat> => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => b.tvlUsd - a.tvlUsd);
}
