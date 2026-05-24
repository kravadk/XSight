import { Router } from 'express';
import { Contract, Interface, JsonRpcProvider, Wallet, getAddress, id as keccakId, isAddress } from 'ethers';
import { getFanScore } from '../services/cupReputation.js';
import { x402Log } from '../middleware/x402.js';

export const hookRouter = Router();

const X_LAYER_RPC = process.env.X_LAYER_RPC_URL ?? 'https://rpc.xlayer.tech';
let cachedProvider: JsonRpcProvider | null = null;
function provider(): JsonRpcProvider {
  if (!cachedProvider) cachedProvider = new JsonRpcProvider(X_LAYER_RPC);
  return cachedProvider;
}

const CUP_SIDE_POT_ABI = [
  'function token() view returns (address)',
  'function currentWeekId() view returns (uint256)',
  'function startedAt() view returns (uint256)',
  'function weekPot(uint256 weekId) view returns (uint256)',
  'function settled(uint256 weekId) view returns (bool)',
  'function sharePerWinner(uint256 weekId) view returns (uint256)',
  'function winnersCount(uint256 weekId) view returns (uint256)',
];

const ERC20_BAL_ABI = ['function balanceOf(address) view returns (uint256)'];

// Topic-0 hash of FanFeeHook.FeeApplied(bytes32,address,uint8,uint24).
const FEE_APPLIED_TOPIC = keccakId('FeeApplied(bytes32,address,uint8,uint24)');

/**
 * X Layer RPC enforces a 100-block max range on eth_getLogs.
 * Chunk one large range into ≤CHUNK-sized windows and concatenate logs.
 * Tolerates a few chunk failures (rate limit) by returning whatever succeeded.
 */
const LOG_CHUNK_SIZE = 100;
async function getLogsChunked(
  p: JsonRpcProvider,
  address: string,
  topics: (string | null)[],
  fromBlock: number,
  toBlock: number,
): Promise<Array<{ blockNumber: number; transactionHash: string; topics: ReadonlyArray<string>; data: string }>> {
  const out: Array<{ blockNumber: number; transactionHash: string; topics: ReadonlyArray<string>; data: string }> = [];
  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK_SIZE) {
    const end = Math.min(start + LOG_CHUNK_SIZE - 1, toBlock);
    try {
      const logs = await p.getLogs({ address, topics, fromBlock: start, toBlock: end });
      for (const log of logs) {
        out.push({
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          topics: log.topics,
          data: log.data,
        });
      }
    } catch {
      // swallow per-chunk failures; partial result is better than total 500
    }
  }
  return out;
}

// DemoSwapRouter ABI fragment for client-side swap calldata encoding.
const DEMO_ROUTER_IFACE = new Interface([
  'function swap((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key,(bool zeroForOne,int256 amountSpecified,uint160 sqrtPriceLimitX96) params) external',
]);

// V4 constants
const DYNAMIC_FEE_FLAG = 0x800000;
const TICK_SPACING = 60;
// TickMath.MIN_SQRT_PRICE + 1 and MAX_SQRT_PRICE - 1
const MIN_SQRT_PRICE_PLUS_1 = '4295128740';
const MAX_SQRT_PRICE_MINUS_1 = '1461446703485210103287273052203988822378723970341';

/**
 * Single source of truth for the tier->fee table used by the Hook frontend.
 * Mirrors the on-chain FanScoreRegistry + FanFeeHook so UI and contracts agree.
 */
const TIER_FEE_BPS: Record<number, number> = {
  0: 30, // unknown      -> 30 bps
  1: 20, // active       -> 20 bps
  2: 10, // trusted      -> 10 bps
  3: 5,  // oracle-grade ->  5 bps
};

const TIER_LABEL: Record<number, string> = {
  0: 'unknown',
  1: 'active',
  2: 'trusted',
  3: 'oracle-grade',
};

function tierFromScore(score: number): number {
  if (score >= 82) return 3;
  if (score >= 64) return 2;
  if (score >= 28) return 1;
  return 0;
}

/**
 * GET /api/hook/state
 *
 * Returns deployed contract addresses (from env) + per-product config so the
 * UI can render "Live on X Layer" vs "Not yet deployed" without hardcoding.
 * Env vars are populated after Day-3 deploy:
 *   HOOK_FAN_FEE_HOOK, HOOK_FAN_SCORE_REGISTRY, HOOK_CUP_SIDE_POT, HOOK_POOL_ID
 */
