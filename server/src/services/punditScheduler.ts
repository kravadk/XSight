/**
 * Autonomous AI pundit loop (DESIGN §2.1 Flow D). On a timer it picks the soonest
 * upcoming fixture the pundit has not acted on, runs `executePunditPick` (research →
 * on-chain stake → completion guard), and announces a verified stake on X.
 *
 * OFF by default — `startPunditAutoStake` returns immediately unless
 * PUNDIT_AUTOSTAKE_ENABLED=true. The pure `pickNextFixture` core is unit-tested.
 */
import { env } from '../config/env.js';
import { listCupMatches } from './cupData.js';
import { executePunditPick } from './punditExecutor.js';
import { listPunditExecutions } from './punditExecutionLog.js';
import { announceExecution } from './xPoster.js';

/** The subset of a fixture the scheduler needs. */
export interface SchedulableFixture {
  id: string;
  status: string;
  kickoffUtc: string;
}

/** Pure: the soonest scheduled fixture not in `done`, or null. */
export function pickNextFixture(fixtures: SchedulableFixture[], done: Set<string>): string | null {
  const candidates = fixtures
    .filter((f) => f.status === 'scheduled' && !done.has(f.id))
    .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));
  return candidates[0]?.id ?? null;
}

let timer: NodeJS.Timeout | null = null;

/** Run one autonomous tick: pick a fixture, stake, announce a verified stake. */
async function tick(): Promise<void> {
  try {
    const matches = await listCupMatches();
    const done = new Set(listPunditExecutions().map((e) => e.matchId));
    const matchId = pickNextFixture(matches, done);
    if (!matchId) return;
    const execution = await executePunditPick(matchId);
    if (execution.status === 'staked' && execution.verified) {
      await announceExecution(execution);
    }
  } catch (err) {
    console.warn('[pundit-cron] tick failed:', err instanceof Error ? err.message : err);
  }
}

/** Start the autonomous loop. No-op unless PUNDIT_AUTOSTAKE_ENABLED=true. */
export function startPunditAutoStake(): void {
  if (!env.punditAutoStakeEnabled) {
    console.log('[pundit-cron] disabled (set PUNDIT_AUTOSTAKE_ENABLED=true to enable)');
    return;
  }
  if (timer) return;
  console.log(`[pundit-cron] enabled — every ${Math.round(env.punditAutoStakeIntervalMs / 1000)}s`);
  timer = setInterval(() => void tick(), env.punditAutoStakeIntervalMs);
}
