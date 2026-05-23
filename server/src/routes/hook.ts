import { Router } from 'express';
import { getAddress } from 'ethers';
import { getFanScore } from '../services/cupReputation.js';

export const hookRouter = Router();

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
