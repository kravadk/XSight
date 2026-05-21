/**
 * Dry-run verification for the Hermes AI pundit (Plan 5).
 *
 * Prints the pundit profile + picks for a few upcoming fixtures. With ANTHROPIC_API_KEY
 * it exercises the real Claude API; without one it shows the honest heuristic fallback.
 *
 * Run: npm --prefix server run test:pundit
 */
import 'dotenv/config';
import { getPunditProfile, listPunditPicks } from '../src/services/punditService.js';

const profile = getPunditProfile();
console.log(`[pundit-test] ${profile.name} — ${profile.role}`);
console.log(`[pundit-test] mode=${profile.mode}${profile.model ? ` · ${profile.model}` : ''}\n`);

const picks = await listPunditPicks(5);
console.log(`[pundit-test] ${picks.length} picks:\n`);
for (const p of picks) {
  console.log(`  ${p.label.padEnd(14)} ${p.pick.padEnd(5)} conv ${p.conviction.toFixed(2)}  [${p.source}]`);
  console.log(`  ${' '.repeat(14)} ${p.take}`);
}
if (picks.length === 0) console.log('  (no upcoming fixtures in the live feed right now)');

console.log('\n[pundit-test] done.');
