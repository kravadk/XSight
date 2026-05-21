/**
 * TDD unit test for the pundit completion guard. Pure logic, fully offline:
 * builds synthetic ParimutuelMarket receipts and asserts the guard's verdict.
 *
 * Run: npm --prefix server run test:pundit-guard
 */
import assert from 'node:assert/strict';
import { Interface } from 'ethers';
import { PARIMUTUEL_ABI } from '../src/services/parimutuelContract.js';
import { verifyStakeReceipt, claimAllowed, type StakeIntent } from '../src/services/punditCompletionGuard.js';

const iface = new Interface(PARIMUTUEL_ABI as unknown as string[]);
const stakedEvent = iface.getEvent('Staked')!;

const MARKET_ADDR = '0x0000000000000000000000000000000000005a1e';
const OTHER_ADDR = '0x000000000000000000000000000000000000c0de';
const MARKET_ID = '0x' + '11'.repeat(32);
const STAKER = '0x000000000000000000000000000000000000beef';
const OTHER = '0x000000000000000000000000000000000000dead';

function stakedLog(address: string, marketId: string, user: string, outcome: number, amount: bigint) {
  const { data, topics } = iface.encodeEventLog(stakedEvent, [marketId, user, outcome, amount]);
  return { address, topics, data };
}

const intent: StakeIntent = {
  marketAddress: MARKET_ADDR,
  marketId: MARKET_ID,
  staker: STAKER,
  outcome: 1,
  amount: '500000',
};

// 1. happy path — a matching Staked event from the market verifies
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(MARKET_ADDR, MARKET_ID, STAKER, 1, 500000n)] });
  assert.equal(r.verified, true, 'matching Staked event verifies');
  assert.equal(r.reason, 'staked_event_confirmed');
}

// 2. tx mined but NO Staked event => not verified
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [] });
  assert.equal(r.verified, false, 'no event => not verified');
  assert.equal(r.reason, 'no_staked_event');
}

// 3. reverted tx => not verified even if a log is present
{
  const r = verifyStakeReceipt(intent, { status: 0, logs: [stakedLog(MARKET_ADDR, MARKET_ID, STAKER, 1, 500000n)] });
  assert.equal(r.verified, false, 'reverted tx => not verified');
  assert.equal(r.reason, 'tx_reverted');
}

// 4. wrong outcome => not verified, specific reason
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(MARKET_ADDR, MARKET_ID, STAKER, 3, 500000n)] });
  assert.equal(r.verified, false, 'wrong outcome => not verified');
  assert.equal(r.reason, 'outcome_mismatch');
}

// 5. wrong amount => not verified, specific reason
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(MARKET_ADDR, MARKET_ID, STAKER, 1, 999n)] });
  assert.equal(r.verified, false, 'wrong amount => not verified');
  assert.equal(r.reason, 'amount_mismatch');
}

// 6. a Staked event for a different staker is ignored
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(MARKET_ADDR, MARKET_ID, OTHER, 1, 500000n)] });
  assert.equal(r.verified, false, 'other staker ignored => not verified');
  assert.equal(r.reason, 'no_staked_event');
}

// 7. a foreign (undecodable) log from the market does not crash the guard
{
  const foreign = { address: MARKET_ADDR, topics: ['0x' + 'ab'.repeat(32)], data: '0x' };
  const r = verifyStakeReceipt(intent, { status: 1, logs: [foreign, stakedLog(MARKET_ADDR, MARKET_ID, STAKER, 1, 500000n)] });
  assert.equal(r.verified, true, 'foreign log skipped, real event still found');
}

// 8. no receipt at all => not verified
{
  const r = verifyStakeReceipt(intent, null);
  assert.equal(r.verified, false, 'null receipt => not verified');
  assert.equal(r.reason, 'no_receipt');
}

// 9. a perfectly-matching Staked event from a DIFFERENT contract is rejected
{
  const r = verifyStakeReceipt(intent, { status: 1, logs: [stakedLog(OTHER_ADDR, MARKET_ID, STAKER, 1, 500000n)] });
  assert.equal(r.verified, false, 'Staked event from another contract => not verified');
  assert.equal(r.reason, 'no_staked_event');
}

// 10. claimAllowed gate — only executed + verified + txHash may be claimed a success
assert.equal(claimAllowed({ executed: true, verified: true, txHash: '0xabc' }), true);
assert.equal(claimAllowed({ executed: true, verified: false, txHash: '0xabc' }), false, 'unverified blocks claim');
assert.equal(claimAllowed({ executed: true, verified: true, txHash: null }), false, 'no txHash blocks claim');
assert.equal(claimAllowed({ executed: false, verified: false, txHash: null }), false, 'not executed blocks claim');

console.log('pundit completion guard checks passed');
