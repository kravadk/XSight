import assert from 'node:assert/strict';
import { buildCupAdapterStatus } from '../src/services/cupAdapters.js';

const empty = buildCupAdapterStatus({
  footballDataApiKey: '',
  theSportsDbApiKey: '',
  espnEnabled: true,
  demoMode: false,
});

assert.equal(empty.mode, 'live-source-quorum-missing', 'one public adapter is source-quorum missing');
assert.equal(empty.readyForProductionSettlement, false, 'production settlement requires more than one live source');
assert.equal(empty.adapters.find((item) => item.id === 'espn')?.configured, true, 'ESPN public adapter is configured when enabled');
assert.equal(empty.adapters.find((item) => item.id === 'football-data')?.configured, false, 'football-data waits for API key');
assert.equal(empty.adapters.some((item) => item.id === 'xsight-seed'), false, 'seed adapter is hidden unless demo mode is explicit');

const live = buildCupAdapterStatus({
  footballDataApiKey: 'fd-key',
  theSportsDbApiKey: 'tsdb-key',
  espnEnabled: true,
  demoMode: false,
});

assert.equal(live.mode, 'live-source-quorum-ready', 'two or more configured adapters are live-ready');
assert.equal(live.readyForProductionSettlement, true, 'configured adapters can support production settlement');
assert.equal(live.liveSources, 3, 'live source count is tracked');

console.log('cup adapter checks passed');
