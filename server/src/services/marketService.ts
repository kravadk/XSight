/**
 * marketService — joins the CupHub fixture feed with indexed ParimutuelMarket on-chain
 * state into the shape the frontend renders (DESIGN §5/§6).
 *
 * NO MOCKS: pools/odds come from real indexed events; positions from real contract
 * reads. Before the contract is deployed every market is honestly
 * `contract_not_deployed` — never a fabricated pool.
 */
import { getCupAiEdge, getCupFeed, getCupMatch, type CupMatch } from './cupData.js';
import { readCupOracleMatch } from './cupOracleContract.js';
import { deriveMarketId, encodeMatchId } from '../utils/cupIds.js';
import { getIndexedMarket, marketIdsForWallet } from './marketIndexer.js';
import {
  createMarketTx,
  hasClaimed,
  parimutuelMetadata,
  readAllowance,
  readSettlementToken,
  readStakeOf,
  settleMarketTx,
} from './parimutuelContract.js';
import { env } from '../config/env.js';

export type MarketStatus =
  | 'contract_not_deployed'
  | 'market_not_created'
  | 'open'
  | 'awaiting_settlement'
  | 'settled'
  | 'refund';

export interface MarketView {
  id: string; // CupHub match id (route param)
  marketId: string; // bytes32 ParimutuelMarket id
  matchId: string; // bytes32 CupOracleV2 id
  home: { code: string; name: string };
  away: { code: string; name: string };
  stage: string;
  venue: string;
  kickoffUtc: string;
  closeTime: number | null;
  matchStatus: CupMatch['status'];
  marketStatus: MarketStatus;
  pools: { home: string; draw: string; away: string; total: string };
  impliedOdds: { home: number; draw: number; away: number };
  winningOutcome: number | null;
}

function fraction(part: bigint, total: bigint): number {
  if (total === 0n) return 0;
  return Math.round(Number((part * 10_000n) / total)) / 10_000;
}

function buildMarketView(match: CupMatch): MarketView {
  const marketId = deriveMarketId(match.id);
  const matchId = encodeMatchId(match.id);
  const deployed = Boolean(parimutuelMetadata().address);
  const indexed = getIndexedMarket(marketId);
  const kickoffMs = Date.parse(match.kickoffUtc);
  const closeTime = Number.isFinite(kickoffMs) ? Math.floor(kickoffMs / 1000) : null;
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
    id: match.id,
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

/** Every CupHub fixture as a market view (fixtures + indexed on-chain pools). */
export async function listMarkets(): Promise<MarketView[]> {
  const feed = await getCupFeed();
  return feed.fixtures.map(buildMarketView);
}

/** One market + the inputs the staking panel needs (token, AI fair odds, oracle state). */
export async function getMarketDetail(cupMatchId: string) {
  const match = await getCupMatch(cupMatchId);
  if (!match) return null;
  const view = buildMarketView(match);
  const [aiEdge, settlementToken, oracle] = await Promise.all([
    getCupAiEdge(cupMatchId),
    readSettlementToken(),
    readCupOracleMatch(cupMatchId),
  ]);
  return {
    ...view,
    settlementToken,
    aiEdge,
    aiFairOdds: aiEdge?.fairProbability ?? null,
    oracle,
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
export async function getPosition(cupMatchId: string, wallet: string): Promise<MarketPosition | null> {
  const match = await getCupMatch(cupMatchId);
  if (!match) return null;
  const marketId = deriveMarketId(cupMatchId);
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
    if (!staked.has(deriveMarketId(match.id))) continue;
    const position = await getPosition(match.id, wallet);
    if (position && position.status !== 'no_position' && position.status !== 'contract_not_deployed') {
      out.push({ ...position, market: buildMarketView(match) });
    }
  }
  return out;
}

/**
 * Operator: create a ParimutuelMarket on-chain for every scheduled fixture that has a
 * future kickoff and no market yet. Gated by CUP_WRITE_API_ENABLED.
 */
export async function ensureMarketsForUpcomingFixtures(): Promise<{
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
    const kickoff = Math.floor(Date.parse(match.kickoffUtc) / 1000);
    if (!Number.isFinite(kickoff) || kickoff <= nowSec) {
      skipped.push({ id: match.id, reason: 'kickoff not in the future' });
      continue;
    }
    const marketId = deriveMarketId(match.id);
    if (getIndexedMarket(marketId)?.createdBlock) {
      skipped.push({ id: match.id, reason: 'market already exists' });
      continue;
    }
    try {
      const res = await createMarketTx(marketId, encodeMatchId(match.id), kickoff);
      created.push({ id: match.id, txHash: res.txHash });
    } catch (err) {
      skipped.push({ id: match.id, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return { created, skipped };
}

/** Operator: settle a market on-chain once its oracle result is finalized. */
export async function settleMarket(cupMatchId: string) {
  return settleMarketTx(deriveMarketId(cupMatchId));
}
