/**
 * Quorum resolver — the autonomous bridge between CupHub multi-source ingestion and
 * the deployed CupOracleV2 (DESIGN §2.1 Flow F).
 *
 * It is idempotent and driven entirely by REAL on-chain state (`readCupOracleMatch`):
 * a finished match with a 2-of-N source quorum flows
 *   register -> propose -> (challenge window) -> finalize,
 * one action per match per pass so every tx is independently observable on-chain.
 *
 * NO MOCKS — real sports feeds via `cupData`, real CupOracleV2, real signer.
 *
 * SAFETY: `resolveCupMatches({ dryRun:false })` sends real OKB-spending transactions.
 * The scheduler only runs it non-dry when CUP_RESOLVER_ENABLED=true.
 */
import { env } from '../config/env.js';
import { getCupFeed, type CupMatch, type CupOutcome } from './cupData.js';
import {
  cupOracleMetadata,
  finalizeCupOracleResult,
  proposeCupOracleResult,
  readCupChallengeWindow,
  readCupOracleMatch,
  registerCupOracleMatch,
  type CupOracleOutcome,
} from './cupOracleContract.js';

export type ResolverAction =
  | 'skip' // match not finished
  | 'hold' // finished but quorum unavailable / conflicting / challenged / oracle missing
  | 'register' // needs registerMatch on-chain
  | 'propose' // registered (Open) — needs proposeResult
  | 'wait_challenge' // proposed — challenge window still open
  | 'finalize' // proposed — challenge window elapsed, ready to finalize
  | 'done'; // finalized on-chain

export interface ResolverStep {
  matchId: string;
  label: string;
  action: ResolverAction;
  outcome: CupOutcome | null;
  reason: string;
  onchainState: number | null; // 0 Open · 1 Proposed · 2 Challenged · 3 Finalized · null = unregistered
  challengeEndsAt: number | null;
  executed: { txHash: string; explorerUrl: string } | null;
  error: string | null;
}

export interface ResolverReport {
  generatedAt: string;
  dryRun: boolean;
  oracleDeployed: boolean;
  writeEnabled: boolean;
  resolverEnabled: boolean;
  steps: ResolverStep[];
  executed: number;
  summary: string;
}

const ORACLE_STATE = { OPEN: 0, PROPOSED: 1, CHALLENGED: 2, FINALIZED: 3 } as const;
const ACTIONABLE: ResolverAction[] = ['register', 'propose', 'finalize'];

let lastReport: ResolverReport | null = null;

function step(
  match: CupMatch,
  partial: Partial<ResolverStep> & { action: ResolverAction; reason: string },
): ResolverStep {
  return {
    matchId: match.id,
    label: `${match.home.code} v ${match.away.code}`,
    outcome: null,
    onchainState: null,
    challengeEndsAt: null,
    executed: null,
    error: null,
    ...partial,
  };
}

async function planMatch(match: CupMatch, challengeWindow: number, nowSec: number): Promise<ResolverStep> {
  if (match.status !== 'final') {
    return step(match, { action: 'skip', reason: `match is ${match.status}, not final` });
  }

  const quorum = match.settlement.sourceQuorum;
  if (quorum.status !== 'settlement_ready' || !quorum.outcome) {
    return step(match, { action: 'hold', reason: quorum.reason });
  }
  const outcome = quorum.outcome;

  const onchain = await readCupOracleMatch(match.id);
  if (onchain === null) {
    return step(match, { action: 'hold', outcome, reason: 'CupOracleV2 not deployed — set CUP_ORACLE_V2_ADDRESS' });
  }
  if (!onchain.registered) {
    return step(match, {
      action: 'register',
      outcome,
      reason: 'finished + 2-of-N quorum ready; not yet registered on CupOracleV2',
    });
  }

  const state = 'state' in onchain ? Number(onchain.state) : ORACLE_STATE.OPEN;
  const endsAt = 'challengeEndsAt' in onchain ? Number(onchain.challengeEndsAt) : 0;

  if (state === ORACLE_STATE.FINALIZED) {
    return step(match, { action: 'done', outcome, onchainState: state, reason: 'already finalized on-chain' });
  }
  if (state === ORACLE_STATE.CHALLENGED) {
    return step(match, {
      action: 'hold',
      outcome,
      onchainState: state,
      reason: 'result challenged on-chain — manual review required before finalize',
    });
  }
  if (state === ORACLE_STATE.PROPOSED) {
    if (nowSec < endsAt) {
      return step(match, {
        action: 'wait_challenge',
        outcome,
        onchainState: state,
        challengeEndsAt: endsAt,
        reason: `challenge window open until ${new Date(endsAt * 1000).toISOString()}`,
      });
    }
    return step(match, {
      action: 'finalize',
      outcome,
      onchainState: state,
      challengeEndsAt: endsAt,
      reason: 'challenge window elapsed — ready to finalize',
    });
  }

  // state === Open: registered, awaiting a proposal.
  return step(match, {
    action: 'propose',
    outcome,
    onchainState: state,
    reason: `registered (challengeWindow ${challengeWindow}s); ready to propose ${outcome}`,
  });
}