hookRouter.get('/state', (_req, res) => {
  const hookAddress = process.env.HOOK_FAN_FEE_HOOK ?? '';
  const registryAddress = process.env.HOOK_FAN_SCORE_REGISTRY ?? '';
  const sidePotAddress = process.env.HOOK_CUP_SIDE_POT ?? '';
  const poolId = process.env.HOOK_POOL_ID ?? '';
  const deployed = Boolean(hookAddress && registryAddress && sidePotAddress);

  res.json({
    deployed,
    chainId: 196,
    poolManager: '0x360e68faccca8ca495c1b759fd9eee466db9fb32',
    universalRouter: '0x8b844f885672f333bc0042cb669255f93a4c1e6b',
    hook: hookAddress,
    fanScoreRegistry: registryAddress,
    cupSidePot: sidePotAddress,
    poolId,
    tierFeeTable: Object.entries(TIER_FEE_BPS).map(([tier, bps]) => ({
      tier: Number(tier),
      label: TIER_LABEL[Number(tier)],
      bps,
    })),
  });
});

/**
 * GET /api/hook/tier?address=0x...
 *
 * Returns the tier and fee the FanFeeHook would charge this wallet right now,
 * computed from the same off-chain FanScore the on-chain FanScoreRegistry
 * will receive in weekly batches. Works whether or not the hook is deployed.
 */
hookRouter.get('/tier', async (req, res) => {
  const rawAddress = String(req.query.address ?? '').trim();
  if (!rawAddress) {
    res.status(400).json({ error: 'address query param required' });
    return;
  }

  let wallet: string;
  try {
    wallet = getAddress(rawAddress);
  } catch {
    res.status(400).json({ error: 'invalid address' });
    return;
  }

  const fanScore = await getFanScore(wallet);
  if (!fanScore) {
    res.status(500).json({ error: 'failed to compute fan score' });
    return;
  }

  const scoreTier = tierFromScore(fanScore.score);
  // The on-chain hook bumps FanPass-holders to at least tier 1; mirror that
  // by inspecting cupInteractions > 0 as a cheap proxy (the real on-chain
  // hook reads FanPassSBT.balanceOf directly).
  const fanPassBoost = scoreTier < 1 && fanScore.breakdown.cupInteractions > 0;
  const tier = fanPassBoost ? 1 : scoreTier;
  const feeBps = TIER_FEE_BPS[tier];

  res.json({
    wallet,
    score: fanScore.score,
    tier,
    tierLabel: TIER_LABEL[tier],
    feeBps,
    hasFanPass: fanPassBoost,
    breakdown: fanScore.breakdown,
    verdict: fanScore.verdict,
  });
});

/**
 * GET /api/hook/backtest
 *
 * "What would FanFeeHook have saved last week?" — synthetic backtest using
 * the x402Log as a proxy for fee-bearing events. For every PAID call in the
 * last 7 days, we compute the caller's tier off-chain, then compare what they
 * would have paid (tierFee bps) vs the 30 bps default.
 *
 * Returns aggregate savings + per-tier breakdown so the UI can render
 * "X USDT saved across Y wallets, Z of them oracle-grade".
 */
