/**
 * marketService — joins the CupHub fixture feed with indexed ParimutuelMarket on-chain
 * state into the shape the frontend renders (DESIGN §5/§6).
 *
 * NO MOCKS: pools/odds come from real indexed events; positions from real contract
 * reads. Before the contract is deployed every market is honestly
 * `contract_not_deployed` — never a fabricated pool.
 */
import { getCupAiEdge, getCupFeed, getCupMatch, type CupMatch } from './cupData.js';
import { cupOracleMetadata, readCupOracleMatch } from './cupOracleContract.js';
import { deriveMarketId, encodeMatchId, encodeMarketKey, decodeMarketKey } from '../utils/cupIds.js';
import { MARKET_TYPES, MARKET_TYPE_IDS, isMarketTypeId, type MarketTypeId } from './marketTypes.js';
import { getIndexedMarket, marketIdsForWallet } from './marketIndexer.js';
import {
  buildApproveTx,
  buildStakeTx,
  createMarketTx,
  hasClaimed,
  parimutuelMetadata,
  readAllowance,
  readMarket,
  readSettlementToken,
  readStakeOf,
  settleMarketTx,
} from './parimutuelContract.js';
import { getSwapTx } from './onchainos.js';
import { env } from '../config/env.js';

export type MarketStatus =
  | 'contract_not_deployed'
  | 'market_not_created'
  | 'open'
  | 'awaiting_settlement'
  | 'settled'
  | 'refund';

export interface MarketView {
  id: string; // composite (fixture × market type) key — the route param
  cupMatchId: string; // the underlying CupHub fixture id
  marketType: string; // 1X2 | OU25 | BTTS
  marketTypeLabel: string;
  outcomeLabels: string[]; // labels for contract outcomes 1..N
  marketId: string; // bytes32 ParimutuelMarket id
  matchId: string; // bytes32 CupOracle id
  home: { code: string; name: string };
  away: { code: string; name: string };
  stage: string;
  venue: string;
  kickoffUtc: string;
  closeTime: number | null;
  matchStatus: CupMatch['status'];
  marketStatus: MarketStatus;
  // pools/odds are slot-indexed (home=1, draw=2, away=3); a 2-outcome type leaves slot 3 at 0.
  pools: { home: string; draw: string; away: string; total: string };
  impliedOdds: { home: number; draw: number; away: number };
  winningOutcome: number | null;
}

function fraction(part: bigint, total: bigint): number {
  if (total === 0n) return 0;
  return Math.round(Number((part * 10_000n) / total)) / 10_000;
}

function buildMarketView(match: CupMatch, marketType: MarketTypeId): MarketView {
  const key = encodeMarketKey(match.id, marketType);
  const def = MARKET_TYPES[marketType];
  const marketId = deriveMarketId(key);
  const matchId = encodeMatchId(key);
  const deployed = Boolean(parimutuelMetadata().address);
  const indexed = getIndexedMarket(marketId);
  const kickoffMs = Date.parse(match.kickoffUtc);
  // The real close is whatever the operator set on-chain; before the market exists,
  // project it as kickoff minus the close buffer.
  const projectedClose = Number.isFinite(kickoffMs)
    ? Math.floor(kickoffMs / 1000) - env.marketCloseBufferSeconds
    : null;
  const closeTime = indexed && indexed.closeTime > 0 ? indexed.closeTime : projectedClose;
  const nowSec = Math.floor(Date.now() / 1000);

  let marketStatus: MarketStatus;
  let pools = { home: '0', draw: '0', away: '0', total: '0' };
  let impliedOdds = { home: 0, draw: 0, away: 0 };
  let winningOutcome: number | null = null;

  if (!deployed) {
    marketStatus = 'contract_not_deployed';
  } else if (!indexed || indexed.createdBlock === 0) {
    marketStatus = 'market_not_created';
  } else {
    pools = {
      home: indexed.poolHome.toString(),
      draw: indexed.poolDraw.toString(),
      away: indexed.poolAway.toString(),
      total: indexed.totalPool.toString(),
    };
    impliedOdds = {
      home: fraction(indexed.poolHome, indexed.totalPool),
      draw: fraction(indexed.poolDraw, indexed.totalPool),
      away: fraction(indexed.poolAway, indexed.totalPool),
    };
    if (indexed.settled) {
      marketStatus = indexed.refundMode ? 'refund' : 'settled';
      winningOutcome = indexed.winningOutcome;
    } else if (closeTime !== null && nowSec >= closeTime) {
      marketStatus = 'awaiting_settlement';
    } else {
      marketStatus = 'open';
    }
  }

  return {
    id: key,
    cupMatchId: match.id,
    marketType,
    marketTypeLabel: def.label,
    outcomeLabels: [...def.outcomes],
    marketId,
    matchId,
    home: { code: match.home.code, name: match.home.name },
    away: { code: match.away.code, name: match.away.name },
    stage: match.stage,
    venue: match.venue,
    kickoffUtc: match.kickoffUtc,
    closeTime,
    matchStatus: match.status,
    marketStatus,
    pools,
    impliedOdds,
    winningOutcome,
  };
}

