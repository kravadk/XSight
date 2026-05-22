import type { CardPayload } from '../types/cards';

export interface ChatResponse {
  cards: CardPayload[];
}

export interface PortfolioToken {
  symbol: string;
  address: string;
  amount: number;
  usdValue: number;
}

export interface PortfolioResponse {
  address: string;
  network: string;
  totalUsd: number;
  change24h: number;
  changePercent: number;
  tokens: PortfolioToken[];
}

export interface X402CallLogEntry {
  timestamp: number;
  endpoint: string;
  caller: string;
  amount: number;
  asset: string;
  status: 'paid' | 'rejected';
}

export interface X402EndpointSpecDto {
  method: 'GET' | 'POST';
  path: string;
  priceUsdt: string;
  description: string;
  query?: Record<string, string>;
  responseShape?: unknown;
}

export interface X402SpecDto {
  name: string;
  version: string;
  description: string;
  network: string;
  chainId: number;
  chainName: string;
  asset: string;
  assetAddress: string;
  decimals: number;
  payTo: string;
  gasSponsored: boolean;
  zeroGasAssets: readonly string[];
  paymentScheme: 'exact';
  paymentInstruction: {
    header: 'X-PAYMENT';
    format: string;
    devBypassHeader: string;
  };
  endpoints: X402EndpointSpecDto[];
  examples: Record<string, string>;
}

export interface EconomySnapshotDto {
  totalRevenueUsdt: number;
  callsToday: number;
  lpDepositedUsdt: number;
  lpCurrentUsdt: number;
  lpYieldEarnedUsdt: number;
  /** True only when at least one real on-chain deploy has been executed. */
  lpActive: boolean;
  deployCount: number;
  lastDeployAt: number;
  expensesGasOkb: number;
  expensesAiUsdt: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  netProfitUsdt: number;
  autoDeployEnabled: boolean;
  threshold: number;
}

export interface ActivitySnapshotDto {
  walletAddress: string | null;
  walletExplorer: string | null;
  chainId: number;
  network: string;
  totalCalls: number;
  byKind: Record<string, number>;
  lastEventAt: number;
  swapsExecuted: number;
  quotesRequested: number;
  balanceChecks: number;
  marketDataCalls: number;
  securityScans: number;
  x402PaymentsReceived: number;
  x402Rejected: number;
  aiCalls: number;
  recent: { timestamp: number; kind: string; detail?: string }[];
}

export interface PoolStatDto {
  pair: string;
  baseSymbol: string;
  quoteSymbol: string;
  tvlUsd: number;
  volume24hUsd: number;
  estAprPct: number;
  router?: string;
}

export interface CupSourceReceiptDto {
  provider: string;
  url: string;
  observedAt: string;
  payloadHash: string;
  confidence: number;
  outcome?: 'HOME' | 'DRAW' | 'AWAY';
  normalizedPayload?: unknown;
}

export interface CupMatchDto {
  id: string;
  stage: string;
  kickoffUtc: string;
  home: { code: string; name: string; rating: number; form: string };
  away: { code: string; name: string; rating: number; form: string };
  venue: string;
  status: 'scheduled' | 'live' | 'final' | 'proposed' | 'challenged' | 'settled';
  score?: { home: number; away: number };
  sourceMode: 'live-adapter' | 'live-source-quorum-missing' | 'demo-dev-only';
  sourceStatus: 'fixture_available' | 'live' | 'source_quorum_unavailable' | 'provider_rate_limited' | 'conflicting_sources' | 'settlement_ready' | 'demo_dev_only';
  receipts: CupSourceReceiptDto[];
  settlement: {
    state: 'not_open' | 'open' | 'proposed' | 'challenge_window' | 'finalized';
    proposedOutcome?: 'HOME' | 'DRAW' | 'AWAY';
    finalOutcome?: 'HOME' | 'DRAW' | 'AWAY';
    rulesHash: string;
    sourceHash: string;
    evidenceHash: string;
    evidenceUri: string;
    sourceQuorum: {
      status: 'settlement_ready' | 'source_quorum_unavailable' | 'conflicting_sources';
      outcome?: 'HOME' | 'DRAW' | 'AWAY';
      agreeingSources: number;
      reason: string;
    };
    challengeEndsAt?: string;
    chainId: number;
    explorer?: string;
  };
}

