/**
 * TDD test for the free-pick JSON store. Uses a throwaway store file.
 *
 * Run: npm --prefix server run test:free-store
 */
import assert from 'node:assert/strict';
import { join } from 'node:path';

process.env.FREE_PICKS_PATH = join(process.cwd(), '..', 'data', 'test-free-pick-store.json');

const { upsertFreePick, getFreePick, listFreePicks, clearFreePicks, freePickId } = await import(
  '../src/services/freePickStore.js'
);

clearFreePicks();
assert.equal(listFreePicks().length, 0, 'store starts empty after clear');

const pickA = {
  id: freePickId('0xAAA', 'm1'),
  fixtureId: 'm1',
  wallet: '0xaaa',
  outcome: 'HOME' as const,
  points: 0,
  resolvedCorrect: null,
  createdAt: '2026-05-21T00:00:00.000Z',
  scoredAt: null,
};
upsertFreePick(pickA);
upsertFreePick({ ...pickA, id: freePickId('0xBBB', 'm1'), wallet: '0xbbb', outcome: 'AWAY' });

assert.equal(listFreePicks().length, 2, 'two picks stored');
assert.equal(listFreePicks({ wallet: '0xAAA' }).length, 1, 'filter by wallet is case-insensitive');
assert.equal(listFreePicks({ fixtureId: 'm1' }).length, 2, 'filter by fixture');
assert.equal(getFreePick('0xaaa', 'm1')?.outcome, 'HOME', 'getFreePick returns the pick');

upsertFreePick({ ...pickA, outcome: 'DRAW' });
assert.equal(listFreePicks().length, 2, 'upsert replaces by id, does not duplicate');
assert.equal(getFreePick('0xaaa', 'm1')?.outcome, 'DRAW', 'upsert updated the outcome');

console.log('free pick store checks passed');
