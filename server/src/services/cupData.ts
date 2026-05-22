import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
import { recordActivity } from './activityTracker.js';
import { persistCupMatches } from './cupPersistence.js';
import { getFanScore } from './cupReputation.js';

export type CupMatchStatus = 'scheduled' | 'live' | 'final' | 'proposed' | 'challenged' | 'settled';
export type CupOutcome = 'HOME' | 'DRAW' | 'AWAY';
export type CupSourceStatus =
  | 'fixture_available'
  | 'live'
  | 'source_quorum_unavailable'
  | 'provider_rate_limited'
  | 'conflicting_sources'
  | 'settlement_ready'
  | 'demo_dev_only';

export interface CupSourceReceipt {
  provider: 'football-data.org' | 'TheSportsDB' | 'ESPN' | 'operator-attestation' | 'XSight seed';
  url: string;
  observedAt: string;
  payloadHash: string;
  confidence: number;
  outcome?: CupOutcome;
  normalizedPayload?: unknown;
}

export interface CupTeam {
  code: string;
  name: string;
  rating: number;
  form: string;
}

export interface CupMatch {
  id: string;
  stage: string;
  kickoffUtc: string;
  home: CupTeam;
  away: CupTeam;
  venue: string;
  status: CupMatchStatus;
  score?: { home: number; away: number };
  sourceMode: 'live-adapter' | 'live-source-quorum-missing' | 'demo-dev-only';
  sourceStatus: CupSourceStatus;
  receipts: CupSourceReceipt[];
  settlement: {
    state: 'not_open' | 'open' | 'proposed' | 'challenge_window' | 'finalized';
    proposedOutcome?: CupOutcome;
    finalOutcome?: CupOutcome;
    rulesHash: string;
    sourceHash: string;
    evidenceHash: string;
    evidenceUri: string;
    sourceQuorum: ReturnType<typeof evaluateSettlementQuorum>;
    challengeEndsAt?: string;
    chainId: number;
    explorer?: string;
  };
}

export interface CupFeed {
  sourceMode: CupMatch['sourceMode'];
  sourceStatus: CupSourceStatus;
  fixtures: CupMatch[];
  errors: Array<{ provider: string; status: CupSourceStatus; detail: string }>;
  generatedAt: string;
}

export interface CupAiEdge {
  matchId: string;
  fairProbability: { home: number; draw: number; away: number };
  confidence: number;
  edge: CupOutcome | 'NO_TRADE';
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  liquidityRisk: number;
  ambiguityRisk: number;
  manipulationRisk: number;
  suggestedSpreadBps: number;
  rationale: string[];
  sourceHash: string;
  generatedAt: string;
}

export interface CupFairOdds {
  matchId: string;
  source: 'xsight-fair-probability';
  market: '1X2';
  oddsFormat: 'decimal';
  fairProbability: { home: number; draw: number; away: number };
  decimalOdds: { home: number; draw: number; away: number };
  impliedMarginBps: number;
  confidence: number;
  risk: CupAiEdge['risk'];
  sourceHash: string;
  generatedAt: string;
}

export interface CupSettlementCheck {
  matchId: string;
  status: CupSourceStatus | 'settlement_challenged';
  canPropose: boolean;
  canFinalize: boolean;
  reason: string;
  sourceCount: number;
  agreeingSources: number;
  proposedOutcome?: CupOutcome;
  finalOutcome?: CupOutcome;
  challengeEndsAt?: string;
  settlement: CupMatch['settlement'];
  receipts: CupSourceReceipt[];
  generatedAt: string;
}

export interface CupActionPlan {
  matchId: string;
  mode: 'builder' | 'agent' | 'fan';
  primaryAction: string;
  guardrails: string[];
  xlayerActions: string[];
  apiCalls: string[];
  agentTrace: Array<{
    step: number;
    tool: string;
    input: Record<string, string>;
    output: string;
    status: 'ok' | 'blocked' | 'payment_required' | 'quorum_missing';
  }>;
  riskDecision: 'NO_TRADE' | 'WAIT' | 'HEDGE_PREP' | 'APPROVAL_REQUIRED';
  hedgeReadiness: 'ready_for_approval' | 'wait_for_oracle' | 'blocked';
  executionBlockedReason: string | null;
}

export interface CupTrackProof {
  tracks: Array<{
    track: 'AI Agent' | 'Prediction Infrastructure' | 'Trading' | 'Social' | 'NFT' | 'GameFi';
    status: 'ready' | 'strong' | 'needs proof' | 'stretch';
    judgeShouldSee: string;
    doNotClaim: string;
    proofs: Array<{ label: string; kind: 'ui' | 'api' | 'mcp' | 'code' | 'contract'; value: string }>;
  }>;
  generatedAt: string;
}

export interface CupFantasyQuest {
  matchId: string;
  wallet: string;
  recommendedQuest: string;
  teamStrengthSignal: {
    home: string;
    away: string;
    delta: number;
    favorite: string;
    confidence: number;
  };
  playerStatsStatus: 'live-adapter' | 'unavailable';
  fanPassGate: {
    status: 'eligible' | 'limited' | 'blocked' | 'manual_review';
    score: number;
    level: string;
    reason: string;
  };
  oracleFinalityRequired: boolean;
  claimState: 'locked' | 'basic_available' | 'winner_locked' | 'winner_available';
  sourceHash: string;
  generatedAt: string;
}

export interface CupTeamStrength {
  matchId: string;
  home: { code: string; strength: number; formScore: number; rating: number };
  away: { code: string; strength: number; formScore: number; rating: number };
  delta: number;
  confidence: number;
  generatedAt: string;
}

export interface CupSentiment {
  matchId: string;
  mode: 'live-input-only' | 'unavailable';
  home: { code: string; sentiment: number; volumeIndex: number };
  away: { code: string; sentiment: number; volumeIndex: number };
  drawNarrative: number;
  sourceHash: string;
  notes: string[];
  generatedAt: string;
}