export interface CupAiEdgeDto {
  matchId: string;
  fairProbability: { home: number; draw: number; away: number };
  confidence: number;
  edge: 'HOME' | 'DRAW' | 'AWAY' | 'NO_TRADE';
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  liquidityRisk: number;
  ambiguityRisk: number;
  manipulationRisk: number;
  suggestedSpreadBps: number;
  rationale: string[];
  sourceHash: string;
  generatedAt: string;
}

export interface CupFairOddsDto {
  matchId: string;
  source: 'xsight-fair-probability';
  market: '1X2';
  oddsFormat: 'decimal';
  fairProbability: { home: number; draw: number; away: number };
  decimalOdds: { home: number; draw: number; away: number };
  impliedMarginBps: number;
  confidence: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  sourceHash: string;
  generatedAt: string;
}

export interface CupSettlementCheckDto {
  matchId: string;
  status: CupMatchDto['sourceStatus'] | 'settlement_challenged';
  canPropose: boolean;
  canFinalize: boolean;
  reason: string;
  sourceCount: number;
  agreeingSources: number;
  proposedOutcome?: CupOutcome;
  finalOutcome?: CupOutcome;
  challengeEndsAt?: string;
  settlement: CupMatchDto['settlement'];
  receipts: CupSourceReceiptDto[];
  generatedAt: string;
}

export interface FanScoreDto {
  wallet: string;
  score: number;
  level: 'unknown' | 'active' | 'trusted' | 'oracle-grade';
  breakdown: {
    x402Usage: number;
    cupInteractions: number;
    onchainActivity: number;
    consistency: number;
    oracleParticipation: number;
  };
  gates: string[];
  verdict: string;
}

export interface CupActionPlanDto {
  matchId: string;
  mode: 'builder' | 'agent' | 'fan';
  primaryAction: string;
  guardrails: string[];
  xlayerActions: string[];
  apiCalls: string[];
  agentTrace: {
    step: number;
    tool: string;
    input: Record<string, string>;
    output: string;
    status: 'ok' | 'blocked' | 'payment_required' | 'quorum_missing';
  }[];
  riskDecision: 'NO_TRADE' | 'WAIT' | 'HEDGE_PREP' | 'APPROVAL_REQUIRED';
  hedgeReadiness: 'ready_for_approval' | 'wait_for_oracle' | 'blocked';
  executionBlockedReason: string | null;
}

export interface CupTrackProofDto {
  tracks: {
    track: 'AI Agent' | 'Prediction Infrastructure' | 'Trading' | 'Social' | 'NFT' | 'GameFi';
    status: 'ready' | 'strong' | 'needs proof' | 'stretch';
    judgeShouldSee: string;
    doNotClaim: string;
    proofs: { label: string; kind: 'ui' | 'api' | 'mcp' | 'code' | 'contract'; value: string }[];
  }[];
  generatedAt: string;
}

