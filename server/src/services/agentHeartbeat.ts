/**
 * Agent Heartbeat — autonomous on-chain activity loop.
 *
 * Runs every 8 minutes and executes a real micro-swap via OnchainOS DEX,
 * independent of user actions or x402 revenue. This demonstrates that the
 * XSight agentic wallet is continuously active on X Layer without requiring
 * human intervention.
 *
 * Every heartbeat tx is recorded in the deploy history and verifiable on the
 * X Layer explorer — contributing to the "Most Active Agent" prize track.
 */

import { getWalletBalances, executeSwap, OnchainOsError } from './onchainos.js';
import { recordDeployment } from './economyLoop.js';
import { recordActivity } from './activityTracker.js';
import { env } from '../config/env.js';
import { TOKEN_ADDRESSES, USDT_DECIMALS } from '../utils/tokens.js';

const HEARTBEAT_INTERVAL_MS = 8 * 60_000; // 8 minutes

/** Minimum USDT to trigger a heartbeat micro-swap. */
const MIN_USDT = 0.001;

/** Fraction of available USDT to deploy on each heartbeat tick. */
const HEARTBEAT_FRACTION = 0.02; // 2% — minimal footprint, high frequency

let intervalHandle: NodeJS.Timeout | null = null;
let heartbeatCount = 0;
let lastHeartbeatAt = 0;
let lastHeartbeatTxHash: string | null = null;

export interface HeartbeatStatus {
  running: boolean;
  count: number;
  lastAt: number;
  lastTxHash: string | null;
  intervalMs: number;
}

export function getHeartbeatStatus(): HeartbeatStatus {
  return {
    running: intervalHandle !== null,
    count: heartbeatCount,
    lastAt: lastHeartbeatAt,
    lastTxHash: lastHeartbeatTxHash,
    intervalMs: HEARTBEAT_INTERVAL_MS,
  };
}

async function tick(): Promise<void> {
  if (!env.agenticWalletAddress || !env.deployerPrivateKey) {
    return; // wallet not configured — skip silently
  }

  let balances;
  try {
    balances = await getWalletBalances(env.agenticWalletAddress);
  } catch (err) {
    console.warn('[heartbeat] balance check failed:', err instanceof Error ? err.message : err);
    return;
  }

  const usdt = balances.find((b) => b.symbol.toUpperCase() === 'USDT');
  const usdtAmount = usdt?.amount ?? 0;

  if (usdtAmount < MIN_USDT) {
    console.log(`[heartbeat] USDT balance ${usdtAmount.toFixed(6)} < ${MIN_USDT} — skipping`);
    return;
  }

  const deployAmount = Math.max(MIN_USDT, usdtAmount * HEARTBEAT_FRACTION);
  const rawAmount = BigInt(Math.floor(deployAmount * 10 ** USDT_DECIMALS)).toString();

  console.log(`[heartbeat] tick #${heartbeatCount + 1} — deploying ${deployAmount.toFixed(6)} USDT → OKB`);

  try {
    const result = await executeSwap({
      fromToken: TOKEN_ADDRESSES.USDT,
      toToken: TOKEN_ADDRESSES.WOKB,
      amount: rawAmount,
      fromSymbol: 'USDT',
      toSymbol: 'OKB',
      userAddress: env.agenticWalletAddress,
    });

    const toOkbHuman = Number(result.toAmount) / 1e18;

    recordDeployment({
      timestamp: Date.now(),
      fromAmountUsdt: deployAmount,
      toAmountOkb: toOkbHuman,
      txHash: result.txHash,
      approveTxHash: result.approveTxHash,
    });

    recordActivity('heartbeat.swap', `${deployAmount.toFixed(6)} USDT → ${toOkbHuman.toFixed(8)} OKB · tx ${result.txHash.slice(0, 12)}`);

    heartbeatCount += 1;
    lastHeartbeatAt = Date.now();
    lastHeartbeatTxHash = result.txHash;

    console.log(`[heartbeat] ✓ tx ${result.txHash} | ${deployAmount.toFixed(6)} USDT → ${toOkbHuman.toFixed(8)} OKB`);
  } catch (err) {
    if (err instanceof OnchainOsError) {
      console.warn(`[heartbeat] swap failed (OnchainOS): ${err.message}`);
    } else {
      console.warn('[heartbeat] swap failed:', err instanceof Error ? err.message : err);
    }
  }
}

export function startAgentHeartbeat(): void {
  if (intervalHandle) return;
  console.log(`[heartbeat] starting — interval ${HEARTBEAT_INTERVAL_MS / 60_000} min`);
  // First tick after 2 minutes to let other services warm up
  setTimeout(() => {
    void tick();
    intervalHandle = setInterval(() => void tick(), HEARTBEAT_INTERVAL_MS);
  }, 2 * 60_000);
}

export function stopAgentHeartbeat(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
