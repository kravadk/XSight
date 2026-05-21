import assert from 'node:assert/strict';
import { join } from 'node:path';

process.env.CUP_SETTLEMENT_LOG_PATH = join(process.cwd(), '..', 'data', 'test-cup-settlement-log.json');

const {
  clearCupSettlementLog,
  listCupSettlementLog,
  recordCupSettlementTx,
} = await import('../src/services/cupSettlementLog.js');

clearCupSettlementLog();

recordCupSettlementTx({
  matchId: 'xcup-bra-fra',
  action: 'proposeResult',
  outcome: 'HOME',
  txHash: '0xabc',
  explorerUrl: 'https://example.com/tx/0xabc',
  signer: '0x0000000000000000000000000000000000000001',
});

recordCupSettlementTx({
  matchId: 'xcup-usa-mex',
  action: 'emergencyFinalize',
  outcome: 'DRAW',
  txHash: '0xdef',
  explorerUrl: 'https://example.com/tx/0xdef',
  signer: '0x0000000000000000000000000000000000000001',
});

assert.equal(listCupSettlementLog().length, 2, 'all log entries are returned');
assert.equal(listCupSettlementLog('xcup-bra-fra').length, 1, 'filter by match id works');
assert.equal(listCupSettlementLog('xcup-bra-fra')[0]?.txHash, '0xabc', 'new entry preserves tx hash');
assert.equal(listCupSettlementLog()[0]?.txHash, '0xdef', 'newest entries appear first');

console.log('cup settlement log checks passed');
