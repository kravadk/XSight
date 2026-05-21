import { getAddress } from 'ethers';
import { x402Log } from '../middleware/x402.js';
import { recordActivity } from './activityTracker.js';
import { getProvider } from './wallet.js';

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

export async function getFanScore(rawWallet: string): Promise<FanScore | null> {
  let wallet: string;
  try {
    wallet = getAddress(rawWallet);
  } catch {
    return null;
  }

  recordActivity('cup.fanScore', wallet.slice(0, 10));
  const paidCalls = x402Log.filter((c) => c.status === 'paid' && c.caller.toLowerCase() === wallet.toLowerCase()).length;
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

  const x402Usage = Math.min(30, paidCalls * 4);
  const cupScore = 0;
  const oracleParticipation = 0;
  const onchainActivity = Math.min(34, txCount * 2 + (balanceWei > 0n ? 4 : 0));
  const consistency = paidCalls > 0 && txCount > 0 ? 12 : 0;
  const score = Math.min(100, Math.round(x402Usage + cupScore + onchainActivity + consistency + oracleParticipation));
  const level = score >= 82 ? 'oracle-grade' : score >= 64 ? 'trusted' : score >= 28 ? 'active' : 'unknown';

  return {
    wallet,
    score,
    level,
    breakdown: {
      x402Usage,
      cupInteractions: cupScore,
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
