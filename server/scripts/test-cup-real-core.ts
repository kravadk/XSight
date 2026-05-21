import assert from 'node:assert/strict';
import { buildCupAdapterStatus } from '../src/services/cupAdapters.js';
import {
  evaluateSettlementQuorum,
  mergeProviderMatches,
  normalizeEspnScoreboard,
  type CupSourceReceipt,
} from '../src/services/cupData.js';
import { buildX402Decision } from '../src/middleware/x402.js';

const adapters = buildCupAdapterStatus({
  footballDataApiKey: '',
  theSportsDbApiKey: '',
  espnEnabled: true,
  demoMode: false,
});

assert.equal(adapters.mode, 'live-source-quorum-missing', 'production core must not call one live source a demo mode');
assert.equal(adapters.adapters.some((adapter) => adapter.id === 'xsight-seed'), false, 'seed adapter is hidden unless demo mode is explicit');
assert.equal(adapters.readyForProductionSettlement, false, 'settlement requires source quorum');

const espnPayload = {
  events: [
    {
      id: '401756900',
      name: 'Brazil vs France',
      date: '2026-06-14T19:00Z',
      status: { type: { state: 'post', completed: true } },
      competitions: [
        {
          venue: { fullName: 'MetLife Stadium' },
          competitors: [
            { homeAway: 'home', score: '2', team: { abbreviation: 'BRA', displayName: 'Brazil' } },
            { homeAway: 'away', score: '1', team: { abbreviation: 'FRA', displayName: 'France' } },
          ],
        },
      ],
    },
  ],
};

const normalized = normalizeEspnScoreboard(espnPayload, 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
assert.equal(normalized.matches.length, 1, 'ESPN scoreboard normalizes real events');
assert.equal(normalized.matches[0]?.id, 'espn-401756900');
assert.equal(normalized.matches[0]?.status, 'final');
assert.deepEqual(normalized.matches[0]?.score, { home: 2, away: 1 });
assert.equal(normalized.receipts[0]?.provider, 'ESPN');

const receiptA: CupSourceReceipt = {
  provider: 'ESPN',
  url: 'https://espn.example/match',
  observedAt: '2026-06-14T22:00:00.000Z',
  payloadHash: '0xaaa',
  confidence: 0.7,
  outcome: 'HOME',
};
const receiptB: CupSourceReceipt = {
  provider: 'TheSportsDB',
  url: 'https://thesportsdb.example/match',
  observedAt: '2026-06-14T22:01:00.000Z',
  payloadHash: '0xbbb',
  confidence: 0.65,
  outcome: 'HOME',
};
const receiptC: CupSourceReceipt = {
  provider: 'football-data.org',
  url: 'https://football-data.example/match',
  observedAt: '2026-06-14T22:02:00.000Z',
  payloadHash: '0xccc',
  confidence: 0.65,
  outcome: 'AWAY',
};

assert.deepEqual(evaluateSettlementQuorum([receiptA, receiptB]), {
  status: 'settlement_ready',
  outcome: 'HOME',
  agreeingSources: 2,
  reason: '2 sources agree on HOME',
});
assert.equal(evaluateSettlementQuorum([receiptA, receiptC]).status, 'conflicting_sources', 'conflicting results block settlement');
assert.equal(evaluateSettlementQuorum([receiptA]).status, 'source_quorum_unavailable', 'one source is not enough');

const merged = mergeProviderMatches([
  {
    id: 'espn-final-1',
    stage: 'Brazil vs France',
    kickoffUtc: '2026-06-14T19:00:00.000Z',
    home: { code: 'BRA', name: 'Brazil', rating: 50, form: '' },
    away: { code: 'FRA', name: 'France', rating: 50, form: '' },
    venue: 'A',
    status: 'final',
    score: { home: 2, away: 1 },
    receipt: receiptA,
  },
  {
    id: 'thesportsdb-final-1',
    stage: 'Brazil v France',
    kickoffUtc: '2026-06-14T19:02:00.000Z',
    home: { code: 'BRA', name: 'Brazil', rating: 50, form: '' },
    away: { code: 'FRA', name: 'France', rating: 50, form: '' },
    venue: 'B',
    status: 'final',
    score: { home: 2, away: 1 },
    receipt: receiptB,
  },
]);

assert.equal(merged.length, 1, 'same teams and kickoff window merge into one canonical match');
assert.equal(merged[0]?.id, 'cup-bra-fra-2026-06-14t19-00');
assert.equal(merged[0]?.receipts.length, 2, 'merged match carries both provider receipts');
assert.equal(merged[0]?.settlement.sourceQuorum.status, 'settlement_ready', 'merged receipts can satisfy settlement quorum');
assert.equal(merged[0]?.settlement.proposedOutcome, 'HOME', 'merged quorum exposes canonical proposed outcome');

assert.equal(
  buildX402Decision({
    nodeEnv: 'production',
    allowDevBypass: false,
    header: 'dev-bypass',
    amount: '0.01',
    asset: 'USDT',
    network: 'xlayer-mainnet',
    payTo: '0x0000000000000000000000000000000000000001',
  }).ok,
  false,
  'production never accepts dev-bypass',
);
assert.equal(
  buildX402Decision({
    nodeEnv: 'development',
    allowDevBypass: false,
    header: 'dev-bypass',
    amount: '0.01',
    asset: 'USDT',
    network: 'xlayer-mainnet',
    payTo: '0x0000000000000000000000000000000000000001',
  }).ok,
  false,
  'dev-bypass requires explicit ALLOW_DEV_BYPASS=true',
);
assert.equal(
  buildX402Decision({
    nodeEnv: 'production',
    allowDevBypass: false,
    header: Buffer.from(JSON.stringify({ payTo: '0x0000000000000000000000000000000000000001', amount: '0.01', asset: 'USDT', network: 'xlayer-mainnet' })).toString('base64'),
    amount: '0.01',
    asset: 'USDT',
    network: 'xlayer-mainnet',
    payTo: '0x0000000000000000000000000000000000000001',
  }).error,
  'payment_tx_required',
  'production requires a real payment transaction hash, not base64-only proof',
);

console.log('real CupOS core checks passed');
