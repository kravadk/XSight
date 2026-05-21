/**
 * ParimutuelMarket event indexer (DESIGN §4) — a lightweight RPC `getLogs` poller, not a
 * subgraph. It reconstructs market state purely from the on-chain event log:
 *   MarketCreated · Staked · Settled · MarketVoided · Claimed
 *
 * It keeps an in-memory mirror (the API's source of truth) and also persists to
 * `marketStore` when a DB is present. On boot it backfills from the persisted cursor,
 * else from PARIMUTUEL_DEPLOY_BLOCK, else from the current head.
 *
 * NO MOCKS: every log is real. With no PARIMUTUEL_MARKET_ADDRESS the indexer idles.
 */
import { Interface, type Log } from 'ethers';
import { env } from '../config/env.js';
import { getProvider } from './wallet.js';
import { PARIMUTUEL_ABI, parimutuelMetadata } from './parimutuelContract.js';
import {
  getIndexerCursor,
  insertClaim,
  insertStake,
  isMarketStoreConfigured,
  setIndexerCursor,
  upsertMarket,
} from './marketStore.js';

export interface IndexedMarket {
  marketId: string;
  matchId: string;
  closeTime: number;
  createdBlock: number;
  poolHome: bigint;
  poolDraw: bigint;
  poolAway: bigint;
  totalPool: bigint;
  settled: boolean;
  refundMode: boolean;
  winningOutcome: number;
  payoutPool: bigint;
}

export interface IndexedStake {
  marketId: string;
  wallet: string;
  outcome: number;
  amount: string;
  txHash: string;
  blockNumber: number;
}

export interface IndexedClaim {
  marketId: string;
  wallet: string;
  amount: string;
  txHash: string;
  blockNumber: number;
}

interface IndexerState {
  markets: Map<string, IndexedMarket>;
  stakes: IndexedStake[];
  claims: IndexedClaim[];
  seenLogs: Set<string>; // `${txHash}:${logIndex}` — idempotent re-application guard
  lastBlock: number;
  backfilled: boolean;
}

const iface = new Interface(PARIMUTUEL_ABI as unknown as string[]);
const state: IndexerState = {
  markets: new Map(),
  stakes: [],
  claims: [],
  seenLogs: new Set(),
  lastBlock: 0,
  backfilled: false,
};
let timer: NodeJS.Timeout | null = null;
let polling = false;

function emptyMarket(marketId: string): IndexedMarket {
  return {
    marketId,
    matchId: '',
    closeTime: 0,
    createdBlock: 0,
    poolHome: 0n,
    poolDraw: 0n,
    poolAway: 0n,
    totalPool: 0n,
    settled: false,
    refundMode: false,
    winningOutcome: 0,
    payoutPool: 0n,
  };
}

/** Apply one decoded log to the in-memory mirror + DB. Idempotent per (tx, logIndex). */
async function applyLog(log: Log): Promise<string | null> {
  const key = `${log.transactionHash}:${log.index}`;
  if (state.seenLogs.has(key)) return null;
  let parsed;
  try {
    parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
  } catch {
    return null; // not one of our events
  }
  if (!parsed) return null;
  state.seenLogs.add(key);
  const a = parsed.args;
  const marketId = String(a.marketId);
  const m = state.markets.get(marketId) ?? emptyMarket(marketId);

  if (parsed.name === 'MarketCreated') {
    m.matchId = String(a.matchId);
    m.closeTime = Number(a.closeTime);
    m.createdBlock = log.blockNumber;
  } else if (parsed.name === 'Staked') {
    const outcome = Number(a.outcome);
    const amount = BigInt(a.amount);
    if (outcome === 1) m.poolHome += amount;
    else if (outcome === 2) m.poolDraw += amount;
    else if (outcome === 3) m.poolAway += amount;
    m.totalPool += amount;
    const stake: IndexedStake = {
      marketId,
      wallet: String(a.user),
      outcome,
      amount: amount.toString(),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    };
    state.stakes.push(stake);
    if (isMarketStoreConfigured()) {
      await insertStake({ ...stake, logIndex: log.index }).catch(() => undefined);
    }
  } else if (parsed.name === 'Settled') {
    m.settled = true;
    m.winningOutcome = Number(a.winningOutcome);
    m.totalPool = BigInt(a.totalPool);
    m.payoutPool = BigInt(a.payoutPool);
    m.refundMode = Boolean(a.refundMode);
  } else if (parsed.name === 'MarketVoided') {
    m.settled = true;
    m.refundMode = true;
  } else if (parsed.name === 'Claimed') {
    const claim: IndexedClaim = {
      marketId,
      wallet: String(a.user),
      amount: BigInt(a.amount).toString(),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    };
    state.claims.push(claim);
    if (isMarketStoreConfigured()) {
      await insertClaim({ ...claim, logIndex: log.index }).catch(() => undefined);
    }
  } else {
    return null;
  }

  state.markets.set(marketId, m);
  return marketId;
}

