/**
 * Dry-run verification for the quorum resolver (Plan 2).
 *
 * Exercises the REAL pipeline read-side end to end: live sports feeds (cupData) +
 * real CupOracleV2 on-chain state. Sends NO transactions.
 *
 * Run: npm --prefix server run test:cup-resolver
 */
import 'dotenv/config';
import { cupOracleMetadata } from '../src/services/cupOracleContract.js';
import { resolveCupMatches } from '../src/services/quorumResolver.js';

const meta = cupOracleMetadata();
console.log(`[resolver-test] CupOracleV2: ${meta.address ?? 'NOT DEPLOYED'} (${meta.status})`);
console.log(`[resolver-test] CUP_RESOLVER_ENABLED=${process.env.CUP_RESOLVER_ENABLED ?? 'false'} · running dry-run\n`);

const report = await resolveCupMatches({ dryRun: true });
console.log(`[resolver-test] ${report.summary}\n`);

for (const s of report.steps) {
  const state = s.onchainState === null ? 'unregistered' : `onchain-state=${s.onchainState}`;
  const out = s.outcome ? ` outcome=${s.outcome}` : '';
  console.log(`  ${s.action.padEnd(15)} ${s.label.padEnd(18)} ${state}${out}`);
  console.log(`  ${' '.repeat(15)} ${s.reason}`);
  if (s.error) console.log(`  ${' '.repeat(15)} ERROR: ${s.error}`);
}
if (report.steps.length === 0) {
  console.log('  (no fixtures in the live feed — nothing to resolve right now)');
}

console.log('\n[resolver-test] dry-run complete — no transactions were sent.');
