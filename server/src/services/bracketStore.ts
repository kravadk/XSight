/**
 * JSON-file persistence for tournament brackets — one bracket per wallet. Mirrors
 * `freePickStore.ts`: one JSON file, loaded once, rewritten atomically. No
 * DATABASE_URL required (DESIGN §3.2 — brackets are off-chain product data).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type BracketOutcome = 'HOME' | 'DRAW' | 'AWAY';

export interface Bracket {
  wallet: string;                        // lowercased EVM address — the key
  picks: Record<string, BracketOutcome>; // fixtureId -> outcome
  createdAt: string;                     // ISO timestamp
  updatedAt: string;                     // ISO timestamp
}

const STORE_PATH = resolve(process.cwd(), process.env.BRACKETS_PATH ?? '../data/brackets.json');

let loaded = false;
let brackets: Bracket[] = [];

/** Insert or replace the bracket for a wallet. Returns the stored bracket. */
export function upsertBracket(bracket: Bracket): Bracket {
  load();
  const idx = brackets.findIndex((b) => b.wallet === bracket.wallet);
  if (idx >= 0) brackets[idx] = bracket;
  else brackets.push(bracket);
  save();
  return bracket;
}

export function getBracket(wallet: string): Bracket | null {
  load();
  const lower = wallet.toLowerCase();
  const found = brackets.find((b) => b.wallet === lower);
  return found ? { ...found, picks: { ...found.picks } } : null;
}

export function clearBrackets(): void {
  load();
  brackets = [];
  save();
}

function load(): void {
  if (loaded) return;
  loaded = true;
  if (!existsSync(STORE_PATH)) {
    brackets = [];
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as { brackets?: Bracket[] };
    brackets = Array.isArray(parsed.brackets) ? parsed.brackets : [];
  } catch {
    brackets = [];
  }
}

function save(): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  const tmp = `${STORE_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify({ brackets }, null, 2));
  renameSync(tmp, STORE_PATH);
}
