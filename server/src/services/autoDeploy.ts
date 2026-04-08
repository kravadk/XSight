/**
 * The earn-pay-earn loop trigger.
 *
 * Flow:
 *   1. Read current USDT balance of the agentic wallet (real, OnchainOS)
 *   2. If above threshold, deploy half of surplus into yield by swapping
 *      USDT → OKB through OnchainOS DEX (real on-chain swap)
 *   3. Record the deployment so the economy snapshot reflects real LP-equivalent
 *      position value (mark-to-market against current OKB price)
 *
 * This is intentionally minimal but every leg is real and verifiable on the
 * X Layer explorer. The same primitive can be extended to mint a Uniswap V3
 * position later — the contract on this function stays identical.
 */
import { env } from '../config/env.js';
import { getWalletBalances, getTokenPrice, executeSwap, OnchainOsError } from './onchainos.js';
import { recordDeployment, getEconomyConfig } from './economyLoop.js';
import { WalletError } from './wallet.js';
import { TOKEN_ADDRESSES, USDT_DECIMALS } from '../utils/tokens.js';

const USDT_ADDRESS = TOKEN_ADDRESSES.USDT;
const WOKB_ADDRESS = TOKEN_ADDRESSES.WOKB;

export interface DeployResult {
  ok: boolean;
  reason?: string;
  fromAmountUsdt?: number;
  toAmountOkb?: number;
  txHash?: string;
  approveTxHash?: string;
}

/**
 * Honest helpers (re-used by manual /trigger-deploy and the future cron).
 * Returns ok:false with a reason string if conditions aren't met — never
 * throws on "not enough balance" or "auto-deploy disabled" so the API can
 * present a clean response to the user.
 */
export async function triggerAutoDeploy(opts: { force?: boolean; fraction?: number } = {}): Promise<DeployResult> {
  const { autoDeployEnabled, threshold } = getEconomyConfig();
  if (!opts.force && !autoDeployEnabled) {
    return { ok: false, reason: 'auto-deploy disabled (set autoDeployEnabled=true to arm)' };
  }
  if (!env.agenticWalletAddress) {
    return { ok: false, reason: 'AGENTIC_WALLET_ADDRESS not configured' };
  }

  let balances;
  try {
    balances = await getWalletBalances(env.agenticWalletAddress);
  } catch (err) {
    return {
      ok: false,
      reason: `balance check failed: ${err instanceof OnchainOsError ? err.message : (err as Error).message}`,
    };
  }

  const usdt = balances.find((b) => b.symbol.toUpperCase() === 'USDT');
  const usdtAmount = usdt?.amount ?? 0;
  if (usdtAmount < threshold) {
    return {
      ok: false,
      reason: `USDT balance ${usdtAmount.toFixed(6)} below threshold ${threshold}`,
    };
  }

  // Deploy a fraction of the SURPLUS over threshold (default 50%) — keeps
  // operational reserve for further AI calls.
  const fraction = opts.fraction ?? 0.5;
  const surplus = usdtAmount - threshold;
  const deployAmountHuman = Math.max(0.001, surplus * fraction);
  const rawAmount = BigInt(Math.floor(deployAmountHuman * 10 ** USDT_DECIMALS)).toString();

  let result;
  try {
    result = await executeSwap({
      fromToken: USDT_ADDRESS,
      toToken: WOKB_ADDRESS,
      amount: rawAmount,
      fromSymbol: 'USDT',
      toSymbol: 'WOKB',
      userAddress: env.agenticWalletAddress,
    });
  } catch (err) {
    if (err instanceof WalletError) {
      return { ok: false, reason: `signer unavailable: ${err.message}` };
    }
    if (err instanceof OnchainOsError) {
      return { ok: false, reason: `OnchainOS swap failed: ${err.message}` };
    }
    return { ok: false, reason: (err as Error).message };
  }

  const toOkbHuman = Number(result.toAmount) / 1e18;
  recordDeployment({
    timestamp: Date.now(),
    fromAmountUsdt: deployAmountHuman,
    toAmountOkb: toOkbHuman,
    txHash: result.txHash,
    approveTxHash: result.approveTxHash,
  });

  return {
    ok: true,
    fromAmountUsdt: deployAmountHuman,
    toAmountOkb: toOkbHuman,
    txHash: result.txHash,
    approveTxHash: result.approveTxHash,
  };
}

/** Read the current OKB price from OnchainOS market for snapshot mark-to-market. */
export async function readOkbPrice(): Promise<number> {
  try {
    return await getTokenPrice(WOKB_ADDRESS);
  } catch (err) {
    console.warn('[autoDeploy] OKB price fetch failed — using 0 for mark-to-market:', err instanceof Error ? err.message : err);
    return 0;
  }
}
