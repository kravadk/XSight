/**
 * TDD test for the league service — offline (JSON store only, no network).
 *
 * Run: npm --prefix server run test:league
 */
import assert from 'node:assert/strict';
import { join } from 'node:path';

process.env.LEAGUES_PATH = join(process.cwd(), '..', 'data', 'test-league-service.json');

const { createLeague, joinLeague, leaguesForWallet, evaluateJoin, generateInviteCode, MAX_LEAGUE_MEMBERS } =
  await import('../src/services/leagueService.js');
const { clearLeagues } = await import('../src/services/leagueStore.js');

clearLeagues();

const OWNER = '0x000000000000000000000000000000000000aabc';
const FRIEND = '0x000000000000000000000000000000000000bEEF';

// generateInviteCode — 6 chars, unambiguous alphabet
const code = generateInviteCode();
assert.equal(code.length, 6, 'invite code is 6 chars');
assert.match(code, /^[A-Z2-9]+$/, 'invite code uses the unambiguous alphabet');

// createLeague — validation
assert.deepEqual(createLeague('ab', OWNER), { ok: false, reason: 'invalid_name' });
assert.deepEqual(createLeague('Good Name', 'not-an-address'), { ok: false, reason: 'invalid_wallet' });

const created = createLeague('Sunday Squad', OWNER);
assert.equal(created.ok, true, 'valid league is created');
if (!created.ok) throw new Error('unreachable');
assert.equal(created.value.members[0], OWNER.toLowerCase(), 'owner is auto-joined and lowercased');
assert.equal(created.value.name, 'Sunday Squad');

// joinLeague
assert.deepEqual(joinLeague('ZZZZZZ', FRIEND), { ok: false, reason: 'league_not_found' });
const joined = joinLeague(created.value.inviteCode, FRIEND);
assert.equal(joined.ok, true, 'friend joins with the code');
if (!joined.ok) throw new Error('unreachable');
assert.equal(joined.value.members.length, 2, 'friend added to members');

// duplicate join rejected
assert.deepEqual(joinLeague(created.value.inviteCode, FRIEND), { ok: false, reason: 'already_member' });

// leaguesForWallet
assert.equal(leaguesForWallet(FRIEND).length, 1, 'friend is in one league');
assert.equal(leaguesForWallet('0x000000000000000000000000000000000000dEaD').length, 0, 'stranger is in none');

// evaluateJoin — pure
assert.deepEqual(evaluateJoin(null, FRIEND), { ok: false, reason: 'league_not_found' });
const full = {
  id: 'x',
  name: 'Full',
  ownerWallet: '0xo',
  inviteCode: 'FULL00',
  members: Array.from({ length: MAX_LEAGUE_MEMBERS }, (_, i) => `0xmember${i}`),
  createdAt: '2026-05-21T00:00:00.000Z',
};
assert.deepEqual(evaluateJoin(full, FRIEND), { ok: false, reason: 'league_full' });

console.log('league service checks passed');