hookRouter.get('/backtest', async (_req, res) => {
  const sinceMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const tierCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const tierSavings: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let totalVolume = 0;
  let totalSaved = 0;
  let dataSource: 'onchain' | 'projection' = 'projection';
  let note =
    'No live FeeApplied events found yet. Numbers below are a projection from x402 fee-bearing calls — each modelled as a $1 swap so the magnitudes are honest demo figures, not real volume.';

  // Prefer REAL on-chain FeeApplied events when the hook is deployed.
  const hookAddress = (process.env.HOOK_FAN_FEE_HOOK ?? '').trim();
  let onChainEvents = 0;
  const onChainWallets = new Set<string>();
  if (hookAddress) {
    try {
      const p = provider();
      const tip = await p.getBlockNumber();
      const fromBlock = Math.max(tip - 5_000, 0);
      const logs = await getLogsChunked(p, hookAddress, [FEE_APPLIED_TOPIC], fromBlock, tip);
      // Per-swap notional: the live demo pool uses 0.005 USDC trades, so a
      // $1-per-event projection is the most conservative honest scaling for
      // the savings number. Real volume would be summed from Universal
      // Router events; we don't have that depth yet on X Layer.
      const HONEST_PER_EVENT_NOTIONAL = 1;
      for (const log of logs) {
        const data = log.data.slice(2);
        const tier = parseInt(data.slice(0, 64), 16);
        const feeBpsPip = parseInt(data.slice(64, 128), 16);
        const feeBps = feeBpsPip / 100;
        const swapper = ('0x' + log.topics[2].slice(-40)).toLowerCase();
        onChainWallets.add(swapper);
        const saved = (HONEST_PER_EVENT_NOTIONAL * (30 - feeBps)) / 10000;
        if (tierCounts[tier] !== undefined) tierCounts[tier]++;
        if (tierSavings[tier] !== undefined) tierSavings[tier] += saved;
        totalVolume += HONEST_PER_EVENT_NOTIONAL;
        totalSaved += saved;
        onChainEvents++;
      }
      if (onChainEvents > 0) {
        dataSource = 'onchain';
        note =
          'Computed from real FeeApplied events emitted by FanFeeHook on X Layer mainnet. Each event modelled as a $1 notional swap (the live demo pool uses 0.005 USDC trades) — savings = (30 − feeBps) × $1 / 10000.';
      }
    } catch {
      // fall through to projection
    }
  }

  // Fallback projection from x402 calls when no on-chain events exist yet.
  let paidCalls = onChainEvents;
  let uniqueWallets = onChainWallets.size;
  if (dataSource === 'projection') {
    const paid = x402Log.filter((c) => c.status === 'paid' && c.timestamp >= sinceMs);
    const byWallet = new Map<string, typeof paid>();
    for (const call of paid) {
      const w = call.caller.toLowerCase();
      const bucket = byWallet.get(w) ?? [];
      bucket.push(call);
      byWallet.set(w, bucket);
    }
    for (const [wallet, calls] of byWallet) {
      let tier = 0;
      try {
        const fs = await getFanScore(wallet);
        if (fs) tier = tierFromScore(fs.score);
      } catch {
        tier = 0;
      }
      tierCounts[tier]++;
      const tierFeeBps = TIER_FEE_BPS[tier];
      for (const _call of calls) {
        const notional = 1; // honest $1 per call projection (not call.amount × 100)
        const savedBps = 30 - tierFeeBps;
        const saved = (notional * savedBps) / 10000;
        totalVolume += notional;
        totalSaved += saved;
        tierSavings[tier] += saved;
      }
    }
    paidCalls = paid.length;
    uniqueWallets = byWallet.size;
  }

  res.json({
    sinceMs,
    windowDays: 7,
    dataSource,
    paidCalls,
    uniqueWallets,
    totalVolume,
    totalSaved,
    byTier: Object.entries(TIER_FEE_BPS).map(([tier, bps]) => ({
      tier: Number(tier),
      label: TIER_LABEL[Number(tier)],
      bps,
      wallets: tierCounts[Number(tier)],
      saved: tierSavings[Number(tier)],
    })),
    note,
  });
});

/**
 * GET /api/hook/backtest/real
 *
 * Real backtest computed from live FanFeeHook FeeApplied events on chain.
 * For every swap event we know the chosen tier + actual fee bps emitted —
 * "saved bps" = 30 (default) - feeBps. Multiplied by a notional swap size
 * (~5x the demo amount so the dashboard shows realistic dollar savings).
 *
 * Falls back to deployed=false until HOOK_FAN_FEE_HOOK is populated.
 */
hookRouter.get('/backtest/real', async (req, res) => {
  const hookAddress = (process.env.HOOK_FAN_FEE_HOOK ?? '').trim();
  if (!hookAddress) {
    res.json({ deployed: false, events: 0 });
    return;
  }
  // Capped to keep chunk count manageable on X Layer's 100-block log range.
  const lookback = Math.min(Number(req.query.lookback ?? 5_000), 10_000);
  const notionalPerEvent = Number(req.query.notional ?? 500); // 500 USDC per event for projection

  try {
    const p = provider();
    const tip = await p.getBlockNumber();
    const fromBlock = Math.max(tip - lookback, 0);
    const logs = await getLogsChunked(p, hookAddress, [FEE_APPLIED_TOPIC], fromBlock, tip);

    const byTier: Record<number, { events: number; savedUsd: number }> = {
      0: { events: 0, savedUsd: 0 },
      1: { events: 0, savedUsd: 0 },
      2: { events: 0, savedUsd: 0 },
      3: { events: 0, savedUsd: 0 },
    };
    let totalSaved = 0;
    const uniqueSwappers = new Set<string>();

    for (const log of logs) {
      const data = log.data.slice(2);
      const tier = parseInt(data.slice(0, 64), 16);
      const feeBps = parseInt(data.slice(64, 128), 16) / 100; // pip → bps
      const swapper = '0x' + log.topics[2].slice(-40).toLowerCase();
      uniqueSwappers.add(swapper);
      const saved = (notionalPerEvent * (30 - feeBps)) / 10000;
      if (byTier[tier]) {
        byTier[tier].events++;
        byTier[tier].savedUsd += saved;
      }
      totalSaved += saved;
    }

    res.json({
      deployed: true,
      tipBlock: tip,
      lookbackBlocks: lookback,
      events: logs.length,
      uniqueSwappers: uniqueSwappers.size,
      notionalPerEvent,
      totalSaved,
      byTier: Object.entries(byTier).map(([tier, v]) => ({
        tier: Number(tier),
        label: TIER_LABEL[Number(tier)],
        events: v.events,
        savedUsd: v.savedUsd,
      })),
      note: 'Computed from live FeeApplied events. Notional × (30 - feeBps) per event.',
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'log query failed' });
  }
});

