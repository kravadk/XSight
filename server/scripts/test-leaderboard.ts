/**
 * TDD test for the pure leaderboard ranking core — fully offline.
 *
 * Run: npm --prefix server run test:leaderboard
 */
import assert from 'node:assert/strict';
import { rankLeaderboard } from '../src/services/leaderboardService.js';
import type { FreePoolStanding } from '../src/services/freePoolService.js';

const standings: FreePoolStanding[] = [
  { wallet: '0xhermes', picks: 5, correct: 4, points: 40, accuracy: 0.8 },
  { wallet: '0xfan', picks: 3, correct: 1, points: 10, accuracy: 1 / 3 },
];

const rows = rankLeaderboard(standings, '0xhermes');
assert.equal(rows.length, 2);
assert.equal(rows[0]?.rank, 1, 'first row is rank 1');
assert.equal(rows[1]?.rank, 2, 'second row is rank 2');
assert.equal(rows[0]?.isHermes, true, 'hermes row flagged');
assert.equal(rows[1]?.isHermes, false, 'fan row not flagged');
assert.equal(rows[0]?.points, 40, 'standing fields carried through');
assert.equal(rows[1]?.correct, 1, 'standing fields carried through');

assert.equal(rankLeaderboard(standings, null).every((r) => !r.isHermes), true, 'null hermes flags nobody');

const ci = rankLeaderboard([{ wallet: '0xABC', picks: 1, correct: 1, points: 10, accuracy: 1 }], '0xabc');
assert.equal(ci[0]?.isHermes, true, 'hermes match is case-insensitive');

assert.deepEqual(rankLeaderboard([], '0xhermes'), [], 'empty standings -> empty board');

console.log('leaderboard checks passed');
