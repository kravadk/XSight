/**
 * Global leaderboard (DESIGN §1 Compete, §5 wireframe [5]).
 *
 * Ranks every participant by their free-pool record. The AI pundit "Hermes" is a
 * first-class participant (DESIGN §1 — the bot is a non-human "user"): its picks are
 * mirrored into the free-pool store under a dedicated wallet, so the same
 * `freePoolStandings()` aggregation ranks fans and the bot side by side — that is the
 * "beat the AI" head-to-head.
 */
import { isAddress } from 'ethers';
import { env } from '../config/env.js';
import { listPunditPicks } from './punditService.js';
import { freePoolStandings, getFreePicks, recordFreePick, type FreePoolStanding } from './freePoolService.js';

export interface LeaderboardRow {
  rank: number; // 1-based
  wallet: string;
  isHermes: boolean; // true for the AI pundit's row
  picks: number;
  correct: number;
  accuracy: number; // 0..1
  points: number;
}

/** The wallet identity the AI pundit's free picks are recorded under, or null. */
export function hermesWallet(): string | null {
  const pundit = env.punditWalletAddress.trim();
  if (isAddress(pundit)) return pundit.toLowerCase();
  const agentic = env.agenticWalletAddress.trim();
  if (isAddress(agentic)) return agentic.toLowerCase();
  return null;
}

/** Pure: number sorted standings into ranked rows, flagging the Hermes row. */
export function rankLeaderboard(standings: FreePoolStanding[], hermes: string | null): LeaderboardRow[] {
  return standings.map((s, i) => ({
    rank: i + 1,
    wallet: s.wallet,
    isHermes: hermes !== null && s.wallet.toLowerCase() === hermes,
    picks: s.picks,
    correct: s.correct,
    accuracy: s.accuracy,
    points: s.points,
  }));
}

/** Mirror the pundit's current non-PASS picks into the free-pool store as Hermes' picks. */
export async function recordPunditFreePicks(): Promise<{ mirrored: number }> {
  const hermes = hermesWallet();
  if (!hermes) return { mirrored: 0 };
  const picks = await listPunditPicks();
  let mirrored = 0;
  for (const pick of picks) {
    // recordFreePick is a no-op once a fixture locks at kickoff — re-mirroring an
    // already-locked fixture is intentional and harmless; the first mirror persisted.
    if (pick.pick === 'PASS') continue;
    const res = await recordFreePick(pick.matchId, hermes, pick.pick);
    if (res.ok) mirrored += 1;
  }
  return { mirrored };
}

/** The ranked global leaderboard plus the Hermes row, if present. */
export async function globalLeaderboard(): Promise<{ rows: LeaderboardRow[]; hermes: LeaderboardRow | null }> {
  // Best-effort: a pundit/LLM failure must not break the leaderboard for fans.
  try {
    await recordPunditFreePicks();
  } catch {
    /* Hermes simply will not appear this cycle */
  }
  const picks = await getFreePicks(); // lazy-scores every pending pick
  const rows = rankLeaderboard(freePoolStandings(picks), hermesWallet());
  return { rows, hermes: rows.find((r) => r.isHermes) ?? null };
}
