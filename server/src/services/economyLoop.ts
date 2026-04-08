import { x402Log } from '../middleware/x402.js';
import type { EconomySnapshot } from '../types/index.js';
import { recordActivity } from './activityTracker.js';

let deployThreshold = 0.05; // USDT — small for hackathon demo so trigger is realistic
let autoDeployEnabled = true;

// Live counters updated from real activity (see services/wallet, services/ai)
let cumulativeGasOkb = 0;
let cumulativeAiUsdt = 0;
let cumulativeAiInputTokens = 0;
let cumulativeAiOutputTokens = 0;

/** Anthropic claude-sonnet-4 pricing per million tokens (USD). */
const AI_PRICE_INPUT_PER_M = 3;
const AI_PRICE_OUTPUT_PER_M = 15;

/**
 * Real on-chain deployments performed by triggerAutoDeploy. We don't currently
 * mint Uniswap V3 LP NFTs (would require deep tick-math integration); instead
 * the loop converts surplus USDT into OKB via OnchainOS DEX, which is a real
 * yield-bearing deployment (OKB is the gas + yield asset on X Layer). Each
 * deployment is recorded with the real swap tx hash.
 */
export interface DeployEvent {
  timestamp: number;
  fromAmountUsdt: number;
  toAmountOkb: number;
  txHash: string;
  approveTxHash?: string;
}
const deployHistory: DeployEvent[] = [];

export function setAutoDeploy(enabled: boolean) {
  autoDeployEnabled = enabled;
}

export function setDeployThreshold(value: number) {
  if (Number.isFinite(value) && value >= 0) {
    deployThreshold = value;
  }
}

export function getEconomyConfig() {
  return { autoDeployEnabled, threshold: deployThreshold };
}

export function recordDeployment(event: DeployEvent) {
  deployHistory.push(event);
  recordActivity('economy.deploy', `${event.fromAmountUsdt} USDT → ${event.toAmountOkb.toFixed(8)} OKB`);
}

export function getDeployHistory(): DeployEvent[] {
  return [...deployHistory].reverse();
}

/** Called from executeSwap after a receipt confirms — accumulates real OKB gas. */
export function recordGasSpend(okbAmount: number) {
  if (Number.isFinite(okbAmount) && okbAmount > 0) {
    cumulativeGasOkb += okbAmount;
  }
}

/** Called from ai.chat / ai.analyticsJson with actual Claude usage. */
export function recordAiUsage(inputTokens: number, outputTokens: number) {
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) return;
  cumulativeAiInputTokens += inputTokens;
  cumulativeAiOutputTokens += outputTokens;
  const cost =
    (inputTokens / 1_000_000) * AI_PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * AI_PRICE_OUTPUT_PER_M;
  cumulativeAiUsdt += cost;
}

interface SnapshotInputs {
  /** Real-time OKB price in USDT, fetched from OnchainOS market */
  okbPriceUsdt?: number;
  /** Real OKB balance held by the agentic wallet right now */
  walletOkbBalance?: number;
}

export function snapshot(inputs: SnapshotInputs = {}): EconomySnapshot {
  const paid = x402Log.filter((c) => c.status === 'paid');
  const totalRevenueUsdt = paid.reduce((sum, c) => sum + c.amount, 0);
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const callsToday = paid.filter((c) => c.timestamp >= dayAgo).length;

  const okbPrice = inputs.okbPriceUsdt ?? 0;

  // LP-equivalent state from real deploy history.
  // "lpDeposited" = sum of USDT spent across deploy events (cost basis)
  // "lpCurrent"   = current OKB position × current OKB price (mark-to-market)
  // "lpYield"     = current − deposited (price appreciation since deploys)
  const lpDepositedUsdt = deployHistory.reduce((s, e) => s + e.fromAmountUsdt, 0);
  const okbDeposited = deployHistory.reduce((s, e) => s + e.toAmountOkb, 0);
  // Use the wallet OKB balance if provided (more accurate, includes accumulated
  // gas etc.) but cap to deployed OKB so we don't double-count pre-existing OKB.
  const okbAttributable = inputs.walletOkbBalance != null
    ? Math.min(inputs.walletOkbBalance, okbDeposited)
    : okbDeposited;
  const lpCurrentUsdt = okbAttributable * okbPrice;
  const lpYieldEarnedUsdt = lpCurrentUsdt - lpDepositedUsdt;
  const lpActive = deployHistory.length > 0;

  const gasUsdt = cumulativeGasOkb * (okbPrice || 80);
  const netProfitUsdt = totalRevenueUsdt + lpYieldEarnedUsdt - cumulativeAiUsdt - gasUsdt;

  return {
    totalRevenueUsdt,
    callsToday,
    lpDepositedUsdt,
    lpCurrentUsdt,
    lpYieldEarnedUsdt,
    lpActive,
    deployCount: deployHistory.length,
    lastDeployAt: deployHistory[deployHistory.length - 1]?.timestamp ?? 0,
    expensesGasOkb: cumulativeGasOkb,
    expensesAiUsdt: cumulativeAiUsdt,
    aiInputTokens: cumulativeAiInputTokens,
    aiOutputTokens: cumulativeAiOutputTokens,
    netProfitUsdt,
    autoDeployEnabled,
    threshold: deployThreshold,
  };
}
