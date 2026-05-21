/**
 * TDD test for the bracket store + the pure scoreBracket core — fully offline.
 *
 * Run: npm --prefix server run test:bracket
 */
import assert from 'node:assert/strict';
import { join } from 'node:path';
import type { ScorableMatch } from '../src/services/freePoolService.js';

process.env.BRACKETS_PATH = join(process.cwd(), '..', 'data', 'test-bracket.json');

const { upsertBracket, getBracket, clearBrackets } = await import('../src/services/bracketStore.js');
const { scoreBracket, saveBracket } = await import('../src/services/bracketService.js');

clearBrackets();
assert.equal(getBracket('0xanyone'), null, 'store starts empty');

// --- store round-trip ---
upsertBracket({
  wallet: '0xaaa',
  picks: { m1: 'HOME' },
  createdAt: '2026-05-21T00:00:00.000Z',
  updatedAt: '2026-05-21T00:00:00.000Z',
});
assert.equal(getBracket('0xAAA')?.picks.m1, 'HOME', 'getBracket is case-insensitive');

// --- scoreBracket (pure) ---
const matches: ScorableMatch[] = [
  { id: 'm1', status: 'final', score: { home: 2, away: 0 } }, // HOME
  { id: 'm2', status: 'final', score: { home: 0, away: 1 } }, // AWAY
  { id: 'm3', status: 'scheduled' }, // unresolved
];
const score = scoreBracket({ m1: 'HOME', m2: 'HOME', m3: 'DRAW', m4: 'HOME' }, matches);
assert.equal(score.total, 4, 'total counts every pick');
assert.equal(score.scored, 2, 'scored counts only resolved fixtures (m1, m2)');
assert.equal(score.correct, 1, 'correct counts right calls (m1 right, m2 wrong)');
assert.deepEqual(scoreBracket({}, matches), { total: 0, scored: 0, correct: 0 }, 'empty bracket scores zero');

// --- saveBracket ---
assert.deepEqual(saveBracket('not-an-address', { m1: 'HOME' }), { ok: false, reason: 'invalid_wallet' });
const WALLET = '0x000000000000000000000000000000000000bEEF';
const saved = saveBracket(WALLET, { m1: 'HOME', m2: 'BOGUS', m3: 'AWAY' });
assert.equal(saved.ok, true, 'valid bracket saves');
if (!saved.ok) throw new Error('unreachable');
assert.deepEqual(Object.keys(saved.value.picks).sort(), ['m1', 'm3'], 'invalid outcomes are dropped');
assert.equal(saved.value.wallet, WALLET.toLowerCase(), 'wallet stored lowercased');

const resaved = saveBracket(WALLET, { m1: 'DRAW' });
assert.equal(resaved.ok && resaved.value.createdAt, saved.value.createdAt, 're-save preserves createdAt');

console.log('bracket checks passed');