export interface CupPlayerStat {
  playerId: string;
  name: string;
  team: string;
  role: 'keeper' | 'defender' | 'midfielder' | 'forward';
  formIndex: number;
  expectedImpact: number;
  minutesProjection: number;
  riskFlags: string[];
}

export interface CupPlayerStats {
  matchId: string;
  sourceMode: 'live-adapter' | 'unavailable';
  sourceHash: string;
  players: CupPlayerStat[];
  generatedAt: string;
}

export interface NormalizedProviderMatch {
  id: string;
  stage: string;
  kickoffUtc: string;
  home: CupTeam;
  away: CupTeam;
  venue: string;
  status: CupMatchStatus;
  score?: { home: number; away: number };
  receipt: CupSourceReceipt;
}

interface ProviderResult {
  matches: NormalizedProviderMatch[];
  receipts: CupSourceReceipt[];
}

const FETCH_TIMEOUT_MS = 8_000;
const CACHE_MS = 60_000;
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  argentina: 'ARG',
  australia: 'AUS',
  belgium: 'BEL',
  bosniaherzegovina: 'BIH',
  bosniah: 'BIH',
  brazil: 'BRA',
  canada: 'CAN',
  czechia: 'CZE',
  denmark: 'DEN',
  england: 'ENG',
  france: 'FRA',
  germany: 'GER',
  ghana: 'GHA',
  italy: 'ITA',
  japan: 'JPN',
  mexico: 'MEX',
  morocco: 'MAR',
  netherlands: 'NED',
  paraguay: 'PAR',
  portugal: 'POR',
  southafrica: 'RSA',
  southkorea: 'KOR',
  spain: 'ESP',
  switzerland: 'SUI',
  unitedstates: 'USA',
  usa: 'USA',
  uruguay: 'URU',
};
let cache: { expiresAt: number; feed: CupFeed } | null = null;

const SEEDED_MATCHES: Omit<CupMatch, 'receipts' | 'settlement' | 'sourceStatus'>[] = [
  {
    id: 'xcup-bra-fra',
    stage: 'dev-only seeded fixture',
    kickoffUtc: '2026-06-14T19:00:00.000Z',
    home: { code: 'BRA', name: 'Brazil', rating: 91, form: 'WWDLW' },
    away: { code: 'FRA', name: 'France', rating: 89, form: 'WDWWW' },
    venue: 'Development seed',
    status: 'scheduled',
    sourceMode: 'demo-dev-only',
  },
];

export function hashJson(input: unknown): string {
  return `0x${createHash('sha256').update(stableStringify(input)).digest('hex')}`;
}

export function normalizeEspnScoreboard(payload: unknown, url: string): ProviderResult {
  const root = payload as { events?: unknown[] };
  const events = Array.isArray(root.events) ? root.events : [];
  const matches = events.flatMap((event) => {
    const normalized = normalizeEspnEvent(event, url);
    return normalized ? [normalized] : [];
  });
  return { matches, receipts: matches.map((match) => match.receipt) };
}