/** Every (CupHub fixture × market type) as a market view. */
export async function listMarkets(): Promise<MarketView[]> {
  const feed = await getCupFeed();
  const views: MarketView[] = [];
  for (const match of feed.fixtures) {
    for (const marketType of MARKET_TYPE_IDS) {
      views.push(buildMarketView(match, marketType));
    }
  }
  return views;
}

/** One market + the inputs the staking panel needs (token, AI fair odds, oracle state). */
export async function getMarketDetail(marketKey: string) {
  const { cupMatchId, marketType } = decodeMarketKey(marketKey);
  if (!isMarketTypeId(marketType)) return null;
  const match = await getCupMatch(cupMatchId);
  if (!match) return null;
  const view = buildMarketView(match, marketType);
  // AI fair odds are a 1X2 signal — only meaningful for the Match Result market.
  const [aiEdge, settlementToken, oracle] = await Promise.all([
    marketType === '1X2' ? getCupAiEdge(cupMatchId) : Promise.resolve(null),
    readSettlementToken(),
    readCupOracleMatch(marketKey),
  ]);
  return {
    ...view,
    settlementToken,
    aiEdge,
    aiFairOdds: aiEdge?.fairProbability ?? null,
    oracle,
    oracleContract: cupOracleMetadata(),
    contract: parimutuelMetadata(),
  };
}