export interface CupFantasyQuestDto {
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

export interface FanPassSbtEligibilityDto {
  wallet: string;
  eligible: boolean;
  minted: boolean;
  tokenId: number | null;
  score: number;
  level: string;
  eligibilityHash: string;
  uri: string;
  reason: string;
  contract: {
    name: string;
    status: 'deployed' | 'contract-ready';
    address: string | null;
    chainId: number;
    network: string;
    explorerUrl: string | null;
    sourcePath: string;
    writeApiEnabled: boolean;
    abi: string[];
  };
}

export interface FanPassSbtMintDto {
  ok: true;
  wallet: string;
  tokenId: number;
  eligibilityHash: string;
  uri: string;
  txHash: string;
  explorerUrl: string;
  contract: FanPassSbtEligibilityDto['contract'];
}

export interface CupTeamStrengthDto {
  matchId: string;
  home: { code: string; strength: number; formScore: number; rating: number };
  away: { code: string; strength: number; formScore: number; rating: number };
  delta: number;
  confidence: number;
  generatedAt: string;
}

export interface CupSentimentDto {
  matchId: string;
  mode: 'live-input-only' | 'unavailable';
  home: { code: string; sentiment: number; volumeIndex: number };
  away: { code: string; sentiment: number; volumeIndex: number };
  drawNarrative: number;
  sourceHash: string;
  notes: string[];
  generatedAt: string;
}

export interface CupPlayerStatsDto {
  matchId: string;
  sourceMode: 'live-adapter' | 'unavailable';
  sourceHash: string;
  players: {
    playerId: string;
    name: string;
    team: string;
    role: 'keeper' | 'defender' | 'midfielder' | 'forward';
    formIndex: number;
    expectedImpact: number;
    minutesProjection: number;
    riskFlags: string[];
  }[];
  generatedAt: string;
}

export interface CupAdapterOverviewDto {
  mode: 'live-source-quorum-ready' | 'live-source-quorum-missing' | 'demo-dev-only';
  liveSources: number;
  requiredLiveSources: number;
  readyForProductionSettlement: boolean;
  adapters: {
    id: 'xsight-seed' | 'football-data' | 'thesportsdb' | 'espn';
    name: string;
    role: 'seed' | 'fixtures' | 'scores' | 'stats';
    configured: boolean;
    confidenceWeight: number;
    docsUrl: string;
    status: 'live' | 'needs_key' | 'disabled' | 'dev_only';
    note: string;
  }[];
}

export interface CupPersistenceHealthDto {
  configured: boolean;
  ok: boolean;
  tablesReady: boolean;
  lastError: string | null;
}

export interface CupOverviewDto {
  name: string;
  network: string;
  chainId: number;
  sourceMode: string;
  sourceStatus: string;
  errors: { provider: string; status: string; detail: string }[];
  matches: CupMatchDto[];
  endpoints: string[];
  mcpTools: string[];
  contract: CupOracleContractDto;
}

export interface CupOracleContractDto {
  name: string;
  status: 'deployed' | 'contract-ready';
  address: string | null;
  chainId: number;
  network: string;
  explorerUrl: string | null;
  sourcePath: string;
  legacyAddress?: string | null;
  version?: string;
  challengeWindowSeconds: number;
  writeApiEnabled: boolean;
  abi: string[];
}

export interface CupReadinessDto {
  readyToDeploy: boolean;
  readyToSeed: boolean;
  agenticWalletAddress: string | null;
  signerAddress: string | null;
  gasOkb: number;
  contract: CupOracleContractDto;
  checks: { id: string; label: string; ok: boolean; detail: string }[];
  instructions: string[];
}

export interface CupOnchainMatchDto {
  matchId: string;
  registered: boolean;
  rulesHash?: string;
  sourceHash?: string;
  evidenceHash?: string;
  evidenceUri?: string;
  sourceCount?: number;
  proposedOutcome?: number;
  finalOutcome?: number;
  state?: number;
  proposer?: string;
  challenger?: string;
  challengeEndsAt?: number;
  updatedAt?: number;
}

export type CupOutcome = 'HOME' | 'DRAW' | 'AWAY';

export interface CupOracleTxDto {
  ok: true;
  matchId: string;
  action: 'proposeResult' | 'challengeResult' | 'finalizeResult' | 'emergencyFinalize';
  outcome: CupOutcome | null;
  txHash: string;
  explorerUrl: string;
}

export interface CupSettlementLogEntryDto {
  timestamp: number;
  matchId: string;
  action: 'proposeResult' | 'challengeResult' | 'finalizeResult' | 'emergencyFinalize';
  outcome: CupOutcome | null;
  txHash: string;
  explorerUrl: string;
  signer: string;
}

export interface CatalogTokenDto {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  native?: boolean;
}

export interface CatalogResponseDto {
  tokens: CatalogTokenDto[];
  total: number;
  stats: {
    running: boolean;
    refreshMs: number;
    lastRefreshMs: number;
    tokenCount: number;
    symbolCount: number;
  };
}

export interface DeployEventDto {
  timestamp: number;
  fromAmountUsdt: number;
  toAmountOkb: number;
  txHash: string;
  approveTxHash?: string;
  explorerUrl: string;
}

export interface TriggerDeployDto {
  ok: boolean;
  reason?: string;
  fromAmountUsdt?: number;
  toAmountOkb?: number;
  txHash?: string;
  approveTxHash?: string;
  explorerUrl?: string;
}

export type StrategyTrigger =
  | 'price_below'
  | 'price_above'
  | 'change24h_below'
  | 'change24h_above'
  | 'volume_spike'
  | 'apr_above'
  | 'apr_below'
  | 'new_token'
  | 'concentration_above';

export type StrategyAction = 'notify' | 'auto_deploy';

export interface StrategyDto {
  id: string;
  kind: StrategyTrigger;
  target?: string;
  threshold?: number;
  action: StrategyAction;
  label?: string;
  description: string;
  createdAt: number;
  enabled: boolean;
  firedCount: number;
  lastFiredAt: number;
  lastEvaluatedAt: number;
  cooldownMs: number;
  webhookUrl?: string;
}

export interface StrategyFireDto {
  strategyId: string;
  timestamp: number;
  reason: string;
  actionResult?: string;
}

export interface StrategyCreateBody {
  kind: StrategyTrigger;
  target?: string;
  threshold?: number;
  action?: StrategyAction;
  label?: string;
  webhookUrl?: string;
}

export interface SwapResultDto {
  txHash: string;
  approveTxHash?: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  status: 'submitted' | 'confirmed';
}

export interface SwapQuoteDto {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  estGasOkb: string;
  routeSummary: string;
  priceImpactPct?: number;
}

export interface TokenSecurityDto {
  tokenAddress: string;
  riskScore: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  warnings: string[];
  verdict: string;
}

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  messageCount: number;
  lastMessage?: string;
}