export function evaluateSettlementQuorum(receipts: CupSourceReceipt[]): {
  status: 'settlement_ready' | 'source_quorum_unavailable' | 'conflicting_sources';
  outcome?: CupOutcome;
  agreeingSources: number;
  reason: string;
} {
  const outcomeReceipts = receipts.filter((receipt) => receipt.outcome);
  if (outcomeReceipts.length < 2) {
    return {
      status: 'source_quorum_unavailable',
      agreeingSources: outcomeReceipts.length,
      reason: `${outcomeReceipts.length} result source${outcomeReceipts.length === 1 ? '' : 's'} available; 2 required`,
    };
  }

  const counts = new Map<CupOutcome, number>();
  for (const receipt of outcomeReceipts) {
    counts.set(receipt.outcome as CupOutcome, (counts.get(receipt.outcome as CupOutcome) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [winner, count] = sorted[0] ?? [];
  if (!winner || !count || count < 2) {
    return {
      status: 'conflicting_sources',
      agreeingSources: count ?? 0,
      reason: 'No two sources agree on the same final outcome',
    };
  }

  return {
    status: 'settlement_ready',
    outcome: winner,
    agreeingSources: count,
    reason: `${count} sources agree on ${winner}`,
  };
}

export async function listCupMatches(): Promise<CupMatch[]> {
  const feed = await getCupFeed();
  recordActivity('cup.fixture', 'list fixtures');
  return feed.fixtures;
}

export async function getCupFeed(): Promise<CupFeed> {
  if (cache && cache.expiresAt > Date.now()) return cache.feed;

  const errors: CupFeed['errors'] = [];
  const providerResults = await Promise.allSettled([
    env.espnSourceEnabled ? fetchEspnMatches() : Promise.resolve({ matches: [], receipts: [] }),
    env.footballDataApiKey ? fetchFootballDataMatches() : Promise.resolve({ matches: [], receipts: [] }),
    env.theSportsDbApiKey ? fetchTheSportsDbMatches() : Promise.resolve({ matches: [], receipts: [] }),
  ]);

  const normalized: NormalizedProviderMatch[] = [];
  for (const result of providerResults) {
    if (result.status === 'fulfilled') {
      normalized.push(...result.value.matches);
    } else {
      errors.push(classifyProviderError(result.reason));
    }
  }

  const realMatches = mergeProviderMatches(normalized);
  const fixtures = realMatches.length > 0 ? realMatches : env.cupDemoMode ? buildSeedMatches() : [];
  const sourceMode: CupFeed['sourceMode'] = env.cupDemoMode && realMatches.length === 0
    ? 'demo-dev-only'
    : realMatches.length > 0
      ? 'live-adapter'
      : 'live-source-quorum-missing';
  const sourceStatus: CupSourceStatus = realMatches.length > 0
    ? 'fixture_available'
    : env.cupDemoMode
      ? 'demo_dev_only'
      : errors.some((error) => error.status === 'provider_rate_limited')
        ? 'provider_rate_limited'
        : 'source_quorum_unavailable';

  const feed = {
    sourceMode,
    sourceStatus,
    fixtures,
    errors,
    generatedAt: new Date().toISOString(),
  };

  persistCupMatches(feed).catch((err) => {
    console.warn('[cup] persistence skipped:', err instanceof Error ? err.message : err);
  });
  cache = { expiresAt: Date.now() + CACHE_MS, feed };
  return feed;
}

export async function getCupMatch(matchId: string): Promise<CupMatch | null> {
  const match = (await listCupMatches()).find((item) => item.id === matchId) ?? null;
  if (match) recordActivity('cup.fixture', matchId);
  return match;
}

export async function getCupResult(matchId: string) {
  const match = await getCupMatch(matchId);
  if (!match) return null;
  recordActivity('cup.result', matchId);
  return {
    matchId,
    status: match.status,
    score: match.score ?? null,
    settlement: match.settlement,
    receipts: match.receipts,
  };
}

export async function getCupAiEdge(matchId: string): Promise<CupAiEdge | null> {
  const match = await getCupMatch(matchId);
  if (!match) return null;
  recordActivity('cup.edge', matchId);

  const ratingDelta = match.home.rating - match.away.rating;
  const homeBase = 0.36 + ratingDelta * 0.005;
  const awayBase = 0.34 - ratingDelta * 0.004;
  const drawBase = 1 - homeBase - awayBase;
  const home = clamp(homeBase, 0.18, 0.62);
  const away = clamp(awayBase, 0.16, 0.6);
  const draw = clamp(drawBase, 0.18, 0.36);
  const total = home + draw + away;
  const probs = {
    home: round(home / total),
    draw: round(draw / total),
    away: round(away / total),
  };
  const max = Math.max(probs.home, probs.draw, probs.away);
  const edge = max < 0.43 ? 'NO_TRADE' : max === probs.home ? 'HOME' : max === probs.away ? 'AWAY' : 'DRAW';
  const sourcePenalty = match.settlement.sourceQuorum.status === 'settlement_ready' ? 12 : 44;
  const ambiguityRisk = match.settlement.state === 'challenge_window' ? 62 : sourcePenalty;
  const liquidityRisk = Math.round(100 - Math.min(match.home.rating, match.away.rating));
  const manipulationRisk = match.receipts.length >= 2 ? 18 : 46;
  const riskScore = Math.round((ambiguityRisk + liquidityRisk + manipulationRisk) / 3);

  return {
    matchId,
    fairProbability: probs,
    confidence: round((100 - riskScore) / 100),
    edge,
    risk: riskScore >= 55 ? 'HIGH' : riskScore >= 35 ? 'MEDIUM' : 'LOW',
    liquidityRisk,
    ambiguityRisk,
    manipulationRisk,
    suggestedSpreadBps: 120 + riskScore * 4,
    rationale: [
      `${match.home.name} rating ${match.home.rating} vs ${match.away.name} rating ${match.away.rating}`,
      `${match.receipts.length} real source receipt${match.receipts.length === 1 ? '' : 's'} attached`,
      match.settlement.sourceQuorum.reason,
    ],
    sourceHash: match.settlement.sourceHash,
    generatedAt: new Date().toISOString(),
  };
}

export async function getCupFairOdds(matchId: string): Promise<CupFairOdds | null> {
  const edge = await getCupAiEdge(matchId);
  if (!edge) return null;
  const toOdds = (p: number) => round(p > 0 ? 1 / p : 0);
  return {
    matchId,
    source: 'xsight-fair-probability',
    market: '1X2',
    oddsFormat: 'decimal',
    fairProbability: edge.fairProbability,
    decimalOdds: {
      home: toOdds(edge.fairProbability.home),
      draw: toOdds(edge.fairProbability.draw),
      away: toOdds(edge.fairProbability.away),
    },
    impliedMarginBps: 0,
    confidence: edge.confidence,
    risk: edge.risk,
    sourceHash: edge.sourceHash,
    generatedAt: edge.generatedAt,
  };
}

export async function getCupSettlementCheck(matchId: string): Promise<CupSettlementCheck | null> {
  const match = await getCupMatch(matchId);
  if (!match) return null;
  const challenged = match.settlement.state === 'challenge_window';
  const finalized = match.settlement.state === 'finalized';
  const ready = match.settlement.sourceQuorum.status === 'settlement_ready';
  return {
    matchId,
    status: challenged ? 'settlement_challenged' : match.settlement.sourceQuorum.status,
    canPropose: ready && !challenged && !finalized,
    canFinalize: match.settlement.state === 'proposed' && !challenged,
    reason: challenged ? 'Settlement is in challenge window; consumers should pause payouts.' : match.settlement.sourceQuorum.reason,
    sourceCount: match.receipts.length,
    agreeingSources: match.settlement.sourceQuorum.agreeingSources,
    proposedOutcome: match.settlement.proposedOutcome,
    finalOutcome: match.settlement.finalOutcome,
    challengeEndsAt: match.settlement.challengeEndsAt,
    settlement: match.settlement,
    receipts: match.receipts,
    generatedAt: new Date().toISOString(),
  };
}

export async function scoreCupTeamStrength(matchId: string): Promise<CupTeamStrength | null> {
  const match = await getCupMatch(matchId);
  if (!match) return null;
  const homeForm = formScore(match.home.form);
  const awayForm = formScore(match.away.form);
  const homeStrength = Math.round(match.home.rating * 0.72 + homeForm * 0.28);
  const awayStrength = Math.round(match.away.rating * 0.72 + awayForm * 0.28);
  return {
    matchId,
    home: { code: match.home.code, strength: homeStrength, formScore: homeForm, rating: match.home.rating },
    away: { code: match.away.code, strength: awayStrength, formScore: awayForm, rating: match.away.rating },
    delta: homeStrength - awayStrength,
    confidence: round(Math.min(0.9, 0.42 + match.receipts.length * 0.14)),
    generatedAt: new Date().toISOString(),
  };
}

export async function getCupSentiment(matchId: string): Promise<CupSentiment | null> {
  const match = await getCupMatch(matchId);
  if (!match) return null;
  return {
    matchId,
    mode: 'unavailable',
    home: { code: match.home.code, sentiment: 0, volumeIndex: 0 },
    away: { code: match.away.code, sentiment: 0, volumeIndex: 0 },
    drawNarrative: 0,
    sourceHash: match.settlement.sourceHash,
    notes: [
      'No social scraping is enabled in production-core mode.',
      'Sentiment is an optional input signal only and never settlement truth.',
    ],
    generatedAt: new Date().toISOString(),
  };
}

export async function getCupPlayerStats(matchId: string): Promise<CupPlayerStats | null> {
  const match = await getCupMatch(matchId);
  if (!match) return null;
  return {
    matchId,
    sourceMode: 'unavailable',
    sourceHash: match.settlement.sourceHash,
    players: [],
    generatedAt: new Date().toISOString(),
  };
}

export async function getCupTrackProof(): Promise<CupTrackProof> {
  const feed = await getCupFeed();
  const hasFixtures = feed.fixtures.length > 0;
  const oracleAddress = env.cupOracleV2Address || '<set CUP_ORACLE_V2_ADDRESS>';
  const sbtAddress = env.fanPassSbtAddress || '<set FANPASS_SBT_ADDRESS>';
  return {
    tracks: [
      {
        track: 'AI Agent',
        status: 'ready',
        judgeShouldSee: 'AgentBet reads CupHub, builds an action plan, and requires approval before action.',
        doNotClaim: 'Do not pitch this as an autonomous betting marketplace.',
        proofs: [
          { label: 'AgentBet UI', kind: 'ui', value: 'Cup > AgentBet' },
          { label: 'Action plan API', kind: 'api', value: 'POST /api/cup/action-plan' },
          { label: 'Agent MCP tool', kind: 'mcp', value: 'build_cup_action_plan' },
        ],
      },
      {
        track: 'Prediction Infrastructure',
        status: 'ready',
        judgeShouldSee: 'CupHub receipts, quorum checks, CupOracleV2 evidence, challenge window, and finalized result reads.',
        doNotClaim: 'Do not say XSight is a user-facing prediction market.',
        proofs: [
          { label: 'Oracle panel', kind: 'ui', value: 'CupHub > Oracle proof' },
          { label: 'Settlement check', kind: 'api', value: 'GET /api/cup/settlement-check?matchId=...' },
          { label: 'CupOracleV2', kind: 'contract', value: oracleAddress },
          { label: 'Reference consumer', kind: 'code', value: 'examples/cuphub-reference-market.ts' },
        ],
      },
      {
        track: 'Trading',
        status: 'ready',
        judgeShouldSee: 'Fair odds, risk, NO_TRADE/WAIT/HEDGE_PREP decisions, and approval-first hedge readiness.',
        doNotClaim: 'Do not claim autonomous betting execution.',
        proofs: [
          { label: 'Fair odds', kind: 'api', value: 'GET /api/cup/fair-odds?matchId=...' },
          { label: 'Risk action plan', kind: 'api', value: 'POST /api/cup/action-plan' },
          { label: 'Risk planner UI', kind: 'ui', value: 'Cup > AgentBet > Risk & Hedge Planner' },
        ],
      },
      {
        track: 'Social',
        status: 'ready',
        judgeShouldSee: 'FanPass campaign gate simulator for quests, active fan rewards, community access, and oracle contributor campaigns.',
        doNotClaim: 'Do not claim a Twitter/X social graph or scraper in MVP.',
        proofs: [
          { label: 'FanPass UI', kind: 'ui', value: 'Cup > FanPass' },
          { label: 'Fan score', kind: 'api', value: 'GET /api/cup/fan-score?wallet=...' },
          { label: 'FanPass MCP', kind: 'mcp', value: 'get_fan_score' },
        ],
      },
      {
        track: 'NFT',
        status: env.fanPassSbtAddress ? 'ready' : 'strong',
        judgeShouldSee: 'FanPass SBT eligibility and optional on-chain non-transferable badge proof for campaign gating.',
        doNotClaim: 'Do not claim a full NFT marketplace or winner-moment minting protocol.',
        proofs: [
          { label: 'SBT eligibility', kind: 'api', value: 'GET /api/cup/fanpass/sbt-eligibility?wallet=...' },
          { label: 'SBT contract', kind: 'contract', value: sbtAddress },
          { label: 'NFT gate UI', kind: 'ui', value: 'Cup > FanPass > FanPass SBT proof' },
        ],
      },
      {
        track: 'GameFi',
        status: hasFixtures ? 'ready' : 'strong',
        judgeShouldSee: 'Fantasy Quest Builder consumes fixtures, team strength, FanPass, player-stat availability, and oracle finality.',
        doNotClaim: 'Do not claim a full game or fabricated player stats.',
        proofs: [
          { label: 'Fantasy quest API', kind: 'api', value: 'GET /api/cup/fantasy-quest?matchId=...&wallet=...' },
          { label: 'Fantasy example', kind: 'code', value: 'examples/cuphub-fantasy-quest.ts' },
          { label: 'Quest builder UI', kind: 'ui', value: 'CupHub > Fantasy Quest Builder' },
        ],
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export async function getCupFantasyQuest(matchId: string, wallet: string): Promise<CupFantasyQuest | null> {
  const [match, strength, stats, fanScore] = await Promise.all([
    getCupMatch(matchId),
    scoreCupTeamStrength(matchId),
    getCupPlayerStats(matchId),
    getFanScore(wallet),
  ]);
  if (!match || !strength || !stats || !fanScore) return null;

  const favorite = strength.delta >= 0 ? match.home.code : match.away.code;
  const finalized = match.settlement.state === 'finalized';
  const basicEligible = fanScore.score >= 20;
  const winnerEligible = fanScore.score >= 35 && finalized;
  const gateStatus = fanScore.score >= 70
    ? 'eligible'
    : fanScore.score >= 35
      ? 'limited'
      : fanScore.score >= 20
        ? 'manual_review'
        : 'blocked';
  const claimState: CupFantasyQuest['claimState'] = winnerEligible
    ? 'winner_available'
    : finalized && basicEligible
      ? 'basic_available'
      : basicEligible
        ? 'winner_locked'
        : 'locked';

  return {
    matchId,
    wallet: fanScore.wallet,
    recommendedQuest: `${favorite} fan challenge: predict momentum, complete fan activity, and wait for CupOracle finality before winner rewards.`,
    teamStrengthSignal: {
      home: match.home.code,
      away: match.away.code,
      delta: strength.delta,
      favorite,
      confidence: strength.confidence,
    },
    playerStatsStatus: stats.sourceMode,
    fanPassGate: {
      status: gateStatus,
      score: fanScore.score,
      level: fanScore.level,
      reason: fanScore.score >= 35
        ? 'FanPass threshold met for fantasy participation; winner rewards still require oracle finality.'
        : 'FanPass score is low; keep user in basic/read-only quests.',
    },
    oracleFinalityRequired: true,
    claimState,
    sourceHash: match.settlement.sourceHash,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildCupActionPlan(matchId: string, mode: CupActionPlan['mode'] = 'builder'): Promise<CupActionPlan | null> {
  const match = await getCupMatch(matchId);
  const edge = await getCupAiEdge(matchId);
  const settlement = await getCupSettlementCheck(matchId);
  if (!match || !edge || !settlement) return null;
  const ready = match.settlement.sourceQuorum.status === 'settlement_ready';
  const challenged = settlement.status === 'settlement_challenged';
  const final = match.settlement.state === 'finalized';
  const riskDecision: CupActionPlan['riskDecision'] = challenged || !ready
    ? 'WAIT'
    : edge.edge === 'NO_TRADE' || edge.risk === 'HIGH'
      ? 'NO_TRADE'
      : final
        ? 'APPROVAL_REQUIRED'
        : 'HEDGE_PREP';
  const hedgeReadiness: CupActionPlan['hedgeReadiness'] = riskDecision === 'APPROVAL_REQUIRED'
    ? 'ready_for_approval'
    : riskDecision === 'HEDGE_PREP'
      ? 'wait_for_oracle'
      : 'blocked';
  const executionBlockedReason = hedgeReadiness === 'blocked'
    ? challenged
      ? 'Settlement challenged; pause all final actions.'
      : !ready
        ? match.settlement.sourceQuorum.reason
        : 'AI edge returned NO_TRADE or risk is too high.'
    : hedgeReadiness === 'wait_for_oracle'
      ? 'Prepare only; wait for oracle finality and explicit approval before execution.'
      : null;
  return {
    matchId,
    mode,
    primaryAction:
      mode === 'agent'
        ? ready
          ? `Observe ${match.home.code}/${match.away.code} settlement, then request human approval before any hedge.`
          : `Pause action: ${match.settlement.sourceQuorum.reason}.`
        : ready
          ? `Use CupHub sourceHash ${match.settlement.sourceHash.slice(0, 14)}... as the settlement evidence primitive.`
          : `Do not resolve user payouts yet: ${match.settlement.sourceQuorum.reason}.`,
    guardrails: [
      'Never finalize user payouts before the CupOracle challenge window closes.',
      'Show source URLs, payload hashes, and rules hash in downstream market UI.',
      'Treat AI edge as a non-canonical signal; settlement depends on source quorum and oracle finalization.',
    ],
    xlayerActions: [
      'Read CupOracleV2 match state on X Layer.',
      'Only write app-specific payouts after finalized oracle outcome.',
      'Require explicit user approval before any swap, hedge, or stake action.',
    ],
    apiCalls: [
      `GET /api/v1/cup/fixtures`,
      `GET /api/v1/cup/ai-edge?matchId=${matchId}`,
      `GET /api/v1/cup/fair-odds?matchId=${matchId}`,
      `GET /api/v1/cup/settlement-check?matchId=${matchId}`,
      `GET /api/v1/cup/result/${matchId}`,
      `GET /api/v1/cup/fan-score?wallet=0x...`,
      `POST /mcp tools/call verify_outcome`,
    ],
    agentTrace: [
      {
        step: 1,
        tool: 'get_cup_fixtures',
        input: {},
        output: `${match.home.code}/${match.away.code} ${match.status}`,
        status: 'ok',
      },
      {
        step: 2,
        tool: 'get_cup_ai_edge',
        input: { matchId },
        output: `${edge.edge}, risk ${edge.risk}, confidence ${edge.confidence}`,
        status: 'ok',
      },
      {
        step: 3,
        tool: 'get_cup_settlement_state',
        input: { matchId },
        output: `${settlement.status}: ${settlement.reason}`,
        status: settlement.status === 'settlement_ready' ? 'ok' : settlement.status === 'source_quorum_unavailable' ? 'quorum_missing' : 'blocked',
      },
      {
        step: 4,
        tool: 'get_fan_score',
        input: { wallet: '<user-wallet>' },
        output: 'FanPass guardrail required before rewards or delegated actions.',
        status: 'ok',
      },
      {
        step: 5,
        tool: 'build_cup_action_plan',
        input: { matchId, mode },
        output: riskDecision,
        status: executionBlockedReason ? 'blocked' : 'ok',
      },
    ],
    riskDecision,
    hedgeReadiness,
    executionBlockedReason,
  };
}

export async function cupOverview() {
  const feed = await getCupFeed();
  return {
    name: 'XSight CupHub',
    network: X_LAYER.name,
    chainId: X_LAYER.chainId,
    sourceMode: feed.sourceMode,
    sourceStatus: feed.sourceStatus,
    errors: feed.errors,
    matches: feed.fixtures,
    endpoints: [
      '/api/v1/cup/fixtures',
      '/api/v1/cup/result/:matchId',
      '/api/v1/cup/player-stats?matchId=...',
      '/api/v1/cup/ai-edge?matchId=...',
      '/api/v1/cup/fair-odds?matchId=...',
      '/api/v1/cup/settlement-check?matchId=...',
      '/api/v1/cup/sentiment?matchId=...',
      '/api/v1/cup/team-strength?matchId=...',
      '/api/v1/cup/fan-score?wallet=...',
      '/api/v1/cup/action-plan',
    ],
    mcpTools: ['get_cup_fixtures', 'resolve_match', 'get_cup_ai_edge', 'get_cup_player_stats', 'score_team_strength', 'get_cup_sentiment', 'verify_outcome', 'get_cup_settlement_state', 'get_fan_score'],
  };
}

export function mergeProviderMatches(providerMatches: NormalizedProviderMatch[]): CupMatch[] {
  const groups = new Map<string, NormalizedProviderMatch[]>();
  for (const match of providerMatches) {
    const key = canonicalMatchKey(match);
    const group = groups.get(key) ?? [];
    group.push(match);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, group]) => buildMatchFromProviderGroup(key, group))
    .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
}

function buildMatchFromProviderGroup(key: string, group: NormalizedProviderMatch[]): CupMatch {
  const primary = group[0] as NormalizedProviderMatch;
  const receipts = group.map((match) => match.receipt);
  const quorum = evaluateSettlementQuorum(receipts);
  const sourceHash = hashJson(receipts.map((receipt) => receipt.payloadHash));
  const evidenceHash = hashJson({ matchId: key, receipts });
  const finalVotes = group.filter((match) => match.status === 'final').length;
  const liveVotes = group.filter((match) => match.status === 'live').length;
  const liveWindow = isInLiveWindow(primary.kickoffUtc);
  const status: CupMatchStatus = finalVotes > 0 ? 'final' : liveVotes > 0 && liveWindow ? 'live' : 'scheduled';
  const score = quorum.status === 'settlement_ready'
    ? primary.score
    : group.find((match) => match.score)?.score;
  const sourceStatus: CupSourceStatus = status === 'final'
    ? quorum.status
    : status === 'live'
      ? 'live'
      : 'fixture_available';
  return {
    id: key,
    stage: primary.stage,
    kickoffUtc: primary.kickoffUtc,
    home: primary.home,
    away: primary.away,
    venue: primary.venue,
    status,
    score,
    sourceMode: 'live-adapter',
    sourceStatus,
    receipts,
    settlement: {
      state: status === 'final' && quorum.status === 'settlement_ready' ? 'open' : 'not_open',
      proposedOutcome: quorum.status === 'settlement_ready' ? quorum.outcome : undefined,
      rulesHash: rulesHash(key),
      sourceHash,
      evidenceHash,
      evidenceUri: `urn:xsight:cup:evidence:${evidenceHash}`,
      sourceQuorum: quorum,
      chainId: X_LAYER.chainId,
      explorer: X_LAYER.explorer,
    },
  };
}

function isInLiveWindow(kickoffUtc: string): boolean {
  const kickoff = new Date(kickoffUtc).getTime();
  if (!Number.isFinite(kickoff)) return false;
  const now = Date.now();
  return now >= kickoff - 15 * 60 * 1000 && now <= kickoff + 3 * 60 * 60 * 1000;
}

function canonicalMatchKey(match: NormalizedProviderMatch): string {
  const home = sanitizeKey(match.home.code || match.home.name);
  const away = sanitizeKey(match.away.code || match.away.name);
  const kickoff = new Date(match.kickoffUtc);
  const bucketMs = 15 * 60 * 1000;
  const rounded = new Date(Math.round(kickoff.getTime() / bucketMs) * bucketMs);
  const stamp = rounded.toISOString().slice(0, 16).replace(/:/g, '-').toLowerCase();
  return `cup-${home}-${away}-${stamp}`;
}

function sanitizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'tbd';
}

function buildSeedMatches(): CupMatch[] {
  return SEEDED_MATCHES.map((seed) => {
    const payload = { id: seed.id, kickoffUtc: seed.kickoffUtc, home: seed.home.code, away: seed.away.code, score: seed.score ?? null };
    const seededReceipt: CupSourceReceipt = {
      provider: 'XSight seed',
      url: 'docs/xcup-cupos-strategy.md',
      observedAt: new Date().toISOString(),
      payloadHash: hashJson(payload),
      confidence: 0,
      normalizedPayload: payload,
    };
    const sourceHash = hashJson([seededReceipt.payloadHash]);
    const quorum = evaluateSettlementQuorum([seededReceipt]);
    const evidenceHash = hashJson({ matchId: seed.id, receipts: [seededReceipt] });
    return {
      ...seed,
      sourceStatus: 'demo_dev_only',
      receipts: [seededReceipt],
      settlement: {
        state: 'not_open',
        rulesHash: rulesHash(seed.id),
        sourceHash,
        evidenceHash,
        evidenceUri: `urn:xsight:cup:evidence:${evidenceHash}`,
        sourceQuorum: quorum,
        chainId: X_LAYER.chainId,
        explorer: X_LAYER.explorer,
      },
    };
  });
}

async function fetchEspnMatches(): Promise<ProviderResult> {
  const payload = await fetchJson(env.espnScoreboardUrl, 'ESPN');
  return normalizeEspnScoreboard(payload, env.espnScoreboardUrl);
}

async function fetchFootballDataMatches(): Promise<ProviderResult> {
  const url = 'https://api.football-data.org/v4/competitions/WC/matches';
  const payload = await fetchJson(url, 'football-data.org', { 'X-Auth-Token': env.footballDataApiKey });
  const root = payload as { matches?: unknown[] };
  const matches = (Array.isArray(root.matches) ? root.matches : []).flatMap((match) => {
    const normalized = normalizeFootballDataMatch(match, url);
    return normalized ? [normalized] : [];
  });
  return { matches, receipts: matches.map((match) => match.receipt) };
}

async function fetchTheSportsDbMatches(): Promise<ProviderResult> {
  const url = `https://www.thesportsdb.com/api/v1/json/${env.theSportsDbApiKey}/eventsnextleague.php?id=${encodeURIComponent(env.theSportsDbLeagueId)}`;
  const payload = await fetchJson(url, 'TheSportsDB');
  const root = payload as { events?: unknown[] };
  const matches = (Array.isArray(root.events) ? root.events : []).flatMap((event) => {
    const normalized = normalizeTheSportsDbEvent(event, url);
    return normalized ? [normalized] : [];
  });
  return { matches, receipts: matches.map((match) => match.receipt) };
}

async function fetchJson(url: string, provider: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.status === 429) throw new Error(`${provider}:rate_limited`);
    if (!res.ok) throw new Error(`${provider}:http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeEspnEvent(event: unknown, url: string): NormalizedProviderMatch | null {
  const item = event as {
    id?: string;
    name?: string;
    date?: string;
    status?: { type?: { state?: string; completed?: boolean } };
    competitions?: Array<{ venue?: { fullName?: string }; competitors?: unknown[] }>;
  };
  const competition = item.competitions?.[0];
  const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
  const home = competitors.map(readEspnCompetitor).find((team) => team?.homeAway === 'home');
  const away = competitors.map(readEspnCompetitor).find((team) => team?.homeAway === 'away');
  if (!item.id || !item.date || !home || !away) return null;
  const status = item.status?.type?.completed ? 'final' : item.status?.type?.state === 'in' ? 'live' : 'scheduled';
  const score = status !== 'scheduled' && home.score !== undefined && away.score !== undefined ? { home: home.score, away: away.score } : undefined;
  const outcome = status === 'final' && score ? outcomeFromScore(score, item.name) : undefined;
  const normalizedPayload = {
    providerId: item.id,
    kickoffUtc: new Date(item.date).toISOString(),
    home: home.code,
    away: away.code,
    score: score ?? null,
    status,
  };
  return {
    id: `espn-${item.id}`,
    stage: item.name ?? 'ESPN soccer event',
    kickoffUtc: normalizedPayload.kickoffUtc,
    home: { code: home.code, name: home.name, rating: 50, form: '' },
    away: { code: away.code, name: away.name, rating: 50, form: '' },
    venue: competition?.venue?.fullName ?? 'Venue unavailable',
    status,
    score,
    receipt: receipt('ESPN', url, normalizedPayload, 0.7, outcome),
  };
}

function readEspnCompetitor(value: unknown): { homeAway: string; code: string; name: string; score?: number } | null {
  const item = value as { homeAway?: string; score?: string; team?: { abbreviation?: string; displayName?: string; shortDisplayName?: string } };
  const code = item.team?.abbreviation?.trim();
  const name = item.team?.displayName?.trim() || item.team?.shortDisplayName?.trim();
  if (!item.homeAway || !code || !name) return null;
  const score = item.score !== undefined && item.score !== '' ? Number(item.score) : undefined;
  return { homeAway: item.homeAway, code, name, score: Number.isFinite(score) ? score : undefined };
}

function normalizeFootballDataMatch(value: unknown, url: string): NormalizedProviderMatch | null {
  const match = value as {
    id?: number;
    utcDate?: string;
    stage?: string;
    status?: string;
    homeTeam?: { tla?: string; shortName?: string; name?: string };
    awayTeam?: { tla?: string; shortName?: string; name?: string };
    score?: { fullTime?: { home?: number | null; away?: number | null } };
  };
  if (!match.id || !match.utcDate || !match.homeTeam || !match.awayTeam) return null;
  const status = match.status === 'FINISHED' ? 'final' : match.status === 'IN_PLAY' || match.status === 'PAUSED' ? 'live' : 'scheduled';
  const homeScore = match.score?.fullTime?.home;
  const awayScore = match.score?.fullTime?.away;
  const score = typeof homeScore === 'number' && typeof awayScore === 'number' ? { home: homeScore, away: awayScore } : undefined;
  const outcome = status === 'final' && score ? outcomeFromScore(score, match.stage) : undefined;
  const normalizedPayload = {
    providerId: match.id,
    kickoffUtc: new Date(match.utcDate).toISOString(),
    home: match.homeTeam.tla ?? match.homeTeam.shortName,
    away: match.awayTeam.tla ?? match.awayTeam.shortName,
    score: score ?? null,
    status,
  };
  return {
    id: `football-data-${match.id}`,
    stage: match.stage ?? 'football-data World Cup match',
    kickoffUtc: normalizedPayload.kickoffUtc,
    home: { code: match.homeTeam.tla ?? 'HOME', name: match.homeTeam.shortName ?? match.homeTeam.name ?? 'Home', rating: 50, form: '' },
    away: { code: match.awayTeam.tla ?? 'AWAY', name: match.awayTeam.shortName ?? match.awayTeam.name ?? 'Away', rating: 50, form: '' },
    venue: 'Venue unavailable',
    status,
    score,
    receipt: receipt('football-data.org', url, normalizedPayload, 0.66, outcome),
  };
}

function normalizeTheSportsDbEvent(value: unknown, url: string): NormalizedProviderMatch | null {
  const event = value as {
    idEvent?: string;
    strEvent?: string;
    dateEvent?: string;
    strTimestamp?: string;
    strHomeTeam?: string;
    strAwayTeam?: string;
    intHomeScore?: string | null;
    intAwayScore?: string | null;
    strVenue?: string;
    strStatus?: string;
  };
  if (!event.idEvent || !event.strHomeTeam || !event.strAwayTeam) return null;
  const date = normalizeTheSportsDbTimestamp(event.strTimestamp, event.dateEvent);
  if (!date) return null;
  const homeScore = event.intHomeScore !== null && event.intHomeScore !== undefined ? Number(event.intHomeScore) : undefined;
  const awayScore = event.intAwayScore !== null && event.intAwayScore !== undefined ? Number(event.intAwayScore) : undefined;
  const score = Number.isFinite(homeScore) && Number.isFinite(awayScore) ? { home: homeScore as number, away: awayScore as number } : undefined;
  const status = score ? 'final' : event.strStatus?.toLowerCase().includes('live') ? 'live' : 'scheduled';
  const outcome = status === 'final' && score ? outcomeFromScore(score, event.strEvent) : undefined;
  const normalizedPayload = {
    providerId: event.idEvent,
    kickoffUtc: new Date(date).toISOString(),
    home: event.strHomeTeam,
    away: event.strAwayTeam,
    score: score ?? null,
    status,
  };
  return {
    id: `thesportsdb-${event.idEvent}`,
    stage: event.strEvent ?? 'TheSportsDB event',
    kickoffUtc: normalizedPayload.kickoffUtc,
    home: { code: codeFromName(event.strHomeTeam), name: event.strHomeTeam, rating: 50, form: '' },
    away: { code: codeFromName(event.strAwayTeam), name: event.strAwayTeam, rating: 50, form: '' },
    venue: event.strVenue ?? 'Venue unavailable',
    status,
    score,
    receipt: receipt('TheSportsDB', url, normalizedPayload, 0.64, outcome),
  };
}

function normalizeTheSportsDbTimestamp(timestamp?: string, dateEvent?: string): string {
  if (timestamp?.trim()) {
    const value = timestamp.trim();
    return /z$|[+-]\d{2}:?\d{2}$/i.test(value) ? value : `${value}Z`;
  }
  return dateEvent ? `${dateEvent}T00:00:00.000Z` : '';
}

function receipt(provider: CupSourceReceipt['provider'], url: string, payload: unknown, confidence: number, outcome?: CupOutcome): CupSourceReceipt {
  return {
    provider,
    url,
    observedAt: new Date().toISOString(),
    payloadHash: hashJson(payload),
    confidence,
    outcome,
    normalizedPayload: payload,
  };
}

function classifyProviderError(reason: unknown): CupFeed['errors'][number] {
  const detail = reason instanceof Error ? reason.message : String(reason);
  const provider = detail.split(':')[0] || 'unknown';
  return {
    provider,
    status: detail.includes('rate_limited') ? 'provider_rate_limited' : 'source_quorum_unavailable',
    detail,
  };
}

/**
 * A FIFA World Cup knockout round cannot end in a draw — one team always advances,
 * decided by extra time or a penalty shootout. A level final score in a knockout
 * fixture is therefore NOT a Draw, and the regulation/ET score alone cannot say who
 * advanced. Best-effort round detection from the stage label (most reliable on
 * football-data.org, which reports GROUP_STAGE / ROUND_OF_16 / … / FINAL).
 */
export function isKnockoutStage(stage: string | undefined): boolean {
  if (!stage) return false;
  const s = stage.toLowerCase().replace(/[_-]/g, ' ');
  return /\b(round of 16|round of 32|last 16|quarter|semi|final|knockout|play ?off)\b/.test(s);
}

/**
 * 1X2 outcome from a final score. A level score resolves to Draw only for a
 * group-stage match; in a knockout it is ambiguous (penalties decide it) so we
 * return undefined — the multi-source quorum then holds rather than settling a
 * wrong Draw. See docs/xcup/SETTLEMENT-RULES.md §2.
 */
function outcomeFromScore(
  score: { home: number; away: number },
  stage?: string,
): CupOutcome | undefined {
  if (score.home > score.away) return 'HOME';
  if (score.home < score.away) return 'AWAY';
  return isKnockoutStage(stage) ? undefined : 'DRAW';
}

/**
 * On-chain commitment to the published settlement rulebook. The hash binds every match
 * to docs/xcup/SETTLEMENT-RULES.md v1 — bump `rulebookVersion` only alongside a new
 * rulebook revision, never edit the rule text without one.
 */
function rulesHash(matchId: string): string {
  return hashJson({
    matchId,
    rulebook: 'docs/xcup/SETTLEMENT-RULES.md',
    rulebookVersion: 'v1',
    rule: '1X2 Match Result, settled on the official FIFA final result. Group stage = the 90-minute result; knockout = the result after extra time and, if still level, the penalty shootout. Abandoned, postponed or cancelled matches are voided and fully refunded. Full rulebook: SETTLEMENT-RULES.md v1.',
    disputeWindowSeconds: 3600,
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

function codeFromName(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  return COUNTRY_CODE_ALIASES[normalized] ?? (name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'TBD');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formScore(form: string): number {
  if (!form) return 50;
  const points = form.split('').reduce((sum, item) => {
    if (item === 'W') return sum + 100;
    if (item === 'D') return sum + 55;
    return sum + 20;
  }, 0);
  return Math.round(points / form.length);
}
