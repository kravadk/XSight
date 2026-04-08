/**
 * Pool tracker — periodic snapshot of X Layer Uniswap-style pools.
 *
 * Polls Uniswap pool stats (proxied via OnchainOS market price-info per token)
 * every 5 minutes, stores rolling history so we can compute APR yesterday and
 * 7-day average, then exposes a single getAllPools() that the chat AI and the
 * /api/market/pools endpoint both consume.
 */
import { getTopPools, type PoolStat } from './uniswap.js';

const TICK_MS = 5 * 60_000;
const HISTORY_LIMIT = 96; // ~8 hours of 5-min ticks

interface RawSnapshot {
  ts: number;
  apr: number;
  tvl: number;
  volume24h: number;
}

export interface PoolAnalytics {
  pair: string;
  baseSymbol: string;
  quoteSymbol: string;
  platform: string;
  apr: number;
  /** APR observed at the previous tick (or oldest available) */
  aprPrev: number;
  /** average APR across the recorded history */
  apr7dAvg: number;
  aprTrend: 'rising' | 'falling' | 'stable';
  tvlUsd: number;
  volume24hUsd: number;
  fee: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  router?: string;
  isNew: boolean;
  lastUpdated: number;
}

const snapshots = new Map<string, RawSnapshot[]>();
const meta = new Map<string, PoolStat>();
let intervalHandle: NodeJS.Timeout | null = null;
let lastTickMs = 0;
let tickInProgress = false;

function classifyRisk(tvl: number, apr: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (tvl < 100_000) return 'HIGH';
  if (tvl < 1_000_000) return 'MEDIUM';
  if (apr > 30) return 'MEDIUM';
  return 'LOW';
}

async function tick(): Promise<void> {
  if (tickInProgress) return;
  tickInProgress = true;
  try {
    const pools = await getTopPools();
    const now = Date.now();
    for (const p of pools) {
      meta.set(p.pair, p);
      const arr = snapshots.get(p.pair) ?? [];
      arr.push({ ts: now, apr: p.estAprPct, tvl: p.tvlUsd, volume24h: p.volume24hUsd });
      if (arr.length > HISTORY_LIMIT) arr.shift();
      snapshots.set(p.pair, arr);
    }
    lastTickMs = now;
  } catch (err) {
    console.error('[poolTracker] tick failed:', err instanceof Error ? err.message : err);
  } finally {
    tickInProgress = false;
  }
}

export function startPoolTracker() {
  if (intervalHandle) return;
  void tick();
  intervalHandle = setInterval(() => void tick(), TICK_MS);
}

export function stopPoolTracker() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

function buildAnalytics(pair: string): PoolAnalytics | null {
  const arr = snapshots.get(pair);
  const m = meta.get(pair);
  if (!arr || arr.length === 0 || !m) return null;
  const latest = arr[arr.length - 1];
  const prev = arr.length > 1 ? arr[arr.length - 2] : latest;
  const aprAvg = arr.reduce((s, x) => s + x.apr, 0) / arr.length;
  const trend: 'rising' | 'falling' | 'stable' =
    latest.apr - prev.apr > 0.05
      ? 'rising'
      : latest.apr - prev.apr < -0.05
        ? 'falling'
        : 'stable';
  const isNew = arr.length < 3;
  return {
    pair: m.pair,
    baseSymbol: m.baseSymbol,
    quoteSymbol: m.quoteSymbol,
    platform: m.router?.split(' ')[0] ?? 'X Layer DEX',
    apr: latest.apr,
    aprPrev: prev.apr,
    apr7dAvg: aprAvg,
    aprTrend: trend,
    tvlUsd: latest.tvl,
    volume24hUsd: latest.volume24h,
    fee: 0.003,
    risk: classifyRisk(latest.tvl, latest.apr),
    router: m.router,
    isNew,
    lastUpdated: latest.ts,
  };
}

export function getAllPools(): PoolAnalytics[] {
  const out: PoolAnalytics[] = [];
  for (const pair of snapshots.keys()) {
    const a = buildAnalytics(pair);
    if (a) out.push(a);
  }
  return out.sort((a, b) => b.apr - a.apr);
}

export function getPoolTrackerStatus() {
  return {
    running: intervalHandle !== null,
    tickIntervalMs: TICK_MS,
    lastTickMs,
    trackedPairs: Array.from(snapshots.keys()),
  };
}
