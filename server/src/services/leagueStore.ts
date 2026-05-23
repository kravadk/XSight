/**
 * JSON-file persistence for friend leagues. Mirrors `freePickStore.ts`: one JSON file,
 * loaded once into memory, rewritten atomically on every mutation. No DATABASE_URL
 * required — leagues are off-chain product data (DESIGN §3.2).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface League {
  id: string;
  name: string;
  ownerWallet: string; // lowercased EVM address
  inviteCode: string;  // uppercase, unique
  members: string[];   // lowercased wallets, owner included
  createdAt: string;   // ISO timestamp
}

const STORE_PATH = resolve(process.cwd(), process.env.LEAGUES_PATH ?? '../data/leagues.json');

let loaded = false;
let leagues: League[] = [];

export function addLeague(league: League): League {
  load();
  leagues.push(league);
  save();
  return league;
}

/** Replace the league with the same id (or append if new). Returns it. */
export function updateLeague(league: League): League {
  load();
  const idx = leagues.findIndex((l) => l.id === league.id);
  if (idx >= 0) leagues[idx] = league;
  else leagues.push(league);
  save();
  return league;
}

export function getLeagueById(id: string): League | null {
  load();
  const found = leagues.find((l) => l.id === id);
  return found ? { ...found, members: [...found.members] } : null;
}

export function getLeagueByCode(code: string): League | null {
  load();
  const found = leagues.find((l) => l.inviteCode === code);
  return found ? { ...found, members: [...found.members] } : null;
}

export function listLeagues(): League[] {
  load();
  return leagues.map((l) => ({ ...l, members: [...l.members] }));
}

export function clearLeagues(): void {
  load();
  leagues = [];
  save();
}

/** Number of leagues a wallet is a member of (owner counts because owner is auto-added to `members`). */
export function countLeaguesByMember(wallet: string): number {
  load();
  const lower = wallet.toLowerCase();
  return leagues.filter((l) => l.members.includes(lower)).length;
}

function load(): void {
  if (loaded) return;
  loaded = true;
  if (!existsSync(STORE_PATH)) {
    leagues = [];
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as { leagues?: League[] };
    leagues = Array.isArray(parsed.leagues) ? parsed.leagues : [];
  } catch {
    leagues = [];
  }
}

function save(): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  const tmp = `${STORE_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify({ leagues }, null, 2));
  renameSync(tmp, STORE_PATH);
}
