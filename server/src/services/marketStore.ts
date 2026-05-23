/**
 * Market DB cache (DESIGN §3.1) — the persisted mirror of indexed ParimutuelMarket
 * on-chain state.
 *
 * DB-OPTIONAL: every export is a no-op when DATABASE_URL is unset. The indexer keeps a
 * full in-memory mirror regardless, so the API works with or without Postgres.
 */
import pg from 'pg';
import { env } from '../config/env.js';

export interface StoredMarket {
  marketId: string;
  matchId: string;
  closeTime: number;
  settled: boolean;
  refundMode: boolean;
  winningOutcome: number;
  totalPool: string;
  payoutPool: string;
  poolHome: string;
  poolDraw: string;
  poolAway: string;
  createdBlock: number;
}

export interface StoredStake {
  marketId: string;
  wallet: string;
  outcome: number;
  amount: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
}

export interface StoredClaim {
  marketId: string;
  wallet: string;
  amount: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
}

let pool: pg.Pool | null = null;
let initialized = false;

function stripSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('uselibpqcompat');
    return url.toString();
  } catch {
    return connectionString;
  }
}

function shouldUseSsl(connectionString: string): boolean {
  return connectionString.includes('supabase.com') || connectionString.includes('sslmode=');
}

function getPool(): pg.Pool | null {
  if (!env.databaseUrl) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: stripSslMode(env.databaseUrl),
      max: 3,
      ssl: shouldUseSsl(env.databaseUrl) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function ensureMarketSchema(db: pg.Pool): Promise<void> {
  if (initialized) return;
  await db.query(`
    create table if not exists cup_markets (
      market_id text primary key,
      match_id text not null,
      close_time bigint not null,
      settled boolean not null default false,
      refund_mode boolean not null default false,
      winning_outcome smallint not null default 0,
      total_pool numeric not null default 0,
      payout_pool numeric not null default 0,
      pool_home numeric not null default 0,
      pool_draw numeric not null default 0,
      pool_away numeric not null default 0,
      created_block bigint,
      updated_at timestamptz not null default now()
    );

    create table if not exists cup_stakes (
      id bigserial primary key,
      market_id text not null,
      wallet text not null,
      outcome smallint not null,
      amount numeric not null,
      tx_hash text not null,
      log_index integer not null,
      block_number bigint not null,
      created_at timestamptz not null default now(),
      unique(tx_hash, log_index)
    );

    create table if not exists cup_claims (
      id bigserial primary key,
      market_id text not null,
      wallet text not null,
      amount numeric not null,
      tx_hash text not null,
      log_index integer not null,
      block_number bigint not null,
      created_at timestamptz not null default now(),
      unique(tx_hash, log_index)
    );

    create table if not exists cup_indexer_state (
      contract text primary key,
      last_block bigint not null,
      updated_at timestamptz not null default now()
    );
  `);
  initialized = true;
}

export async function upsertMarket(m: StoredMarket): Promise<void> {
  const db = getPool();
  if (!db) return;
  await ensureMarketSchema(db);
  await db.query(
    `insert into cup_markets
      (market_id, match_id, close_time, settled, refund_mode, winning_outcome,
       total_pool, payout_pool, pool_home, pool_draw, pool_away, created_block, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
     on conflict (market_id) do update set
       settled = excluded.settled,
       refund_mode = excluded.refund_mode,
       winning_outcome = excluded.winning_outcome,
       total_pool = excluded.total_pool,
       payout_pool = excluded.payout_pool,
       pool_home = excluded.pool_home,
       pool_draw = excluded.pool_draw,
       pool_away = excluded.pool_away,
       updated_at = now()`,
    [
      m.marketId, m.matchId, m.closeTime, m.settled, m.refundMode, m.winningOutcome,
      m.totalPool, m.payoutPool, m.poolHome, m.poolDraw, m.poolAway, m.createdBlock,
    ],
  );
}

export async function insertStake(s: StoredStake): Promise<void> {
  const db = getPool();
  if (!db) return;
  await ensureMarketSchema(db);
  await db.query(
    `insert into cup_stakes (market_id, wallet, outcome, amount, tx_hash, log_index, block_number)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (tx_hash, log_index) do nothing`,
    [s.marketId, s.wallet.toLowerCase(), s.outcome, s.amount, s.txHash.toLowerCase(), s.logIndex, s.blockNumber],
  );
}

export async function insertClaim(c: StoredClaim): Promise<void> {
  const db = getPool();
  if (!db) return;
  await ensureMarketSchema(db);
  await db.query(
    `insert into cup_claims (market_id, wallet, amount, tx_hash, log_index, block_number)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (tx_hash, log_index) do nothing`,
    [c.marketId, c.wallet.toLowerCase(), c.amount, c.txHash.toLowerCase(), c.logIndex, c.blockNumber],
  );
}

export async function getIndexerCursor(contract: string): Promise<number | null> {
  const db = getPool();
  if (!db) return null;
  await ensureMarketSchema(db);
  const result = await db.query('select last_block from cup_indexer_state where contract = $1', [contract.toLowerCase()]);
  const row = result.rows[0] as { last_block: string } | undefined;
  return row ? Number(row.last_block) : null;
}

export async function setIndexerCursor(contract: string, block: number): Promise<void> {
  const db = getPool();
  if (!db) return;
  await ensureMarketSchema(db);
  await db.query(
    `insert into cup_indexer_state (contract, last_block, updated_at)
     values ($1,$2,now())
     on conflict (contract) do update set last_block = excluded.last_block, updated_at = now()`,
    [contract.toLowerCase(), block],
  );
}

export function isMarketStoreConfigured(): boolean {
  return Boolean(env.databaseUrl);
}

/** Number of on-chain stakes recorded for a wallet across all markets. Used by FanPass scoring. */
export async function countStakesByWallet(wallet: string): Promise<number> {
  const db = getPool();
  if (!db) return 0;
  await ensureMarketSchema(db);
  const result = await db.query('select count(*)::int as n from cup_stakes where wallet = $1', [wallet.toLowerCase()]);
  const row = result.rows[0] as { n: number } | undefined;
  return row?.n ?? 0;
}

/** Number of on-chain claim/payout events recorded for a wallet. Used by FanPass scoring. */
export async function countClaimsByWallet(wallet: string): Promise<number> {
  const db = getPool();
  if (!db) return 0;
  await ensureMarketSchema(db);
  const result = await db.query('select count(*)::int as n from cup_claims where wallet = $1', [wallet.toLowerCase()]);
  const row = result.rows[0] as { n: number } | undefined;
  return row?.n ?? 0;
}
