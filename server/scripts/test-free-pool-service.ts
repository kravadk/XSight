/**
 * TDD test for the pure cores of the free-pool service — fully offline.
 *
 * Run: npm --prefix server run test:free-pool
 */
import assert from 'node:assert/strict';
import {
  outcomeFromScore,
  validateFreePick,
  scorePick,
  freePoolStandings,
  CORRECT_POINTS,
  type ScorableMatch,
} from '../src/services/freePoolService.js';
import type { FreePick } from '../src/services/freePickStore.js';

// outcomeFromScore
assert.equal(outcomeFromScore({ home: 2, away: 1 }), 'HOME');
assert.equal(outcomeFromScore({ home: 0, away: 3 }), 'AWAY');
assert.equal(outcomeFromScore({ home: 1, away: 1 }), 'DRAW');

// validateFreePick
const scheduled: ScorableMatch = { id: 'm1', status: 'scheduled' };
const live: ScorableMatch = { id: 'm1', status: 'live' };
const WALLET = '0x000000000000000000000000000000000000bEEF';
assert.deepEqual(validateFreePick(null, WALLET, 'HOME'), { ok: false, reason: 'fixture_not_found' });
assert.deepEqual(validateFreePick(scheduled, 'not-an-address', 'HOME'), { ok: false, reason: 'invalid_wallet' });
assert.deepEqual(validateFreePick(scheduled, WALLET, 'WIN'), { ok: false, reason: 'invalid_outcome' });
assert.deepEqual(validateFreePick(live, WALLET, 'HOME'), { ok: false, reason: 'pool_locked' });
assert.deepEqual(validateFreePick(scheduled, WALLET, 'HOME'), { ok: true });

// scorePick
const pending: FreePick = {
  id: '0xbeef:m1',
  fixtureId: 'm1',
  wallet: '0xbeef',
  outcome: 'HOME',
  points: 0,
  resolvedCorrect: null,
  createdAt: '2026-05-21T00:00:00.000Z',
  scoredAt: null,
};
const finalHomeWin: ScorableMatch = { id: 'm1', status: 'final', score: { home: 2, away: 0 } };
const finalAwayWin: ScorableMatch = { id: 'm1', status: 'final', score: { home: 0, away: 1 } };

const correct = scorePick(pending, finalHomeWin);
assert.equal(correct.resolvedCorrect, true, 'correct pick scored true');
assert.equal(correct.points, CORRECT_POINTS, 'correct pick earns CORRECT_POINTS');
assert.ok(correct.scoredAt, 'scoredAt is set');

const missed = scorePick(pending, finalAwayWin);
assert.equal(missed.resolvedCorrect, false, 'wrong pick scored false');
assert.equal(missed.points, 0, 'wrong pick earns 0');

assert.equal(scorePick(pending, scheduled).resolvedCorrect, null, 'unfinished fixture leaves pick pending');
assert.equal(scorePick(pending, null).resolvedCorrect, null, 'missing match leaves pick pending');
assert.strictEqual(scorePick(correct, finalAwayWin), correct, 'an already-scored pick is never re-scored');

// freePoolStandings
const picks: FreePick[] = [
  { ...pending, id: 'a:m1', wallet: 'a', resolvedCorrect: true, points: 10 },
  { ...pending, id: 'a:m2', fixtureId: 'm2', wallet: 'a', resolvedCorrect: false, points: 0 },
  { ...pending, id: 'b:m1', wallet: 'b', resolvedCorrect: true, points: 10 },
  { ...pending, id: 'c:m1', wallet: 'c', resolvedCorrect: null, points: 0 },
];
const standings = freePoolStandings(picks);
assert.equal(standings.length, 2, 'only wallets with scored picks appear (c is pending)');
assert.equal(standings[0]?.wallet, 'b', 'points tie broken by accuracy — b 1/1 beats a 1/2');
assert.equal(standings[0]?.points, 10);
assert.equal(standings[1]?.wallet, 'a');
assert.equal(standings[1]?.accuracy, 0.5, 'accuracy is correct/picks');

console.log('free pool service checks passed');
