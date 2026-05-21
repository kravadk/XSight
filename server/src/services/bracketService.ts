/**
 * Tournament brackets (DESIGN §1, wireframe [4]). A fan saves an outcome pick for
 * every fixture; the bracket is scored against real results and compared to the AI
 * pundit. `scoreBracket` is a pure core; `saveBracket` is a synchronous store write;
 * `bracketScoreboard` is the network-backed you-vs-Hermes view.
 */
import { isAddress } from 'ethers';
import { listCupMatches } from './cupData.js';
import { listPunditPicks } from './punditService.js';
import { outcomeFromScore, type ScorableMatch } from './freePoolService.js';
import { getBracket, upsertBracket, type Bracket, type BracketOutcome } from './bracketStore.js';

export interface BracketScore {
  total: number;   // picks made
  scored: number;  // picks whose fixture has a final result
  correct: number; // scored picks that were right
}

export type SaveBracketResult = { ok: true; value: Bracket } | { ok: false; reason: string };

/** The settled outcome of a fixture, or null if it has no final result yet. */
function resolvedOutcome(match: ScorableMatch): BracketOutcome | null {
  const done = match.status === 'final' || match.status === 'settled';
  return done && match.score ? outcomeFromScore(match.score) : null;
}

/** Pure: score a picks map against the fixtures. */
export function scoreBracket(picks: Record<string, string>, matches: ScorableMatch[]): BracketScore {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const entries = Object.entries(picks);
  let scored = 0;
  let correct = 0;
  for (const [fixtureId, outcome] of entries) {
    const match = byId.get(fixtureId);
    if (!match) continue;
    const result = resolvedOutcome(match);
    if (!result) continue;
    scored += 1;
    if (result === outcome) correct += 1;
  }
  return { total: entries.length, scored, correct };
}

/** Validate and persist a wallet's bracket. Invalid outcomes are dropped. */
export function saveBracket(wallet: string, picks: Record<string, string>): SaveBracketResult {
  if (!isAddress(wallet)) return { ok: false, reason: 'invalid_wallet' };
  const clean: Record<string, BracketOutcome> = {};
  for (const [fixtureId, outcome] of Object.entries(picks)) {
    if (outcome === 'HOME' || outcome === 'DRAW' || outcome === 'AWAY') clean[fixtureId] = outcome;
  }
  const lower = wallet.toLowerCase();
  const existing = getBracket(lower);
  const now = new Date().toISOString();
  return {
    ok: true,
    value: upsertBracket({
      wallet: lower,
      picks: clean,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }),
  };
}

/** A wallet's bracket plus its score and the Hermes comparison over the same fixtures. */
export async function bracketScoreboard(
  wallet: string,
): Promise<{ bracket: Bracket | null; you: BracketScore; hermes: BracketScore }> {
  const bracket = getBracket(wallet);
  const matches = await listCupMatches();
  const empty: BracketScore = { total: 0, scored: 0, correct: 0 };
  const you = bracket ? scoreBracket(bracket.picks, matches) : empty;

  let hermes: BracketScore = empty;
  if (bracket) {
    try {
      const punditPicks = await listPunditPicks();
      const hermesPicks: Record<string, string> = {};
      for (const pick of punditPicks) {
        // Compare only on the fixtures the fan actually bracketed — a fair head-to-head.
        if (pick.pick !== 'PASS' && bracket.picks[pick.matchId]) hermesPicks[pick.matchId] = pick.pick;
      }
      hermes = scoreBracket(hermesPicks, matches);
    } catch {
      /* Hermes comparison is best-effort */
    }
  }
  return { bracket, you, hermes };
}
