import { getAddress } from 'ethers';
import { x402Log } from '../middleware/x402.js';
import { recordActivity } from './activityTracker.js';
import { getProvider } from './wallet.js';
import { getBracket } from './bracketStore.js';
import { listFreePicks } from './freePickStore.js';
import { countLeaguesByMember } from './leagueStore.js';
import { countStakesByWallet, countClaimsByWallet } from './marketStore.js';

export interface FanScore {
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

/**
 * FanPass score. Every dimension is driven by observable user activity so the
 * five axes actually move. Caps keep the score bounded:
 *
 *   x402Usage          (0–20)  paid x402 calls from this wallet         → 4 pts each
 *   cupInteractions    (0–40)  bracket picks + free picks + leagues     → see below
 *   onchainActivity    (0–20)  X Layer tx count + balance>0 bonus
 *   consistency        (0–10)  +5 if x402+onchain both >0; +5 if cup-interaction+onchain both >0
 *   oracleParticipation (0–30) on-chain pari-mutuel stakes + claims     → 5/3 pts each
 *
 *   total max 120, clamped to 100. Threshold for FanPass SBT is 35.
 */
export async function getFanScore(rawWallet: string): Promise<FanScore | null> {
  let wallet: string;
  try {
    wallet = getAddress(rawWallet);
  } catch {
    return null;
  }

  recordActivity('cup.fanScore', wallet.slice(0, 10));
  const walletLower = wallet.toLowerCase();
  const paidCalls = x402Log.filter((c) => c.status === 'paid' && c.caller.toLowerCase() === walletLower).length;

  let txCount = 0;
  let balanceWei = 0n;
  try {
    const provider = getProvider();
    [txCount, balanceWei] = await Promise.all([
      provider.getTransactionCount(wallet),
      provider.getBalance(wallet),
    ]);
  } catch {
    txCount = 0;
    balanceWei = 0n;
  }

  // Cup interactions: count product-engagement signals (off-chain product data).
  const bracket = getBracket(walletLower);
  const bracketPicks = bracket ? Object.keys(bracket.picks).length : 0;
  const freePicks = listFreePicks({ wallet: walletLower }).length;
  const leagues = countLeaguesByMember(walletLower);

  // Oracle participation: on-chain stake/claim events from the indexer.
  let onchainStakes = 0;
  let onchainClaims = 0;
  try {
    [onchainStakes, onchainClaims] = await Promise.all([
      countStakesByWallet(walletLower),
      countClaimsByWallet(walletLower),
    ]);
  } catch {
    onchainStakes = 0;
    onchainClaims = 0;
  }

  const x402Usage = Math.min(20, paidCalls * 4);
  const cupInteractions = Math.min(
    40,
    Math.min(24, bracketPicks * 2) + Math.min(10, freePicks * 1) + Math.min(20, leagues * 10),
  );
  const onchainActivity = Math.min(20, txCount * 2 + (balanceWei > 0n ? 4 : 0));
  const oracleParticipation = Math.min(30, Math.min(20, onchainStakes * 5) + Math.min(10, onchainClaims * 3));
  const consistency =
    (x402Usage > 0 && onchainActivity > 0 ? 5 : 0) + (cupInteractions > 0 && onchainActivity > 0 ? 5 : 0);

  const score = Math.min(
    100,
    Math.round(x402Usage + cupInteractions + onchainActivity + consistency + oracleParticipation),
  );
  const level = score >= 82 ? 'oracle-grade' : score >= 64 ? 'trusted' : score >= 28 ? 'active' : 'unknown';

  return {
    wallet,
    score,
    level,
    breakdown: {
      x402Usage,
      cupInteractions,
      onchainActivity,
      consistency,
      oracleParticipation,
    },
    gates: [
      score >= 25 ? 'Can enter basic fan quests' : 'Needs verified CupHub or X Layer activity',
      score >= 50 ? 'Eligible for active fan rewards' : 'Not yet eligible for active fan rewards',
      score >= 75 ? 'Eligible to propose/challenge high-trust outcomes' : 'Read-only oracle consumer tier',
    ],
    verdict:
      score >= 75
        ? 'Strong fan identity with enough real activity for high-trust gates.'
        : score >= 50
          ? 'Useful active-fan signal, but keep payout limits conservative.'
          : 'Unknown or early wallet. Use low-value quests until real CupHub or X Layer activity accumulates.',
  };
}