export interface MarketPosition {
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

/** A wallet's position in one market — real contract reads (stakeOf + claimed). */
export async function getPosition(marketKey: string, wallet: string): Promise<MarketPosition | null> {
  const { cupMatchId, marketType } = decodeMarketKey(marketKey);
  if (!isMarketTypeId(marketType)) return null;
  const match = await getCupMatch(cupMatchId);
  if (!match) return null;
  const marketId = deriveMarketId(marketKey);
  const zero = { home: '0', draw: '0', away: '0' };

  if (!parimutuelMetadata().address) {
    return { marketId, wallet, status: 'contract_not_deployed', stake: zero, claimableEstimate: '0' };
  }

  const [stake, claimed] = await Promise.all([readStakeOf(marketId, wallet), hasClaimed(marketId, wallet)]);
  const s = stake ?? zero;
  const staked = BigInt(s.home) + BigInt(s.draw) + BigInt(s.away);
  if (staked === 0n) {
    return { marketId, wallet, status: 'no_position', stake: s, claimableEstimate: '0' };
  }

  const indexed = getIndexedMarket(marketId);
  if (!indexed || !indexed.settled) {
    const closed = Boolean(indexed && indexed.closeTime > 0 && Date.now() / 1000 >= indexed.closeTime);
    return {
      marketId,
      wallet,
      status: closed ? 'pending_settlement' : 'open',
      stake: s,
      claimableEstimate: '0',
    };
  }

  if (indexed.refundMode) {
    return {
      marketId,
      wallet,
      status: claimed ? 'refunded' : 'refund_claimable',
      stake: s,
      claimableEstimate: claimed ? '0' : staked.toString(),
    };
  }

  const won =
    indexed.winningOutcome === 1 ? BigInt(s.home) : indexed.winningOutcome === 2 ? BigInt(s.draw) : BigInt(s.away);
  if (won === 0n) {
    return { marketId, wallet, status: 'lost', stake: s, claimableEstimate: '0' };
  }
  const winningPool =
    indexed.winningOutcome === 1 ? indexed.poolHome : indexed.winningOutcome === 2 ? indexed.poolDraw : indexed.poolAway;
  const payout = winningPool > 0n ? (won * indexed.payoutPool) / winningPool : 0n;
  return {
    marketId,
    wallet,
    status: claimed ? 'won_claimed' : 'won_claimable',
    stake: s,
    claimableEstimate: claimed ? '0' : payout.toString(),
  };
}

export async function getWalletAllowance(wallet: string): Promise<string | null> {
  return readAllowance(wallet);
}

/** Every market the wallet holds a position in — joins indexed stakes back to fixtures. */
export async function listWalletPositions(
  wallet: string,
): Promise<Array<MarketPosition & { market: MarketView }>> {
  if (!parimutuelMetadata().address) return [];
  const staked = new Set(marketIdsForWallet(wallet));
  if (staked.size === 0) return [];
  const feed = await getCupFeed();
  const out: Array<MarketPosition & { market: MarketView }> = [];
  for (const match of feed.fixtures) {
    for (const marketType of MARKET_TYPE_IDS) {
      const key = encodeMarketKey(match.id, marketType);
      if (!staked.has(deriveMarketId(key))) continue;
      const position = await getPosition(key, wallet);
      if (position && position.status !== 'no_position' && position.status !== 'contract_not_deployed') {
        out.push({ ...position, market: buildMarketView(match, marketType) });
      }
    }
  }
  return out;
}

/**
 * Operator: create a ParimutuelMarket on-chain for scheduled fixtures with a future
 * kickoff and no market yet. Gated by CUP_WRITE_API_ENABLED. `limit` caps how many
 * markets are created in one call (fixtures are kickoff-sorted, soonest first) — keep
 * the gas/time bounded. Existence is checked on-chain (`readMarket`), so it is safe to
 * re-run.
 */
export async function ensureMarketsForUpcomingFixtures(limit?: number): Promise<{
  created: Array<{ id: string; txHash: string }>;
  skipped: Array<{ id: string; reason: string }>;
}> {
  const created: Array<{ id: string; txHash: string }> = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  if (!parimutuelMetadata().address) {
    return { created, skipped: [{ id: '-', reason: 'contract_not_deployed' }] };
  }
  if (!env.cupWriteApiEnabled) {
    return { created, skipped: [{ id: '-', reason: 'write_api_disabled' }] };
  }
  const feed = await getCupFeed();
  const nowSec = Math.floor(Date.now() / 1000);
  for (const match of feed.fixtures) {
    if (limit !== undefined && created.length >= limit) break;
    const kickoff = Math.floor(Date.parse(match.kickoffUtc) / 1000);
    if (!Number.isFinite(kickoff) || kickoff <= nowSec) {
      skipped.push({ id: match.id, reason: 'kickoff not in the future' });
      continue;
    }
    // Staking closes a buffer before kickoff, not exactly at kickoff.
    const closeTime = kickoff - env.marketCloseBufferSeconds;
    if (closeTime <= nowSec) {
      skipped.push({ id: match.id, reason: 'inside the close buffer — staking already closed' });
      continue;
    }
    // One on-chain market per (fixture × market type) — 1X2, Over/Under 2.5, BTTS.
    for (const marketType of MARKET_TYPE_IDS) {
      if (limit !== undefined && created.length >= limit) break;
      const key = encodeMarketKey(match.id, marketType);
      const marketId = deriveMarketId(key);
      const onchain = await readMarket(marketId);
      if (onchain?.exists) {
        skipped.push({ id: key, reason: 'market already exists' });
        continue;
      }
      try {
        const res = await createMarketTx(marketId, encodeMatchId(key), closeTime);
        created.push({ id: key, txHash: res.txHash });
      } catch (err) {
        skipped.push({ id: key, reason: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  return { created, skipped };
}

/** Operator: settle a market on-chain once its oracle result is finalized. */
export async function settleMarket(cupMatchId: string) {
  return settleMarketTx(deriveMarketId(cupMatchId));
}

export interface SwapStakeStep {
  kind: 'dex-approve' | 'swap' | 'market-approve' | 'stake';
  to: string;
  data: string;
  value: string;
  label: string;
}

/**
 * Build the unsigned step sequence for staking with ANY X Layer token. The OKX
 * DEX aggregator swaps the chosen token into the settlement USDT in the user's
 * OWN wallet, then the usual approve + stake follow. Every step is user-signed —
 * no custody. The bet is staked at the swap's slippage-protected minimum receive,
 * so the stake can never exceed what actually landed; any slippage upside stays
 * with the user.
 */
export async function buildSwapStakeTx(input: {
  cupMatchId: string;
  fromToken: string;
  amount: string; // fromToken base units
  outcome: number;
  wallet: string;
}): Promise<{ steps: SwapStakeStep[]; estimatedUsdt: string; minUsdt: string; settlementToken: string }> {
  const usdt = await readSettlementToken();
  if (!usdt) throw new Error('settlement token unknown — market not deployed');
  if (input.fromToken.toLowerCase() === usdt.toLowerCase()) {
    throw new Error('fromToken is already the settlement token — use /stake-tx directly');
  }
  const marketId = deriveMarketId(input.cupMatchId);
  const swap = await getSwapTx({
    fromToken: input.fromToken,
    toToken: usdt,
    amount: input.amount,
    userAddress: input.wallet,
    slippagePercent: 1,
  });
  const stakeAmount = swap.minReceiveAmount;
  if (!/^\d+$/.test(stakeAmount) || stakeAmount === '0') {
    throw new Error('swap quote produced no receivable USDT');
  }
  const approve = await buildApproveTx(stakeAmount);
  const stake = buildStakeTx(marketId, input.outcome, stakeAmount);
  const steps: SwapStakeStep[] = [
    ...swap.steps,
    { kind: 'market-approve', to: approve.to, data: approve.data, value: approve.value, label: 'Approve USDT for the market' },
    { kind: 'stake', to: stake.to, data: stake.data, value: stake.value, label: 'Stake into the pool' },
  ];
  return { steps, estimatedUsdt: swap.toTokenAmount, minUsdt: stakeAmount, settlementToken: usdt };
}