// === X Cup prediction market (Plan 3 backend) ===
export type MarketStatusDto =
  | 'contract_not_deployed'
  | 'market_not_created'
  | 'open'
  | 'awaiting_settlement'
  | 'settled'
  | 'refund';

export interface ParimutuelContractDto {
  name: string;
  status: 'deployed' | 'contract-ready';
  address: string | null;
  chainId: number;
  network: string;
  explorerUrl: string | null;
  sourcePath: string;
  abi: string[];
}

export interface MarketViewDto {
  id: string;
  cupMatchId: string;
  marketType: string;
  marketTypeLabel: string;
  outcomeLabels: string[];
  marketId: string;
  matchId: string;
  home: { code: string; name: string };
  away: { code: string; name: string };
  stage: string;
  venue: string;
  kickoffUtc: string;
  closeTime: number | null;
  matchStatus: CupMatchDto['status'];
  marketStatus: MarketStatusDto;
  pools: { home: string; draw: string; away: string; total: string };
  impliedOdds: { home: number; draw: number; away: number };
  winningOutcome: number | null;
}

export interface MarketDetailDto extends MarketViewDto {
  settlementToken: string | null;
  aiEdge: CupAiEdgeDto | null;
  aiFairOdds: { home: number; draw: number; away: number } | null;
  oracle: CupOnchainMatchDto | null;
  contract: ParimutuelContractDto;
}