/** Compute the next action for every fixture in the live feed. Reads only — no txs. */
export async function planResolution(): Promise<ResolverStep[]> {
  const feed = await getCupFeed();
  const challengeWindow = await readCupChallengeWindow();
  const nowSec = Math.floor(Date.now() / 1000);
  const steps: ResolverStep[] = [];
  for (const match of feed.fixtures) {
    try {
      steps.push(await planMatch(match, challengeWindow, nowSec));
    } catch (err) {
      steps.push(
        step(match, {
          action: 'hold',
          reason: 'planning failed',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
  return steps;
}

function summarize(steps: ResolverStep[], dryRun: boolean, executed: number): string {
  const counts = new Map<ResolverAction, number>();
  for (const s of steps) counts.set(s.action, (counts.get(s.action) ?? 0) + 1);
  const parts = [...counts.entries()].map(([action, n]) => `${action}:${n}`);
  const errors = steps.filter((s) => s.error).length;
  return `${steps.length} fixtures [${parts.join(' ')}]${dryRun ? ' (dry-run)' : ` executed:${executed}`}${errors ? ` errors:${errors}` : ''}`;
}

/**
 * Run one resolver pass. With `dryRun` the plan is computed but no tx is sent.
 * Errors are recorded per step — one failing match never blocks the others.
 */
export async function resolveCupMatches(opts: { dryRun: boolean }): Promise<ResolverReport> {
  const { dryRun } = opts;
  const meta = cupOracleMetadata();
  const steps = await planResolution();
  let executed = 0;

  if (!dryRun) {
    for (const s of steps) {
      if (!ACTIONABLE.includes(s.action)) continue;
      try {
        const result =
          s.action === 'register'
            ? await registerCupOracleMatch(s.matchId)
            : s.action === 'propose'
              ? await proposeCupOracleResult(s.matchId, s.outcome as CupOracleOutcome)
              : await finalizeCupOracleResult(s.matchId);
        s.executed = { txHash: result.txHash, explorerUrl: result.explorerUrl };
        executed += 1;
      } catch (err) {
        s.error = err instanceof Error ? err.message : String(err);
      }
    }
  }

  const report: ResolverReport = {
    generatedAt: new Date().toISOString(),
    dryRun,
    oracleDeployed: Boolean(meta.address),
    writeEnabled: env.cupWriteApiEnabled,
    resolverEnabled: env.cupResolverEnabled,
    steps,
    executed,
    summary: summarize(steps, dryRun, executed),
  };
  lastReport = report;
  return report;
}

/** Resolver config snapshot + last pass — surfaced at GET /api/cup/resolver. */
export function getResolverStatus() {
  return {
    enabled: env.cupResolverEnabled,
    writeEnabled: env.cupWriteApiEnabled,
    oracleDeployed: Boolean(cupOracleMetadata().address),
    intervalMs: env.cupResolverIntervalMs,
    lastReport,
  };
}
