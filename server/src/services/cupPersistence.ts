import pg from 'pg';
import { env } from '../config/env.js';
import type { CupFeed } from './cupData.js';

let pool: pg.Pool | null = null;
let initialized = false;
let lastPersistenceError: string | null = null;

function getPool(): pg.Pool | null {
  if (!env.databaseUrl) return null;
  if (!pool) {
    const connectionString = stripSslMode(env.databaseUrl);
    pool = new pg.Pool({
      connectionString,
      max: 3,
      ssl: shouldUseSsl(env.databaseUrl) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

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

export async function persistCupMatches(feed: CupFeed): Promise<void> {
  const db = getPool();
  if (!db) return;
  await ensureSchema(db);

  for (const match of feed.fixtures) {
    await db.query(
      `insert into cup_matches
        (match_id, provider_ids, home_code, away_code, kickoff_utc, status, source_hash, rules_hash, source_status, payload_json, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
       on conflict (match_id) do update set
        provider_ids = excluded.provider_ids,
        home_code = excluded.home_code,
        away_code = excluded.away_code,
        kickoff_utc = excluded.kickoff_utc,
        status = excluded.status,
        source_hash = excluded.source_hash,
        rules_hash = excluded.rules_hash,
        source_status = excluded.source_status,
        payload_json = excluded.payload_json,
        updated_at = now()`,
      [
        match.id,
        match.receipts.map((receipt) => receipt.provider),
        match.home.code,
        match.away.code,
        match.kickoffUtc,
        match.status,
        match.settlement.sourceHash,
        match.settlement.rulesHash,
        match.sourceStatus,
        JSON.stringify(match),
      ],
    );

    for (const receipt of match.receipts) {
      await db.query(
        `insert into cup_source_receipts
          (match_id, provider, source_url, observed_at, payload_hash, confidence, normalized_payload_json)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (match_id, provider, payload_hash) do nothing`,
        [
          match.id,
          receipt.provider,
          receipt.url,
          receipt.observedAt,
          receipt.payloadHash,
          receipt.confidence,
          JSON.stringify(receipt.normalizedPayload ?? null),
        ],
      );
    }
  }
  lastPersistenceError = null;
}

export async function getCupPersistenceHealth(): Promise<{
  configured: boolean;
  ok: boolean;
  tablesReady: boolean;
  lastError: string | null;
}> {
  const db = getPool();
  if (!db) {
    return { configured: false, ok: false, tablesReady: false, lastError: null };
  }
  try {
    await ensureSchema(db);
    await db.query('select 1');
    lastPersistenceError = null;
    return { configured: true, ok: true, tablesReady: true, lastError: null };
  } catch (err) {
    lastPersistenceError = err instanceof Error ? err.message : String(err);
    return { configured: true, ok: false, tablesReady: false, lastError: lastPersistenceError };
  }
}

export async function hasCupPaymentReceipt(txHash: string): Promise<boolean> {
  const db = getPool();
  if (!db) return false;
  await ensureSchema(db);
  const result = await db.query('select 1 from cup_payment_receipts where tx_hash = $1 limit 1', [txHash.toLowerCase()]);
  return (result.rowCount ?? 0) > 0;
}

export async function recordCupPaymentReceipt(entry: {
  txHash: string;
  endpoint: string;
  payer?: string;
  amount: number;
  asset: string;
  network: string;
}): Promise<void> {
  const db = getPool();
  if (!db) return;
  await ensureSchema(db);
  await db.query(
    `insert into cup_payment_receipts (tx_hash, endpoint, payer, amount, asset, network)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (tx_hash) do nothing`,
    [entry.txHash.toLowerCase(), entry.endpoint, entry.payer ?? null, entry.amount, entry.asset, entry.network],
  );
}

export async function recordCupSettlementEvent(entry: {
  txHash: string;
  matchId: string;
  action: string;
  outcome: string | null;
  signer: string;
  explorerUrl: string;
}): Promise<void> {
  const db = getPool();
  if (!db) return;
  await ensureSchema(db);
  await db.query(
    `insert into cup_settlement_events (tx_hash, match_id, action, outcome, signer, explorer_url)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (tx_hash) do nothing`,
    [entry.txHash.toLowerCase(), entry.matchId, entry.action, entry.outcome, entry.signer, entry.explorerUrl],
  );
  lastPersistenceError = null;
}

export async function recordCupWalletActivity(entry: {
  wallet: string;
  activityType: string;
  weight: number;
  ref?: string;
}): Promise<void> {
  const db = getPool();
  if (!db) return;
  await ensureSchema(db);
  await db.query(
    `insert into cup_wallet_activity (wallet, activity_type, weight, ref)
     values ($1,$2,$3,$4)`,
    [entry.wallet.toLowerCase(), entry.activityType, entry.weight, entry.ref ?? null],
  );
  lastPersistenceError = null;
}

async function ensureSchema(db: pg.Pool): Promise<void> {
  if (initialized) return;
  try {
    await db.query(`
      create table if not exists cup_matches (
        match_id text primary key,
        provider_ids text[] not null default '{}',
        home_code text not null,
        away_code text not null,
        kickoff_utc timestamptz not null,
        status text not null,
        source_hash text not null,
        rules_hash text not null,
        source_status text not null,
        payload_json jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists cup_source_receipts (
        id bigserial primary key,
        match_id text not null references cup_matches(match_id) on delete cascade,
        provider text not null,
        source_url text not null,
        observed_at timestamptz not null,
        payload_hash text not null,
        confidence numeric not null,
        normalized_payload_json jsonb not null,
        created_at timestamptz not null default now(),
        unique(match_id, provider, payload_hash)
      );

      create table if not exists cup_settlement_events (
        id bigserial primary key,
        tx_hash text not null unique,
        match_id text not null,
        action text not null,
        outcome text,
        signer text not null,
        explorer_url text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists cup_payment_receipts (
        id bigserial primary key,
        tx_hash text not null unique,
        endpoint text not null,
        payer text,
        amount numeric not null,
        asset text not null,
        network text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists cup_wallet_activity (
        id bigserial primary key,
        wallet text not null,
        activity_type text not null,
        weight numeric not null,
        ref text,
        created_at timestamptz not null default now()
      );
    `);
    initialized = true;
  } catch (err) {
    initialized = false;
    throw err;
  }
}
