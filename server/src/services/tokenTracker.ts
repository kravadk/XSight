/**
 * Token tracker — periodic snapshot service for X Layer tokens.
 *
 * Polls OnchainOS Market every 60s for a curated list of tokens (the canonical
 * X Layer set + any tokens currently held by the agentic wallet). Caches the
 * latest snapshot plus rolling history so we can compute deltas, average
 * volume, "is trending" flags, and feed the chat AI with rich market context
 * on every turn.
 */
import { getTokenPriceInfo, getWalletBalances, OnchainOsError } from './onchainos.js';
import { env } from '../config/env.js';

const TICK_MS = 60_000;
const HISTORY_LIMIT = 200; // ~3.3 hours at 60s ticks

const X_LAYER_CHAIN = '196';

// Curated set of "always tracked" tokens. Wallet balances merge in dynamically.
const SEED_TOKENS: Record<string, string> = {
  OKB: '0xe538905cf8410324e03A5A23C1c177a474D59b2b',
  WOKB: '0xe538905cf8410324e03A5A23C1c177a474D59b2b',
  USDT: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
  USDC: '0x74b7F16337b8972027F6196A17a631aC6dE26d22',
  WETH: '0x5A77f1443D16ee5761d310e38b62f77f726bC71c',
  USDG: '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8',
};

interface RawSnapshot {
  ts: number;
  price: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  change1h: number;
  change24h: number;
}

export interface TokenAnalytics {
  symbol: string;
  address: string;
  price: number;
  change1h: number;
  change24h: number;
  /** rolling % change over the tracker's recorded history (best-effort 7d proxy) */
  changeTracked: number;
  volume24h: number;
  /** average volume24h over recent ticks — basis for "above/below average" */
  volumeAvg: number;
  /** ratio of current 24h volume to volumeAvg (1.0 = average, 2.0 = 2× average) */
  volumeRatio: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  /** detected: |change24h| > 10 OR volumeRatio > 2.0 */
  isTrending: boolean;
  isNew: boolean;
  lastUpdated: number;
}

const snapshots = new Map<string, RawSnapshot[]>(); // key = symbol
const dynamicTokens = new Map<string, string>(); // symbol -> address discovered from wallet

let intervalHandle: NodeJS.Timeout | null = null;
let lastTickMs = 0;
let tickInProgress = false;
let tickStartedAt = 0;
const TICK_TIMEOUT_MS = 45_000; // reset stuck flag after 45s

function pushSnapshot(symbol: string, snap: RawSnapshot) {
  const arr = snapshots.get(symbol) ?? [];
  arr.push(snap);
  if (arr.length > HISTORY_LIMIT) arr.shift();
  snapshots.set(symbol, arr);
}

function listAddresses(): { symbol: string; address: string }[] {
  const merged = new Map<string, string>();
  for (const [s, a] of Object.entries(SEED_TOKENS)) merged.set(s, a);
  for (const [s, a] of dynamicTokens.entries()) merged.set(s, a);
  return Array.from(merged.entries()).map(([symbol, address]) => ({ symbol, address }));
}

async function discoverWalletTokens(): Promise<void> {
  if (!env.agenticWalletAddress) return;
  try {
    const balances = await getWalletBalances(env.agenticWalletAddress);
    for (const b of balances) {
      const sym = b.symbol?.toUpperCase?.();
      if (sym && b.address && /^0x[0-9a-f]{40}$/i.test(b.address) && !dynamicTokens.has(sym)) {
        dynamicTokens.set(sym, b.address);
      }
    }
  } catch {
    /* */
  }
}

async function tick(): Promise<void> {
  // Reset stuck flag if the previous tick has been running too long
  if (tickInProgress && Date.now() - tickStartedAt > TICK_TIMEOUT_MS) {
    console.warn('[tokenTracker] tick timed out — resetting flag');
    tickInProgress = false;
  }
  if (tickInProgress) return;
  tickInProgress = true;
  tickStartedAt = Date.now();
  try {
    await discoverWalletTokens();
    const targets = listAddresses();
    const now = Date.now();
    await Promise.allSettled(
      targets.map(async ({ symbol, address }) => {
        try {
          const info = await getTokenPriceInfo(address, X_LAYER_CHAIN);
          pushSnapshot(symbol, {
            ts: now,
            price: Number(info.price ?? 0),
            volume24h: Number(info.volume24H ?? 0),
            marketCap: Number(info.marketCap ?? 0),
            liquidity: Number(info.liquidity ?? 0),
            holders: Number(info.holders ?? 0),
            change1h: Number(info.priceChange1H ?? 0),
            change24h: Number(info.priceChange24H ?? 0),
          });
        } catch (err) {
          if (!(err instanceof OnchainOsError)) {
            console.error(`[tokenTracker] ${symbol} fetch failed:`, err);
          }
        }
      }),
    );
    lastTickMs = now;
  } finally {
    tickInProgress = false;
  }
}

export function startTokenTracker() {
  if (intervalHandle) return;
  void tick();
  intervalHandle = setInterval(() => void tick(), TICK_MS);
}

export function stopTokenTracker() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

function buildAnalytics(symbol: string): TokenAnalytics | null {
  const arr = snapshots.get(symbol);
  if (!arr || arr.length === 0) return null;
  const latest = arr[arr.length - 1];
  const oldest = arr[0];

  const trackedSpanMs = latest.ts - oldest.ts;
  const changeTracked = oldest.price > 0 ? ((latest.price - oldest.price) / oldest.price) * 100 : 0;

  const volSum = arr.reduce((s, x) => s + x.volume24h, 0);
  const volumeAvg = volSum / arr.length;
  const volumeRatio = volumeAvg > 0 ? latest.volume24h / volumeAvg : 1;

  const isTrending = Math.abs(latest.change24h) > 10 || volumeRatio > 2;
  const isNew = trackedSpanMs < 6 * 3600 * 1000 && arr.length < 10;

  return {
    symbol,
    address: SEED_TOKENS[symbol] ?? dynamicTokens.get(symbol) ?? '',
    price: latest.price,
    change1h: latest.change1h,
    change24h: latest.change24h,
    changeTracked,
    volume24h: latest.volume24h,
    volumeAvg,
    volumeRatio,
    marketCap: latest.marketCap,
    liquidity: latest.liquidity,
    holders: latest.holders,
    isTrending,
    isNew,
    lastUpdated: latest.ts,
  };
}

export function getAllTrackedTokens(): TokenAnalytics[] {
  const out: TokenAnalytics[] = [];
  for (const symbol of snapshots.keys()) {
    const a = buildAnalytics(symbol);
    if (a) out.push(a);
  }
  return out.sort((a, b) => b.volume24h - a.volume24h);
}

export function getTokenAnalytics(symbol: string): TokenAnalytics | null {
  return buildAnalytics(symbol.toUpperCase());
}

export function getTrendingAnalytics(): TokenAnalytics[] {
  return getAllTrackedTokens().filter((t) => t.isTrending);
}

export function getTokenTrackerStatus() {
  return {
    running: intervalHandle !== null,
    tickIntervalMs: TICK_MS,
    lastTickMs,
    trackedSymbols: Array.from(snapshots.keys()),
    historyDepth: HISTORY_LIMIT,
  };
}