export interface MarketPositionDto {
  marketId: string;
  wallet: string;
  status:
    | 'contract_not_deployed'
    | 'no_position'
    | 'open'
    | 'pending_settlement'
    | 'won_claimable'
    | 'won_claimed'
    | 'lost'
    | 'refund_claimable'
    | 'refunded';
  stake: { home: string; draw: string; away: string };
  claimableEstimate: string;
}

export interface UnsignedTxDto {
  to: string;
  data: string;
  value: string;
  chainId: number;
}

export interface SwapStakeStepDto {
  kind: 'dex-approve' | 'swap' | 'market-approve' | 'stake';
  to: string;
  data: string;
  value: string;
  label: string;
}

export interface MarketIndexerStatusDto {
  deployed: boolean;
  contract: string | null;
  dbConfigured: boolean;
  backfilled: boolean;
  lastBlock: number;
  markets: number;
  stakes: number;
  claims: number;
}

// === Hermes AI pundit (Plan 5) ===
export interface PunditPickDto {
  matchId: string;
  label: string;
  home: { code: string; name: string };
  away: { code: string; name: string };
  kickoffUtc: string;
  pick: 'HOME' | 'DRAW' | 'AWAY' | 'PASS';
  conviction: number;
  take: string;
  keyFactors: string[];
  source: 'hermes-claude' | 'heuristic';
  generatedAt: string;
}

export interface PunditProfileDto {
  name: string;
  role: string;
  mode: 'hermes-claude' | 'heuristic';
  model: string | null;
  bio: string;
}

export interface FreePickDto {
  id: string;
  fixtureId: string;
  wallet: string;
  outcome: 'HOME' | 'DRAW' | 'AWAY';
  points: number;
  resolvedCorrect: boolean | null;
  createdAt: string;
  scoredAt: string | null;
}

export interface LeaderboardRowDto {
  rank: number;
  wallet: string;
  isHermes: boolean;
  picks: number;
  correct: number;
  accuracy: number;
  points: number;
}

export interface LeagueDto {
  id: string;
  name: string;
  ownerWallet: string;
  inviteCode: string;
  members: string[];
  createdAt: string;
}

export interface BracketDto {
  wallet: string;
  picks: Record<string, 'HOME' | 'DRAW' | 'AWAY'>;
  createdAt: string;
  updatedAt: string;
}
export interface BracketScoreboardDto {
  bracket: BracketDto | null;
  you: { total: number; scored: number; correct: number };
  hermes: { total: number; scored: number; correct: number };
}

export interface BracketNftDto {
  metadata: {
    name: string;
    status: string;
    address: string | null;
    chainId: number;
    network: string;
    explorerUrl: string | null;
    sourcePath: string;
  };
  mintedTokenId: number;
  mintTx: { to: string; data: string; value: string; chainId: number } | null;
}

export interface XPostDto {
  matchId: string;
  text: string;
  status: 'posted' | 'skipped' | 'failed';
  tweetId: string | null;
  reason: string;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      detail = body.detail ?? body.error;
    } catch {
      /* */
    }
    throw new ApiError(`${path} -> ${res.status}`, res.status, detail);
  }
  return (await res.json()) as T;
}

