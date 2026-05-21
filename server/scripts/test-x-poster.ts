/**
 * TDD test for the pure tweet composer — fully offline.
 *
 * Run: npm --prefix server run test:x-poster
 */
import assert from 'node:assert/strict';
import { composeTweet } from '../src/services/xPoster.js';
import type { PunditExecution } from '../src/services/punditExecutor.js';

const execution: PunditExecution = {
  matchId: 'cup-bra-cro',
  marketId: '0xmarket',
  label: 'BRA v CRO',
  status: 'staked',
  pick: 'HOME',
  conviction: 0.71,
  outcome: 1,
  amount: '500000',
  amountDisplay: '0.5 USDT',
  txHash: '0xabc',
  explorerUrl: 'https://www.okx.com/web3/explorer/xlayer/tx/0xabc',
  verified: true,
  reason: 'staked_event_confirmed',
  executedAt: '2026-05-21T00:00:00.000Z',
};

const tweet = composeTweet(execution);
assert.ok(tweet.includes('BRA v CRO'), 'tweet names the fixture');
assert.ok(tweet.includes('0.5 USDT'), 'tweet states the stake size');
assert.ok(tweet.includes('HOME'), 'tweet states the pick');
assert.ok(tweet.includes('71%'), 'tweet states the conviction percentage');
assert.ok(tweet.includes(execution.explorerUrl!), 'tweet links the on-chain proof');
assert.ok(tweet.length <= 280, `tweet is within the 280-char limit (was ${tweet.length})`);

console.log('x-poster checks passed');
