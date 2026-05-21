/**
 * Free-to-play prediction pools (DESIGN §2.1 Flow B). A fan picks a fixture outcome
 * for free — no wallet money, no transaction. When the fixture finishes, the pick is
 * scored: a correct call earns CORRECT_POINTS, feeding reputation and the leaderboard.
 *
 * The pure cores (`outcomeFromScore`, `validateFreePick`, `scorePick`,
 * `freePoolStandings`) are separated from the network-backed wrappers so the logic is
 * unit-testable offline.
 */
import { isAddress } from 'ethers';
import { getCupMatch, listCupMatches, type CupMatch, type CupOutcome } from './cupData.js';
import { freePickId, getFreePick, listFreePicks, upsertFreePick, type FreePick } from './freePickStore.js';

export const CORRECT_POINTS = 10;

/** The subset of a fixture the scoring logic needs — a full CupMatch satisfies it. */
export type ScorableMatch = Pick<CupMatch, 'id' | 'status' | 'score'>;

export interface FreePoolStanding {
  wallet: string;
  picks: number; // scored picks only
  correct: number;
  points: number;
  accuracy: number; // correct / picks, 0..1 (0 when picks === 0)
}

export type FreePickValidation = { ok: true } | { ok: false; reason: string };

/** Winning outcome implied by a final score. */
export function outcomeFromScore(score: { home: number; away: number }): CupOutcome {
  if (score.home > score.away) return 'HOME';
  if (score.home < score.away) return 'AWAY';
  return 'DRAW';
}

/** A fixture has a usable result once it is final/settled AND carries a score. */
function matchResultOutcome(match: ScorableMatch): CupOutcome | null {
  const settled = match.status === 'final' || match.status === 'settled';
  if (!settled || !match.score) return null;
  return outcomeFromScore(match.score);
}

/** Pure: may this wallet make/replace a free pick on this fixture with this outcome? */
export function validateFreePick(
  match: ScorableMatch | null,
  wallet: string,
  outcome: string,
): FreePickValidation {
  if (!match) return { ok: false, reason: 'fixture_not_found' };
  if (!isAddress(wallet)) return { ok: false, reason: 'invalid_wallet' };
  if (outcome !== 'HOME' && outcome !== 'DRAW' && outcome !== 'AWAY') {
    return { ok: false, reason: 'invalid_outcome' };
  }
  if (match.status !== 'scheduled') return { ok: false, reason: 'pool_locked' };
  return { ok: true };
}

/**
 * Pure: score one pick against its fixture. Returns the pick unchanged when the
 * fixture has no final result yet (or is missing), and a scored copy otherwise.
 * An already-scored pick is returned unchanged — never re-scored.
 */
export function scorePick(pick: FreePick, match: ScorableMatch | null): FreePick {
  if (pick.resolvedCorrect !== null) return pick;
  if (!match) return pick;
  const result = matchResultOutcome(match);
  if (!result) return pick;
  const correct = pick.outcome === result;
  return {
    ...pick,
    resolvedCorrect: correct,
    points: correct ? CORRECT_POINTS : 0,
    scoredAt: new Date().toISOString(),
  };
}

/** Pure: aggregate scored picks into per-wallet standings, sorted by points desc. */
export function freePoolStandings(picks: FreePick[]): FreePoolStanding[] {
  const byWallet = new Map<string, FreePoolStanding>();
  for (const pick of picks) {
    if (pick.resolvedCorrect === null) continue; // only scored picks count
    const row = byWallet.get(pick.wallet) ?? { wallet: pick.wallet, picks: 0, correct: 0, points: 0, accuracy: 0 };
    row.picks += 1;
    if (pick.resolvedCorrect) row.correct += 1;
    row.points += pick.points;
    byWallet.set(pick.wallet, row);
  }
  const rows = [...byWallet.values()];
  for (const row of rows) row.accuracy = row.picks > 0 ? row.correct / row.picks : 0;
  return rows.sort((a, b) => b.points - a.points || b.accuracy - a.accuracy);
}

// ---- network-backed wrappers ----

/** Record — or, while the fixture is still scheduled, change — a wallet's free pick. */
export async function recordFreePick(
  fixtureId: string,
  wallet: string,
  outcome: string,
): Promise<{ ok: true; pick: FreePick } | { ok: false; reason: string }> {
  const match = await getCupMatch(fixtureId);
  const valid = validateFreePick(match, wallet, outcome);
  if (!valid.ok) return valid;
  const lowerWallet = wallet.toLowerCase();
  const existing = getFreePick(lowerWallet, fixtureId);
  const pick: FreePick = {
    id: freePickId(lowerWallet, fixtureId),
    fixtureId,
    wallet: lowerWallet,
    outcome: outcome as CupOutcome,
    points: 0,
    resolvedCorrect: null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    scoredAt: null,
  };
  return { ok: true, pick: upsertFreePick(pick) };
}

/** Score every pending pick whose fixture now has a final result. Returns count scored. */
export async function scoreFreePicks(): Promise<{ scored: number }> {
  const pending = listFreePicks().filter((p) => p.resolvedCorrect === null);
  if (pending.length === 0) return { scored: 0 };
  const matches = await listCupMatches();
  const byId = new Map(matches.map((m) => [m.id, m]));
  let scored = 0;
  for (const pick of pending) {
    const next = scorePick(pick, byId.get(pick.fixtureId) ?? null);
    if (next.resolvedCorrect !== null) {
      upsertFreePick(next);
      scored += 1;
    }
  }
  return { scored };
}

/** Free picks for a wallet / fixture, scoring any now-resolvable picks first. */
export async function getFreePicks(filter?: { wallet?: string; fixtureId?: string }): Promise<FreePick[]> {
  await scoreFreePicks();
  return listFreePicks(filter);
}
