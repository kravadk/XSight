import assert from 'node:assert/strict';
import { getCupFeed, getCupPlayerStats, mergeProviderMatches, scoreCupTeamStrength, type NormalizedProviderMatch } from '../src/services/cupData.js';

const feed = await getCupFeed();
assert.ok(Array.isArray(feed.fixtures), 'fixture feed returns an array');

if (feed.fixtures[0]) {
  const matchId = feed.fixtures[0].id;
  const strength = await scoreCupTeamStrength(matchId);
  assert.equal(strength?.matchId, matchId, 'team strength is available for known live matches');
  assert.equal(typeof strength?.home.strength, 'number', 'home strength is numeric');

  const stats = await getCupPlayerStats(matchId);
  assert.equal(stats?.matchId, matchId, 'player stats shape is available for known matches');
  assert.ok(Array.isArray(stats?.players), 'player stats never fabricate players');
}

assert.equal(await getCupPlayerStats('missing-match'), null, 'unknown match returns null');

const futureProviderLive: NormalizedProviderMatch = {
  id: 'provider-future-live',
  stage: 'future regression fixture',
  kickoffUtc: '2030-06-11T19:00:00.000Z',
  home: { code: 'MEX', name: 'Mexico', rating: 50, form: '' },
  away: { code: 'RSA', name: 'South Africa', rating: 50, form: '' },
  venue: 'Regression venue',
  status: 'live',
  receipt: {
    provider: 'ESPN',
    url: 'https://example.test/future-live',
    observedAt: new Date().toISOString(),
    payloadHash: '0xfuturelive',
    confidence: 0.7,
  },
};
const [futureMatch] = mergeProviderMatches([futureProviderLive]);
assert.equal(futureMatch?.status, 'scheduled', 'future provider-live fixtures are not rendered as live');
assert.equal(futureMatch?.sourceStatus, 'fixture_available', 'future fixtures show fixture availability, not live status');

console.log('cup data checks passed');
