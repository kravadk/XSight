/**
 * Quorum resolver — the autonomous bridge between CupHub multi-source ingestion and
 * the deployed CupOracle (V2, or the bonded V3 once CUP_ORACLE_V3_ADDRESS is set).
 *
 * It is idempotent and driven entirely by REAL on-chain state (`readCupOracleMatch`):
 * a finished match with a 2-of-N source quorum flows
 *   register -> propose -> (challenge window) -> finalize,
 * one action per match per pass so every tx is independently observable on-chain.
 *
 * NO MOCKS — real sports feeds via `cupData`, real on-chain CupOracle, real signer.
 *
 * SAFETY: `resolveCupMatches({ dryRun:false })` sends real OKB-spending transactions.
 * The scheduler only runs it non-dry when CUP_RESOLVER_ENABLED=true.
 */
import { env } from '../config/env.js';
import { getCupFeed, isKnockoutStage, type CupMatch, type CupOutcome } from './cupData.js';
import {
  cupOracleMetadata,
  finalizeCupOracleResult,
  proposeCupOracleResult,
  readCupChallengeWindow,
  readCupOracleMatch,
  registerCupOracleMatch,
  type CupOracleOutcome,
} from './cupOracleContract.js';
import { MARKET_TYPES, MARKET_TYPE_IDS, type MarketTypeId } from './marketTypes.js';
import { encodeMarketKey } from '../utils/cupIds.js';

/** Map a contract outcome index (1/2/3) to the CupOracle enum proxy the oracle stores. */
const INDEX_TO_OUTCOME: Record<number, CupOutcome> = { 1: 'HOME', 2: 'DRAW', 3: 'AWAY' };

/**
 * The winning outcome + label for one (fixture × market type), or null if it cannot be
 * derived yet. 1X2 uses the multi-source quorum's agreed outcome; Over/Under and BTTS
 * derive from the agreed final score. The oracle only ever stores the index 1/2/3 —
 * the human label belongs to the market type.
 */
function deriveMarketOutcome(
  match: CupMatch,
  marketType: MarketTypeId,
): { outcome: CupOutcome; label: string } | null {
  const def = MARKET_TYPES[marketType];
  if (marketType === '1X2') {
    const q = match.settlement.sourceQuorum;
    if (q.status !== 'settlement_ready' || !q.outcome) return null;
    // Backstop: a knockout fixture cannot end in a draw. If the quorum still agrees
    // on DRAW the sources only carry the regulation score — hold for operator
    // settlement rather than auto-proposing a wrong result.
    if (q.outcome === 'DRAW' && isKnockoutStage(match.stage)) return null;
    const idx = q.outcome === 'HOME' ? 1 : q.outcome === 'AWAY' ? 3 : 2;
    return { outcome: q.outcome, label: def.outcomes[idx - 1] };
  }
  if (!match.score) return null;
  const idx = def.deriveOutcome(match.score);
  return { outcome: INDEX_TO_OUTCOME[idx], label: def.outcomes[idx - 1] };
}

export type ResolverAction =
  | 'skip' // match not finished
  | 'hold' // finished but quorum unavailable / conflicting / challenged / oracle missing
  | 'register' // needs registerMatch on-chain
  | 'propose' // registered (Open) — needs proposeResult
  | 'wait_challenge' // proposed — challenge window still open
  | 'finalize' // proposed — challenge window elapsed, ready to finalize
  | 'done'; // finalized on-chain

export interface ResolverStep {
  matchId: string; // the (fixture × market type) composite key — distinct on-chain record
  marketType: string;
  label: string;
  action: ResolverAction;
  outcome: CupOutcome | null; // contract outcome 1/2/3 as the oracle enum proxy
  outcomeLabel: string | null; // human label for this market type's outcome
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
  marketType: MarketTypeId,
  partial: Partial<ResolverStep> & { action: ResolverAction; reason: string },
): ResolverStep {
  return {
    matchId: encodeMarketKey(match.id, marketType),
    marketType,
    label: `${match.home.code} v ${match.away.code} · ${MARKET_TYPES[marketType].shortLabel}`,
    outcome: null,
    outcomeLabel: null,
    onchainState: null,
    challengeEndsAt: null,
    executed: null,
    error: null,
    ...partial,
  };
}

