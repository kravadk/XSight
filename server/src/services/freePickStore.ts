/**
 * JSON-file persistence for free-to-play prediction picks. Mirrors the
 * `cupSettlementLog.ts` / `punditExecutionLog.ts` pattern: one JSON file, loaded once
 * into memory, rewritten atomically on every mutation.
 *
 * Free picks are off-chain cache data (DESIGN §3.2) — no DATABASE_URL required, so the
 * feature works in every environment and is trivially testable offline.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CupOutcome } from './cupData.js';

export interface FreePick {
  id: string;                      // `${wallet}:${fixtureId}` — one pick per wallet+fixture
  fixtureId: string;
  wallet: string;                  // lowercased EVM address
  outcome: CupOutcome;             // 'HOME' | 'DRAW' | 'AWAY'
  points: number;                  // 0 until scored, CORRECT_POINTS if correct
  resolvedCorrect: boolean | null; // null = pending (fixture not final yet)
  createdAt: string;               // ISO timestamp
  scoredAt: string | null;         // ISO when scored, else null
}

const STORE_PATH = resolve(process.cwd(), process.env.FREE_PICKS_PATH ?? '../data/free-picks.json');

let loaded = false;
let picks: FreePick[] = [];

/** Deterministic id for a wallet's pick on one fixture (lowercases the wallet). */
export function freePickId(wallet: string, fixtureId: string): string {
  return `${wallet.toLowerCase()}:${fixtureId}`;
}

/** Insert a new pick, or replace the existing one with the same id. Returns it. */
export function upsertFreePick(pick: FreePick): FreePick {
  load();
  const idx = picks.findIndex((p) => p.id === pick.id);
  if (idx >= 0) picks[idx] = pick;
  else picks.push(pick);
  save();
  return pick;
}

export function getFreePick(wallet: string, fixtureId: string): FreePick | null {
  load();
  const id = freePickId(wallet, fixtureId);
  return picks.find((p) => p.id === id) ?? null;
}

export function listFreePicks(filter?: { wallet?: string; fixtureId?: string }): FreePick[] {
  load();
  const wallet = filter?.wallet?.toLowerCase();
  return picks
    .filter((p) => (wallet ? p.wallet === wallet : true))
    .filter((p) => (filter?.fixtureId ? p.fixtureId === filter.fixtureId : true))
    .map((p) => ({ ...p }));
}

export function clearFreePicks(): void {
  load();
  picks = [];
  save();
}

function load(): void {
  if (loaded) return;
  loaded = true;
  if (!existsSync(STORE_PATH)) {
    picks = [];
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as { picks?: FreePick[] };
    picks = Array.isArray(parsed.picks) ? parsed.picks : [];
  } catch {
    picks = [];
  }
}

function save(): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  const tmp = `${STORE_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify({ picks }, null, 2));
  renameSync(tmp, STORE_PATH);
}
