/**
 * Friend leagues (DESIGN §1 Compete). A fan creates a named league and gets a
 * shareable invite code; friends join by code; each league has its own leaderboard —
 * the global free-pool ranking filtered to the league's members.
 *
 * `evaluateJoin` is a pure core; create/join are synchronous JSON-store operations
 * (offline-testable); only `leagueLeaderboard` touches the free-pick read path.
 */
import { randomUUID } from 'node:crypto';
import { isAddress } from 'ethers';
import {
  addLeague,
  getLeagueByCode,
  getLeagueById,
  listLeagues,
  updateLeague,
  type League,
} from './leagueStore.js';
import { freePoolStandings, getFreePicks } from './freePoolService.js';
import { hermesWallet, rankLeaderboard, type LeaderboardRow } from './leaderboardService.js';

export const MAX_LEAGUE_MEMBERS = 50;

/** Unambiguous code alphabet — no 0/O/1/I to keep invite codes easy to share. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type LeagueResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/** A random 6-character invite code. */
export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Pure: can this wallet join this league? */
export function evaluateJoin(league: League | null, wallet: string): { ok: true } | { ok: false; reason: string } {
  if (!league) return { ok: false, reason: 'league_not_found' };
  if (!isAddress(wallet)) return { ok: false, reason: 'invalid_wallet' };
  if (league.members.includes(wallet.toLowerCase())) return { ok: false, reason: 'already_member' };
  if (league.members.length >= MAX_LEAGUE_MEMBERS) return { ok: false, reason: 'league_full' };
  return { ok: true };
}

/** Create a league; the owner is auto-joined as the first member. */
export function createLeague(name: string, ownerWallet: string): LeagueResult<League> {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 40) return { ok: false, reason: 'invalid_name' };
  if (!isAddress(ownerWallet)) return { ok: false, reason: 'invalid_wallet' };
  const owner = ownerWallet.toLowerCase();
  let inviteCode = generateInviteCode();
  while (getLeagueByCode(inviteCode)) inviteCode = generateInviteCode(); // guarantee uniqueness
  const league: League = {
    id: randomUUID(),
    name: trimmed,
    ownerWallet: owner,
    inviteCode,
    members: [owner],
    createdAt: new Date().toISOString(),
  };
  return { ok: true, value: addLeague(league) };
}

/** Join a league by its invite code. */
export function joinLeague(inviteCode: string, wallet: string): LeagueResult<League> {
  const league = getLeagueByCode(inviteCode.trim().toUpperCase());
  const can = evaluateJoin(league, wallet);
  if (!can.ok) return can;
  const updated: League = { ...league!, members: [...league!.members, wallet.toLowerCase()] };
  return { ok: true, value: updateLeague(updated) };
}

/** Every league a wallet is a member of. */
export function leaguesForWallet(wallet: string): League[] {
  const lower = wallet.toLowerCase();
  return listLeagues().filter((l) => l.members.includes(lower));
}

/** A league's own leaderboard — the global free-pool ranking scoped to its members. */
export async function leagueLeaderboard(
  leagueId: string,
): Promise<{ league: League; rows: LeaderboardRow[] } | null> {
  const league = getLeagueById(leagueId);
  if (!league) return null;
  const members = new Set(league.members);
  const picks = (await getFreePicks()).filter((p) => members.has(p.wallet));
  return { league, rows: rankLeaderboard(freePoolStandings(picks), hermesWallet()) };
}
