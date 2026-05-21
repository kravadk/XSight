/**
 * TDD test for the league JSON store. Uses a throwaway store file.
 *
 * Run: npm --prefix server run test:league-store
 */
import assert from 'node:assert/strict';
import { join } from 'node:path';

process.env.LEAGUES_PATH = join(process.cwd(), '..', 'data', 'test-league-store.json');

const { addLeague, updateLeague, getLeagueById, getLeagueByCode, listLeagues, clearLeagues } = await import(
  '../src/services/leagueStore.js'
);

clearLeagues();
assert.equal(listLeagues().length, 0, 'store starts empty after clear');

const league = {
  id: 'lg-1',
  name: 'Test League',
  ownerWallet: '0xowner',
  inviteCode: 'ABC123',
  members: ['0xowner'],
  createdAt: '2026-05-21T00:00:00.000Z',
};
addLeague(league);
assert.equal(listLeagues().length, 1, 'one league stored');
assert.equal(getLeagueById('lg-1')?.name, 'Test League', 'getLeagueById works');
assert.equal(getLeagueByCode('ABC123')?.id, 'lg-1', 'getLeagueByCode works');
assert.equal(getLeagueById('nope'), null, 'missing id returns null');

updateLeague({ ...league, members: ['0xowner', '0xfriend'] });
assert.equal(listLeagues().length, 1, 'updateLeague replaces by id, no duplicate');
assert.equal(getLeagueById('lg-1')?.members.length, 2, 'updateLeague applied the new member');

const copy = listLeagues()[0]!;
copy.members.push('0xhacker');
assert.equal(getLeagueById('lg-1')?.members.length, 2, 'listLeagues returns deep copies — store is not mutated');

console.log('league store checks passed');