export const api = {
  chat: (message: string, history?: { role: 'user' | 'assistant'; content: string }[], sessionId?: string) =>
    request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, sessionId }),
    }),

  chatHistory: () =>
    request<{ messages: import('../store/chatStore').ChatMessage[] }>('/chat/history'),

  clearChatHistory: () =>
    request<{ ok: true }>('/chat/history', { method: 'DELETE' }),

  saveMessages: (messages: import('../store/chatStore').ChatMessage[]) =>
    request<{ ok: true }>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),

  listSessions: () =>
    request<{ sessions: SessionMeta[] }>('/chat/sessions'),

  createSession: (title?: string) =>
    request<{ session: SessionMeta }>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  loadSession: (id: string) =>
    request<{ messages: import('../store/chatStore').ChatMessage[] }>(`/chat/sessions/${id}`),

  deleteSession: (id: string) =>
    request<{ ok: true }>(`/chat/sessions/${id}`, { method: 'DELETE' }),

  portfolio: (address?: string) =>
    request<PortfolioResponse>('/status/portfolio' + (address ? `?address=${encodeURIComponent(address)}` : '')),

  x402Log: () => request<{ calls: X402CallLogEntry[] }>('/status/x402-log'),

  economy: () => request<EconomySnapshotDto>('/status/economy'),

  swap: (from: string, to: string, rawAmount: string) =>
    request<SwapResultDto>('/swap', {
      method: 'POST',
      body: JSON.stringify({ from, to, amount: rawAmount }),
    }),

  swapQuote: (from: string, to: string, amountRaw: string) =>
    request<SwapQuoteDto>(`/swap/quote?from=${from}&to=${to}&amount=${amountRaw}`),

  security: (tokenSymbolOrAddress: string) =>
    request<TokenSecurityDto>(`/status/security?token=${encodeURIComponent(tokenSymbolOrAddress)}`),

  configureEconomy: (config: { autoDeployEnabled?: boolean; threshold?: number }) =>
    request<{ ok: true; autoDeployEnabled: boolean; threshold: number }>('/status/economy/configure', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  triggerDeploy: (opts: { force?: boolean; fraction?: number } = {}) =>
    request<TriggerDeployDto>('/status/economy/trigger-deploy', {
      method: 'POST',
      body: JSON.stringify(opts),
    }),

  deployHistory: () =>
    request<{ deploys: DeployEventDto[] }>('/status/economy/history'),

  activity: () => request<ActivitySnapshotDto>('/status/activity'),

  pools: () => request<{ pools: PoolStatDto[]; source: string; dexNetwork: string }>('/status/pools'),

  cupOverview: () => request<CupOverviewDto>('/cup/overview'),
  cupContract: () => request<CupOracleContractDto>('/cup/contract'),
  cupReadiness: () => request<CupReadinessDto>('/cup/readiness'),
  cupAdapters: () => request<CupAdapterOverviewDto>('/cup/adapters'),
  cupPersistence: () => request<CupPersistenceHealthDto>('/cup/persistence'),
  cupTrackProof: () => request<CupTrackProofDto>('/cup/track-proof'),
  cupFixtures: () => request<{ fixtures: CupMatchDto[] }>('/cup/fixtures'),
  cupAiEdge: (matchId: string) =>
    request<CupAiEdgeDto>(`/cup/ai-edge?matchId=${encodeURIComponent(matchId)}`),
  cupFairOdds: (matchId: string) =>
    request<CupFairOddsDto>(`/cup/fair-odds?matchId=${encodeURIComponent(matchId)}`),
  cupSettlementCheck: (matchId: string) =>
    request<CupSettlementCheckDto>(`/cup/settlement-check?matchId=${encodeURIComponent(matchId)}`),
  cupSentiment: (matchId: string) =>
    request<CupSentimentDto>(`/cup/sentiment?matchId=${encodeURIComponent(matchId)}`),
  cupTeamStrength: (matchId: string) =>
    request<CupTeamStrengthDto>(`/cup/team-strength?matchId=${encodeURIComponent(matchId)}`),
  cupPlayerStats: (matchId: string) =>
    request<CupPlayerStatsDto>(`/cup/player-stats?matchId=${encodeURIComponent(matchId)}`),
  cupResult: (matchId: string) =>
    request<{ matchId: string; status: string; score: { home: number; away: number } | null; settlement: CupMatchDto['settlement']; receipts: CupSourceReceiptDto[] }>(
      `/cup/result/${encodeURIComponent(matchId)}`,
    ),
  cupOnchainMatch: (matchId: string) =>
    request<CupOnchainMatchDto>(`/cup/onchain/${encodeURIComponent(matchId)}`),
  cupSettlementLog: (matchId?: string) =>
    request<{ events: CupSettlementLogEntryDto[] }>(
      `/cup/settlement-log${matchId ? `?matchId=${encodeURIComponent(matchId)}` : ''}`,
    ),
  cupFanScore: (wallet: string) =>
    request<FanScoreDto>(`/cup/fan-score?wallet=${encodeURIComponent(wallet)}`),
  cupFanPassSbtEligibility: (wallet: string) =>
    request<FanPassSbtEligibilityDto>(`/cup/fanpass/sbt-eligibility?wallet=${encodeURIComponent(wallet)}`),
  cupFanPassSbtMint: (wallet: string, adminKey?: string) =>
    request<FanPassSbtMintDto>('/cup/fanpass/sbt-mint', {
      method: 'POST',
      headers: adminKey ? { 'X-CUP-ADMIN-KEY': adminKey } : undefined,
      body: JSON.stringify({ wallet }),
    }),
  cupFantasyQuest: (matchId: string, wallet: string) =>
    request<CupFantasyQuestDto>(`/cup/fantasy-quest?matchId=${encodeURIComponent(matchId)}&wallet=${encodeURIComponent(wallet)}`),
  cupActionPlan: (matchId: string, mode: 'builder' | 'agent' | 'fan' = 'builder') =>
    request<CupActionPlanDto>('/cup/action-plan', {
      method: 'POST',
      body: JSON.stringify({ matchId, mode }),
    }),
  cupProposeResult: (matchId: string, outcome: CupOutcome) =>
    request<CupOracleTxDto>('/cup/propose-result', {
      method: 'POST',
      body: JSON.stringify({ matchId, outcome }),
    }),
  cupChallengeResult: (matchId: string) =>
    request<CupOracleTxDto>('/cup/challenge-result', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    }),
  cupFinalizeResult: (matchId: string) =>
    request<CupOracleTxDto>('/cup/finalize-result', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    }),

  // X Cup prediction market
  markets: () => request<{ markets: MarketViewDto[]; contract: ParimutuelContractDto }>('/markets'),
  market: (id: string) => request<MarketDetailDto>(`/markets/${encodeURIComponent(id)}`),
  marketPosition: (id: string, wallet: string) =>
    request<MarketPositionDto>(`/markets/${encodeURIComponent(id)}/position?wallet=${encodeURIComponent(wallet)}`),
  marketIndexer: () => request<MarketIndexerStatusDto>('/markets/indexer'),
  marketAllowance: (wallet: string) =>
    request<{ wallet: string; allowance: string | null }>(`/markets/allowance?wallet=${encodeURIComponent(wallet)}`),
  marketStakeTx: (id: string, outcome: number, amount: string) =>
    request<{ approveTx: UnsignedTxDto; stakeTx: UnsignedTxDto }>(`/markets/${encodeURIComponent(id)}/stake-tx`, {
      method: 'POST',
      body: JSON.stringify({ outcome, amount }),
    }),
  marketSwapStakeTx: (
    id: string,
    body: { fromToken: string; amount: string; outcome: number; wallet: string },
  ) =>
    request<{ steps: SwapStakeStepDto[]; estimatedUsdt: string; minUsdt: string; settlementToken: string }>(
      `/markets/${encodeURIComponent(id)}/swap-stake-tx`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  marketClaimTx: (id: string) =>
    request<{ claimTx: UnsignedTxDto }>(`/markets/${encodeURIComponent(id)}/claim-tx`),
  cupPundit: () => request<{ profile: PunditProfileDto; picks: PunditPickDto[] }>('/cup/pundit'),
  cupPunditPick: (matchId: string) =>
    request<PunditPickDto>(`/cup/pundit/${encodeURIComponent(matchId)}`),
  cupPunditXPosts: () => request<{ posts: XPostDto[] }>('/cup/pundit/x-posts'),
  cupLeaderboard: () =>
    request<{ rows: LeaderboardRowDto[]; hermes: LeaderboardRowDto | null }>('/cup/leaderboard'),
  cupBracket: (wallet: string) =>
    request<BracketScoreboardDto>(`/cup/bracket?wallet=${encodeURIComponent(wallet)}`),
  saveBracket: (wallet: string, picks: Record<string, 'HOME' | 'DRAW' | 'AWAY'>) =>
    request<{ bracket: BracketDto }>('/cup/bracket', {
      method: 'POST',
      body: JSON.stringify({ wallet, picks }),
    }),
  cupBracketNft: (wallet: string) =>
    request<BracketNftDto>(`/cup/bracket-nft?wallet=${encodeURIComponent(wallet)}`),
  cupLeagues: (wallet: string) =>
    request<{ leagues: LeagueDto[] }>(`/cup/leagues?wallet=${encodeURIComponent(wallet)}`),
  cupLeagueLeaderboard: (id: string) =>
    request<{ league: LeagueDto; rows: LeaderboardRowDto[] }>(
      `/cup/leagues/${encodeURIComponent(id)}/leaderboard`,
    ),
  createLeague: (name: string, wallet: string) =>
    request<{ league: LeagueDto }>('/cup/leagues', {
      method: 'POST',
      body: JSON.stringify({ name, wallet }),
    }),
  joinLeague: (inviteCode: string, wallet: string) =>
    request<{ league: LeagueDto }>('/cup/leagues/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode, wallet }),
    }),
  freePicks: (filter: { wallet?: string; matchId?: string }) => {
    const qs = new URLSearchParams();
    if (filter.wallet) qs.set('wallet', filter.wallet);
    if (filter.matchId) qs.set('matchId', filter.matchId);
    const q = qs.toString();
    return request<{ picks: FreePickDto[] }>(`/cup/free-picks${q ? `?${q}` : ''}`);
  },
  makeFreePick: (fixtureId: string, wallet: string, outcome: 'HOME' | 'DRAW' | 'AWAY') =>
    request<{ pick: FreePickDto }>('/cup/free-picks', {
      method: 'POST',
      body: JSON.stringify({ fixtureId, wallet, outcome }),
    }),
  marketPositions: (wallet: string) =>
    request<{ wallet: string; positions: (MarketPositionDto & { market: MarketViewDto })[] }>(
      `/markets/positions?wallet=${encodeURIComponent(wallet)}`,
    ),
  // X Layer token universe via OKX getAllTokens (refreshed every 10 minutes)
  catalog: (q?: string, limit = 50) =>
    request<CatalogResponseDto>(
      `/market/catalog?limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
    ),
  resolveToken: (input: string) =>
    request<CatalogTokenDto>(`/market/catalog/resolve?input=${encodeURIComponent(input)}`),

  x402Spec: () => request<X402SpecDto>('/v1/x402-spec'),

  // Strategy engine
  listStrategies: () =>
    request<{ strategies: StrategyDto[]; status: { running: boolean; activeStrategies: number } }>(
      '/strategies',
    ),
  createStrategy: (body: StrategyCreateBody) =>
    request<{ ok: true; strategy: StrategyDto }>('/strategies', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  setStrategyEnabled: (id: string, enabled: boolean) =>
    request<{ ok: true; strategy: StrategyDto }>(`/strategies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  deleteStrategy: (id: string) =>
    request<{ ok: true }>(`/strategies/${id}`, { method: 'DELETE' }),
  strategyFires: () => request<{ fires: StrategyFireDto[] }>('/strategies/fires'),

  heartbeat: () =>
    request<{ running: boolean; count: number; lastAt: number; lastTxHash: string | null; intervalMs: number }>('/status/heartbeat'),

  portfolioHistory: () =>
    request<{ history: { timestamp: number; totalUsd: number }[] }>('/status/portfolio/history'),

  updateSessionTitle: (id: string, title: string) =>
    request<{ ok: true }>(`/chat/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
};