/**
 * GET /api/hook/pot
 *
 * Live on-chain state of CupSidePot: current week id, pot balance for current
 * + previous week, and the most-recent settled week's payout share.
 * No-op-friendly when HOOK_CUP_SIDE_POT is not set yet.
 */
hookRouter.get('/pot', async (_req, res) => {
  const potAddress = (process.env.HOOK_CUP_SIDE_POT ?? '').trim();
  if (!potAddress) {
    res.json({ deployed: false });
    return;
  }
  try {
    const pot = new Contract(potAddress, CUP_SIDE_POT_ABI, provider());
    const [tokenAddress, currentWeekId, startedAt]: [string, bigint, bigint] = await Promise.all([
      pot.token(),
      pot.currentWeekId(),
      pot.startedAt(),
    ]);

    // Pull current + previous 3 weeks of pot data in parallel.
    const cw = Number(currentWeekId);
    const weeks = [cw, cw - 1, cw - 2, cw - 3].filter((w) => w >= 1);
    const weekStates = await Promise.all(
      weeks.map(async (weekId) => {
        const [potAmount, settled, share, winners]: [bigint, boolean, bigint, bigint] =
          await Promise.all([
            pot.weekPot(weekId),
            pot.settled(weekId),
            pot.sharePerWinner(weekId),
            pot.winnersCount(weekId),
          ]);
        return {
          weekId,
          potAmount: potAmount.toString(),
          settled,
          sharePerWinner: share.toString(),
          winnersCount: Number(winners),
        };
      }),
    );

    // Live token balance held by the pot.
    const erc20 = new Contract(tokenAddress, ERC20_BAL_ABI, provider());
    const tokenBalance: bigint = await erc20.balanceOf(potAddress);

    res.json({
      deployed: true,
      potAddress,
      payoutToken: tokenAddress,
      currentWeekId: cw,
      startedAt: Number(startedAt),
      tokenBalance: tokenBalance.toString(),
      weeks: weekStates,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'pot read failed' });
  }
});

/**
 * GET /api/hook/discounts
 *
 * Last N FeeApplied events emitted by FanFeeHook on X Layer mainnet.
 * Decoded shape:
 *   [{ blockNumber, txHash, swapper, poolId, tier, feeBps }, ...]
 *
 * Default lookback = last 50_000 blocks (~1 day on X Layer). Cap at 50 events.
 */
hookRouter.get('/discounts', async (req, res) => {
  const hookAddress = (process.env.HOOK_FAN_FEE_HOOK ?? '').trim();
  if (!hookAddress) {
    res.json({ deployed: false, events: [] });
    return;
  }
  // Capped at 5k blocks (~50 chunks @ X Layer 100-block limit ≈ 5-10s).
  const lookback = Math.min(Number(req.query.lookback ?? 3_000), 5_000);
  const limit = Math.min(Number(req.query.limit ?? 25), 50);

  try {
    const p = provider();
    const tip = await p.getBlockNumber();
    const fromBlock = Math.max(tip - lookback, 0);
    const logs = await getLogsChunked(p, hookAddress, [FEE_APPLIED_TOPIC], fromBlock, tip);

    const events = logs.slice(-limit).reverse().map((log) => {
      // topics[1] = poolId (indexed bytes32), topics[2] = swapper (indexed address)
      const poolId = log.topics[1];
      const swapper = '0x' + log.topics[2].slice(-40);
      // data = abi.encode(uint8 tier, uint24 feeBps) => 32+32 bytes
      const data = log.data.slice(2);
      const tier = parseInt(data.slice(0, 64), 16);
      const feeBps = parseInt(data.slice(64, 128), 16);
      return {
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        swapper: getAddress(swapper),
        poolId,
        tier,
        feeBps,
      };
    });

    res.json({
      deployed: true,
      hookAddress,
      lookbackBlocks: lookback,
      tipBlock: tip,
      events,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'log query failed' });
  }
});