async function persistMarket(marketId: string): Promise<void> {
  if (!isMarketStoreConfigured()) return;
  const m = state.markets.get(marketId);
  if (!m) return;
  await upsertMarket({
    marketId: m.marketId,
    matchId: m.matchId,
    closeTime: m.closeTime,
    settled: m.settled,
    refundMode: m.refundMode,
    winningOutcome: m.winningOutcome,
    totalPool: m.totalPool.toString(),
    payoutPool: m.payoutPool.toString(),
    poolHome: m.poolHome.toString(),
    poolDraw: m.poolDraw.toString(),
    poolAway: m.poolAway.toString(),
    createdBlock: m.createdBlock,
  }).catch(() => undefined);
}

/** Index every block window up to the chain head. Returns the number of logs applied. */
export async function pollOnce(): Promise<number> {
  if (polling) return 0;
  const meta = parimutuelMetadata();
  if (!meta.address) return 0;
  polling = true;
  let applied = 0;
  try {
    const provider = getProvider();
    const head = await provider.getBlockNumber();
    let from = state.lastBlock + 1;
    const range = env.marketIndexerRange > 0 ? env.marketIndexerRange : 2000;
    while (from <= head) {
      const to = Math.min(from + range - 1, head);
      const logs = await provider.getLogs({ address: meta.address, fromBlock: from, toBlock: to });
      const touched = new Set<string>();
      for (const log of logs) {
        const marketId = await applyLog(log);
        if (marketId) {
          touched.add(marketId);
          applied += 1;
        }
      }
      for (const marketId of touched) await persistMarket(marketId);
      state.lastBlock = to;
      await setIndexerCursor(meta.address, to).catch(() => undefined);
      from = to + 1;
    }
  } finally {
    polling = false;
  }
  return applied;
}

export async function startMarketIndexer(): Promise<void> {
  if (timer) return;
  const meta = parimutuelMetadata();
  if (!meta.address) {
    console.log('[market-indexer] idle — PARIMUTUEL_MARKET_ADDRESS not set');
    return;
  }
  // pick the backfill start: persisted cursor, else deploy block, else current head.
  try {
    const cursor = await getIndexerCursor(meta.address);
    if (cursor !== null) {
      state.lastBlock = cursor;
    } else if (env.parimutuelDeployBlock > 0) {
      state.lastBlock = env.parimutuelDeployBlock - 1;
    } else {
      state.lastBlock = (await getProvider().getBlockNumber()) - 1;
    }
  } catch (err) {
    console.warn('[market-indexer] cursor init failed:', err instanceof Error ? err.message : err);
    state.lastBlock = (await getProvider().getBlockNumber().catch(() => 1)) - 1;
  }

  const intervalMs = env.marketIndexerIntervalMs >= 5000 ? env.marketIndexerIntervalMs : 30_000;
  console.log(`[market-indexer] started — from block ${state.lastBlock + 1}, every ${Math.round(intervalMs / 1000)}s`);
  const tick = async () => {
    try {
      const n = await pollOnce();
      state.backfilled = true;
      if (n > 0) console.log(`[market-indexer] applied ${n} logs — head block ${state.lastBlock}`);
    } catch (err) {
      console.warn('[market-indexer] poll failed:', err instanceof Error ? err.message : err);
    }
  };
  await tick();
  timer = setInterval(() => void tick(), intervalMs);
}

export function stopMarketIndexer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function getIndexedMarket(marketId: string): IndexedMarket | null {
  return state.markets.get(marketId) ?? null;
}

export function listIndexedMarkets(): IndexedMarket[] {
  return [...state.markets.values()];
}

export function getIndexerStatus() {
  const meta = parimutuelMetadata();
  return {
    deployed: Boolean(meta.address),
    contract: meta.address,
    dbConfigured: isMarketStoreConfigured(),
    backfilled: state.backfilled,
    lastBlock: state.lastBlock,
    markets: state.markets.size,
    stakes: state.stakes.length,
    claims: state.claims.length,
  };
}
