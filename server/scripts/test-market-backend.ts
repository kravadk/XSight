/**
 * Dry-run verification for the market backend (Plan 3).
 *
 * Exercises the read path end to end: ParimutuelMarket metadata, indexer status, and
 * `listMarkets()` (live CupHub fixtures joined with indexed on-chain state). Sends NO
 * transactions and does not start the indexer loop.
 *
 * Run: npm --prefix server run test:market
 */
import 'dotenv/config';
import { parimutuelMetadata } from '../src/services/parimutuelContract.js';
import { getIndexerStatus } from '../src/services/marketIndexer.js';
import { listMarkets } from '../src/services/marketService.js';

const meta = parimutuelMetadata();
console.log(`[market-test] ParimutuelMarket: ${meta.address ?? 'NOT DEPLOYED'} (${meta.status})`);
console.log(`[market-test] indexer: ${JSON.stringify(getIndexerStatus())}\n`);

const markets = await listMarkets();
console.log(`[market-test] ${markets.length} markets from the live fixture feed:\n`);
for (const m of markets.slice(0, 25)) {
  console.log(
    `  ${`${m.home.code} v ${m.away.code}`.padEnd(18)} ${m.marketStatus.padEnd(22)} ` +
      `pool=${m.pools.total} kickoff=${m.kickoffUtc}`,
  );
}
if (markets.length === 0) console.log('  (no fixtures in the live feed right now)');

console.log('\n[market-test] done — read-only, no transactions sent.');