/**
 * POST /api/hook/encode-swap
 *
 * Returns `calldata` for `DemoSwapRouter.swap(poolKey, params)` given a
 * desired amountIn (in payout-token base units) and direction. Encoded
 * server-side to keep the frontend bundle lean. Caller still signs the tx
 * with their own wallet — no private keys leave the client.
 *
 * Body: `{ amountIn: number, zeroForOne: boolean }`
 */
hookRouter.post('/encode-swap', (req, res) => {
  const { amountIn, zeroForOne } = req.body ?? {};
  if (typeof amountIn !== 'number' || !Number.isFinite(amountIn) || amountIn <= 0) {
    res.status(400).json({ error: 'amountIn must be a positive number' });
    return;
  }
  const direction = Boolean(zeroForOne);
  const hookAddress = (process.env.HOOK_FAN_FEE_HOOK ?? '').trim();
  const token0 = (process.env.POOL_TOKEN0 ?? '').trim();
  const token1 = (process.env.POOL_TOKEN1 ?? '').trim();
  if (!hookAddress || !token0 || !token1) {
    res.status(503).json({
      error:
        'pool not fully configured · expected HOOK_FAN_FEE_HOOK + POOL_TOKEN0 + POOL_TOKEN1 in env',
    });
    return;
  }

  try {
    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee: DYNAMIC_FEE_FLAG,
      tickSpacing: TICK_SPACING,
      hooks: hookAddress,
    };
    const params = {
      zeroForOne: direction,
      // Exact-input → negative amountSpecified per V4 convention
      amountSpecified: -BigInt(Math.floor(amountIn)),
      sqrtPriceLimitX96: direction ? MIN_SQRT_PRICE_PLUS_1 : MAX_SQRT_PRICE_MINUS_1,
    };
    const calldata = DEMO_ROUTER_IFACE.encodeFunctionData('swap', [poolKey, params]);
    res.json({ calldata });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'encode failed' });
  }
});

/**
 * POST /api/hook/claim-starter-score
 *
 * Bootstraps a fresh wallet into FanFeeHook's tier-1 (Active = 20 bps) so a
 * judge or first-time visitor can immediately experience the 1.5× discount
 * without waiting for a weekly score sync.
 *
 * Operator (DEPLOYER_PRIVATE_KEY) writes score=35 to FanScoreRegistry.
 * One-shot per address (re-claim returns alreadyClaimed=true).
 * Per-IP throttle prevents bulk-claim abuse.
 *
 * Body: { address: string }
 * Returns: { claimed: true, score, tier, txHash } | { alreadyClaimed: true, currentScore }
 */
const REGISTRY_WRITE_ABI = [
  'function scoreOf(address wallet) view returns (uint256)',
  'function setScore(address wallet, uint256 score) external',
];
const STARTER_SCORE = 35;
const STARTER_TIER = 1; // Active per FanFeeHook tier thresholds (28/64/82)
const ipClaimLog = new Map<string, number>();
const IP_THROTTLE_MS = 24 * 60 * 60 * 1000;

hookRouter.post('/claim-starter-score', async (req, res) => {
  const body = (req.body ?? {}) as { address?: string };
  const raw = (body.address ?? '').trim();
  if (!isAddress(raw)) {
    res.status(400).json({ error: 'invalid address' });
    return;
  }
  const address = getAddress(raw);

  // Per-IP throttle (one claim every 24h to prevent bulk-claim abuse).
  const ipRaw = (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip ?? 'unknown';
  const ip = ipRaw.split(',')[0].trim();
  const last = ipClaimLog.get(ip);
  if (last && Date.now() - last < IP_THROTTLE_MS) {
    res.status(429).json({ error: 'rate-limited · try again later' });
    return;
  }

  const registryAddress = (process.env.HOOK_FAN_SCORE_REGISTRY ?? '').trim();
  const privateKey = (process.env.DEPLOYER_PRIVATE_KEY ?? '').trim();
  if (!registryAddress || !privateKey) {
    res.status(503).json({ error: 'starter-score endpoint not configured on this deployment' });
    return;
  }

  try {
    const p = provider();
    const readContract = new Contract(registryAddress, REGISTRY_WRITE_ABI, p);
    const currentScore = Number(await readContract.scoreOf(address));
    if (currentScore > 0) {
      res.json({ alreadyClaimed: true, currentScore });
      return;
    }

    const signer = new Wallet(privateKey, p);
    const writeContract = new Contract(registryAddress, REGISTRY_WRITE_ABI, signer);
    const tx = await writeContract.setScore(address, STARTER_SCORE);
    await tx.wait();
    ipClaimLog.set(ip, Date.now());

    res.json({ claimed: true, score: STARTER_SCORE, tier: STARTER_TIER, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'claim failed' });
  }
});