async function planMarket(
  match: CupMatch,
  marketType: MarketTypeId,
  challengeWindow: number,
  nowSec: number,
): Promise<ResolverStep> {
  if (match.status !== 'final') {
    return step(match, marketType, { action: 'skip', reason: `match is ${match.status}, not final` });
  }

  const quorum = match.settlement.sourceQuorum;
  if (quorum.status !== 'settlement_ready') {
    return step(match, marketType, { action: 'hold', reason: quorum.reason });
  }
  const derived = deriveMarketOutcome(match, marketType);
  if (!derived) {
    return step(match, marketType, {
      action: 'hold',
      reason: 'agreed final score unavailable for this market type',
    });
  }
  const { outcome, label } = derived;
  const marketKey = encodeMarketKey(match.id, marketType);

  const onchain = await readCupOracleMatch(marketKey);
  if (onchain === null) {
    return step(match, marketType, {
      action: 'hold',
      outcome,
      outcomeLabel: label,
      reason: 'CupOracle not deployed — set CUP_ORACLE_V2_ADDRESS / CUP_ORACLE_V3_ADDRESS',
    });
  }
  if (!onchain.registered) {
    return step(match, marketType, {
      action: 'register',
      outcome,
      outcomeLabel: label,
      reason: 'finished + 2-of-N quorum ready; not yet registered on-chain',
    });
  }

  const state = 'state' in onchain ? Number(onchain.state) : ORACLE_STATE.OPEN;
  const endsAt = 'challengeEndsAt' in onchain ? Number(onchain.challengeEndsAt) : 0;

  if (state === ORACLE_STATE.FINALIZED) {
    return step(match, marketType, {
      action: 'done',
      outcome,
      outcomeLabel: label,
      onchainState: state,
      reason: 'already finalized on-chain',
    });
  }
  if (state === ORACLE_STATE.CHALLENGED) {
    return step(match, marketType, {
      action: 'hold',
      outcome,
      outcomeLabel: label,
      onchainState: state,
      reason: cupOracleMetadata().bonded
        ? 'result challenged on-chain — arbiter ruling pending (resolveChallenge)'
        : 'result challenged on-chain — manual review required before finalize',
    });
  }
  if (state === ORACLE_STATE.PROPOSED) {
    if (nowSec < endsAt) {
      return step(match, marketType, {
        action: 'wait_challenge',
        outcome,
        outcomeLabel: label,
        onchainState: state,
        challengeEndsAt: endsAt,
        reason: `challenge window open until ${new Date(endsAt * 1000).toISOString()}`,
      });
    }
    return step(match, marketType, {
      action: 'finalize',
      outcome,
      outcomeLabel: label,
      onchainState: state,
      challengeEndsAt: endsAt,
      reason: 'challenge window elapsed — ready to finalize',
    });
  }

  // state === Open: registered, awaiting a proposal.
  return step(match, marketType, {
    action: 'propose',
    outcome,
    outcomeLabel: label,
    onchainState: state,
    reason: `registered (challengeWindow ${challengeWindow}s); ready to propose ${label}`,
  });
}

/** Compute the next action for every (fixture × market type) in the live feed. Reads only. */
export async function planResolution(): Promise<ResolverStep[]> {
  const feed = await getCupFeed();
  const challengeWindow = await readCupChallengeWindow();
  const nowSec = Math.floor(Date.now() / 1000);
  const steps: ResolverStep[] = [];
  for (const match of feed.fixtures) {
    for (const marketType of MARKET_TYPE_IDS) {
      try {
        steps.push(await planMarket(match, marketType, challengeWindow, nowSec));
      } catch (err) {
        steps.push(
          step(match, marketType, {
            action: 'hold',
            reason: 'planning failed',
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }
  }
  return steps;
}

function summarize(steps: ResolverStep[], dryRun: boolean, executed: number): string {
  const counts = new Map<ResolverAction, number>();
  for (const s of steps) counts.set(s.action, (counts.get(s.action) ?? 0) + 1);
  const parts = [...counts.entries()].map(([action, n]) => `${action}:${n}`);
  const errors = steps.filter((s) => s.error).length;
  return `${steps.length} markets [${parts.join(' ')}]${dryRun ? ' (dry-run)' : ` executed:${executed}`}${errors ? ` errors:${errors}` : ''}`;
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
