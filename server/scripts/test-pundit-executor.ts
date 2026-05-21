/**
 * Dry-run honest-state test for the pundit executor. Forces the contract-not-deployed
 * branch (regardless of the local .env) and asserts the executor stakes nothing and
 * reports an honest, non-success status — NO MOCKS.
 *
 * Run: npm --prefix server run test:pundit-exec
 */
import assert from 'node:assert/strict';

// Blank the market address BEFORE importing config/env.js so the executor takes the
// honest `contract_not_deployed` path. dotenv never overrides an already-set key.
process.env.PARIMUTUEL_MARKET_ADDRESS = '';

const { executePunditPick } = await import('../src/services/punditExecutor.js');
const { claimAllowed } = await import('../src/services/punditCompletionGuard.js');

const exec = await executePunditPick('cup-bra-cro-demo');

assert.equal(exec.status, 'contract_not_deployed', 'no market address => honest not-deployed status');
assert.equal(exec.txHash, null, 'no tx attempted');
assert.equal(exec.verified, false, 'nothing to verify');
assert.equal(exec.amount, '0', 'nothing staked');
assert.equal(
  claimAllowed({ executed: false, verified: exec.verified, txHash: exec.txHash }),
  false,
  'a non-executed result can never be reported as a success',
);

console.log('pundit executor honest-state checks passed');
