import assert from 'node:assert/strict';

const BASE = process.env.XSIGHT_HOST ?? 'http://localhost:8787';

async function http(path: string, init: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, json, text };
}

const proof = await http('/api/cup/track-proof');
assert.equal(proof.status, 200, 'track proof endpoint should return 200');
assert.equal(proof.json.tracks.length, 6, 'all six target tracks should be represented');
for (const track of ['AI Agent', 'Prediction Infrastructure', 'Trading', 'Social', 'NFT', 'GameFi']) {
  const item = proof.json.tracks.find((row: any) => row.track === track);
  assert.ok(item, `${track} proof row exists`);
  assert.ok(['ready', 'strong', 'needs proof', 'stretch'].includes(item.status), `${track} has a known status`);
  assert.ok(item.proofs.length > 0, `${track} has at least one proof artifact`);
  assert.ok(item.doNotClaim.length > 0, `${track} records an overclaim boundary`);
}

const invalidSbt = await http('/api/cup/fanpass/sbt-eligibility?wallet=not-a-wallet');
assert.equal(invalidSbt.status, 400, 'SBT eligibility rejects invalid wallet');

const fixtures = await http('/api/cup/fixtures');
assert.equal(fixtures.status, 200, 'fixtures endpoint should return 200');
const first = fixtures.json.fixtures?.[0];

if (first) {
  const action = await http('/api/cup/action-plan', {
    method: 'POST',
    body: JSON.stringify({ matchId: first.id, mode: 'agent' }),
  });
  assert.equal(action.status, 200, 'action plan returns 200 for live fixture');
  assert.equal(action.json.agentTrace.length, 5, 'agent trace has five explicit tool steps');
  assert.ok(['NO_TRADE', 'WAIT', 'HEDGE_PREP', 'APPROVAL_REQUIRED'].includes(action.json.riskDecision), 'risk decision is explicit');
  assert.notEqual(String(action.json.primaryAction).toLowerCase().includes('autonomous betting marketplace'), true, 'action plan avoids betting marketplace wording');

  const quest = await http(`/api/cup/fantasy-quest?matchId=${encodeURIComponent(first.id)}&wallet=0x0000000000000000000000000000000000000001`);
  assert.equal(quest.status, 200, 'fantasy quest returns 200 for live fixture and valid wallet');
  assert.ok(['locked', 'basic_available', 'winner_locked', 'winner_available'].includes(quest.json.claimState), 'quest claim state is explicit');
  if (first.settlement?.state !== 'finalized') {
    assert.notEqual(quest.json.claimState, 'winner_available', 'winner reward remains locked before oracle finality');
  }
} else {
  console.warn('No live CupHub fixtures available; skipped action-plan and fantasy-quest fixture assertions.');
}

console.log('cup track proof checks passed');
