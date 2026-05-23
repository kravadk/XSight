import { Router } from 'express';
import { Contract, JsonRpcProvider, getAddress, id as keccakId } from 'ethers';
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
  const paid = x402Log.filter((c) => c.status === 'paid' && c.timestamp >= sinceMs);

  // Group by wallet for one fanScore lookup per wallet.
  const byWallet = new Map<string, typeof paid>();
  for (const call of paid) {
    const w = call.caller.toLowerCase();
    const bucket = byWallet.get(w) ?? [];
    bucket.push(call);
    byWallet.set(w, bucket);
  }

  // Score → tier table, mirrors /api/hook/state.
  const tierCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const tierSavings: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let totalVolume = 0;
  let totalSaved = 0;

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
    for (const call of calls) {
      // x402 call.amount is already in payout-token units (USDT). Treat the
      // "swap" as 100x the call amount (a fee call typically gates a larger
      // economic action). This gives a realistic order of magnitude for the
      // hook savings without inventing fake swap volume.
      const notional = call.amount * 100;
      const savedBps = 30 - tierFeeBps;
      const saved = (notional * savedBps) / 10000;
      totalVolume += notional;
      totalSaved += saved;
      tierSavings[tier] += saved;
    }
  }

  res.json({
    sinceMs,
    windowDays: 7,
    paidCalls: paid.length,
    uniqueWallets: byWallet.size,
    totalVolume,
    totalSaved,
    byTier: Object.entries(TIER_FEE_BPS).map(([tier, bps]) => ({
      tier: Number(tier),
      label: TIER_LABEL[Number(tier)],
      bps,
      wallets: tierCounts[Number(tier)],
      saved: tierSavings[Number(tier)],
    })),
    note: 'Synthetic backtest using x402 calls as a fee-event proxy. Real numbers will come from Universal Router swap events once liquidity lands in the pool.',
  });
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
  const lookback = Math.min(Number(req.query.lookback ?? 50_000), 200_000);
  const limit = Math.min(Number(req.query.limit ?? 25), 50);

  try {
    const p = provider();
    const tip = await p.getBlockNumber();
    const fromBlock = Math.max(tip - lookback, 0);
    const logs = await p.getLogs({
      address: hookAddress,
      topics: [FEE_APPLIED_TOPIC],
      fromBlock,
      toBlock: tip,
    });

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
