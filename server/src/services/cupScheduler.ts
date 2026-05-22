/**
 * CupHub scheduler — periodic autonomous oracle resolution.
 *
 * OFF by default. The loop only runs when CUP_RESOLVER_ENABLED=true; otherwise the
 * resolver stays dry-run-only (invoke it manually via the API or test script).
 * Enabling it makes the server send real OKB-spending txs on the CupOracle.
 */
import { env } from '../config/env.js';
import { resolveCupMatches } from './quorumResolver.js';

const FIRST_TICK_DELAY_MS = 10_000; // let the server finish booting before the first pass
const MIN_INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;

async function tick(): Promise<void> {
  try {
    const report = await resolveCupMatches({ dryRun: false });
    console.log(`[cup-resolver] ${report.summary}`);
    for (const s of report.steps) {
      if (s.executed) console.log(`[cup-resolver]   ${s.label} ${s.action} -> ${s.executed.txHash}`);
      if (s.error) console.warn(`[cup-resolver]   ${s.label} ${s.action} failed: ${s.error}`);
    }
  } catch (err) {
    // never let a bad pass crash the process
    console.warn('[cup-resolver] pass failed:', err instanceof Error ? err.message : err);
  }
}

export function startQuorumResolver(): void {
  if (timer) return;
  if (!env.cupResolverEnabled) {
    console.log('[cup-resolver] disabled (CUP_RESOLVER_ENABLED!=true) — dry-run only via /api/cup/resolver/run');
    return;
  }
  const intervalMs =
    Number.isFinite(env.cupResolverIntervalMs) && env.cupResolverIntervalMs >= MIN_INTERVAL_MS
      ? env.cupResolverIntervalMs
      : 300_000;
  console.log(`[cup-resolver] enabled — autonomous pass every ${Math.round(intervalMs / 1000)}s`);
  setTimeout(() => {
    void tick();
    timer = setInterval(() => void tick(), intervalMs);
  }, FIRST_TICK_DELAY_MS);
}

export function stopQuorumResolver(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
