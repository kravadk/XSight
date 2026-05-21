/**
 * Pundit executor (DESIGN §2.1 Flow D).
 *
 * Turns a `PunditPick` into a REAL on-chain stake from the pundit's own wallet, then
 * runs the completion guard on the receipt. The pundit "thinking" (punditService) and
 * the pundit "acting" are deliberately separate: only a guard-verified execution
 * (`status: 'staked'`) may ever be reported as a success.
 *
 * NO MOCKS: without PARIMUTUEL_MARKET_ADDRESS or the pundit wallet it returns an
 * honest non-executed status and stakes nothing.
 */
import { Contract, formatUnits, isAddress, parseUnits } from 'ethers';
import { env } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
import { deriveMarketId } from '../utils/cupIds.js';
import { getPunditSigner } from './wallet.js';
import {
  ERC20_ABI,
  PARIMUTUEL_ABI,
  parimutuelMetadata,
  readMarket,
  readSettlementToken,
  readStakeOf,
} from './parimutuelContract.js';
import { getPunditPick, type PunditOutcome } from './punditService.js';
import { verifyStakeReceipt, type StakeIntent } from './punditCompletionGuard.js';
import { recordPunditExecution } from './punditExecutionLog.js';
import { recordActivity } from './activityTracker.js';

export type PunditExecutionStatus =
  | 'contract_not_deployed'
  | 'pundit_wallet_not_configured'
  | 'no_pick'
  | 'passed'
  | 'market_not_open'
  | 'already_staked'
  | 'insufficient_balance'
  | 'staked'
  | 'stake_unverified';

export interface PunditExecution {
  matchId: string;
  marketId: string;
  label: string;
  status: PunditExecutionStatus;
  pick: PunditOutcome;
  conviction: number;
  outcome: number | null; // 1 | 2 | 3, null for PASS
  amount: string;         // base units actually staked ('0' when no tx was sent)
  amountDisplay: string;  // human-readable, e.g. '0.5 USDT'
  txHash: string | null;
  explorerUrl: string | null;
  verified: boolean;      // completion-guard verdict
  reason: string;
  executedAt: string;     // ISO timestamp
}

const OUTCOME_BY_PICK: Record<Exclude<PunditOutcome, 'PASS'>, number> = {
  HOME: 1,
  DRAW: 2,
  AWAY: 3,
};

function result(partial: Omit<PunditExecution, 'executedAt'>): PunditExecution {
  return { ...partial, executedAt: new Date().toISOString() };
}

/**
 * Execute the pundit's pick for one fixture as a verified on-chain stake.
 * Every call returns a `PunditExecution`; only `status: 'staked'` is a success.
 */
export async function executePunditPick(matchId: string): Promise<PunditExecution> {
  const marketId = deriveMarketId(matchId);
  const base = {
    matchId,
    marketId,
    label: matchId,
    pick: 'PASS' as PunditOutcome,
    conviction: 0,
    outcome: null as number | null,
    amount: '0',
    amountDisplay: '0',
    txHash: null as string | null,
    explorerUrl: null as string | null,
    verified: false,
  };

  if (!parimutuelMetadata().address) {
    return result({ ...base, status: 'contract_not_deployed', reason: 'PARIMUTUEL_MARKET_ADDRESS not set' });
  }
  if (!env.punditPrivateKey || !env.punditWalletAddress) {
    return result({
      ...base,
      status: 'pundit_wallet_not_configured',
      reason: 'PUNDIT_PRIVATE_KEY / PUNDIT_WALLET_ADDRESS not set',
    });
  }

  const pick = await getPunditPick(matchId);
  if (!pick) {
    return result({ ...base, status: 'no_pick', reason: 'no fixture / pick for this matchId' });
  }
  const enriched = { ...base, label: pick.label, pick: pick.pick, conviction: pick.conviction };

  if (pick.pick === 'PASS') {
    return result({ ...enriched, status: 'passed', reason: 'pundit issued PASS — no stake' });
  }
  const outcome = OUTCOME_BY_PICK[pick.pick];

  const market = await readMarket(marketId);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!market || !market.exists) {
    return result({ ...enriched, outcome, status: 'market_not_open', reason: 'market_not_created' });
  }
  if (market.settled) {
    return result({ ...enriched, outcome, status: 'market_not_open', reason: 'market_settled' });
  }
  if (market.closeTime <= nowSec) {
    return result({ ...enriched, outcome, status: 'market_not_open', reason: 'market_closed' });
  }

  const signer = getPunditSigner();
  const punditAddress = await signer.getAddress();

  // Idempotency: one stake per market. Never let the pundit double-bet a fixture.
  const existing = await readStakeOf(marketId, punditAddress);
  if (existing && BigInt(existing.home) + BigInt(existing.draw) + BigInt(existing.away) > 0n) {
    return result({ ...enriched, outcome, status: 'already_staked', reason: 'pundit already has a position' });
  }

  const tokenAddress = await readSettlementToken();
  if (!tokenAddress || !isAddress(tokenAddress)) {
    return result({ ...enriched, outcome, status: 'market_not_open', reason: 'settlement_token_unknown' });
  }
  const token = new Contract(tokenAddress, ERC20_ABI, signer);
  const decimals = Number(await token.decimals());
  const symbol = String(await token.symbol());
  const amountWei = parseUnits(env.punditStakeAmount, decimals);
  const amountDisplay = `${env.punditStakeAmount} ${symbol}`;

  const balance: bigint = await token.balanceOf(punditAddress);
  if (balance < amountWei) {
    return result({
      ...enriched,
      outcome,
      amountDisplay,
      status: 'insufficient_balance',
      reason: `pundit wallet holds ${formatUnits(balance, decimals)} ${symbol}, needs ${env.punditStakeAmount}`,
    });
  }

  const marketAddress = parimutuelMetadata().address as string;
  const allowance: bigint = await token.allowance(punditAddress, marketAddress);
  if (allowance < amountWei) {
    const approveTx = await token.approve(marketAddress, amountWei);
    await approveTx.wait();
  }

  const marketWrite = new Contract(marketAddress, PARIMUTUEL_ABI, signer);
  const stakeTx = await marketWrite.stake(marketId, outcome, amountWei);
  const receipt = await stakeTx.wait();
  const txHash = String(receipt?.hash ?? stakeTx.hash);
  const explorerUrl = `${X_LAYER.explorer}/tx/${txHash}`;

  const intent: StakeIntent = {
    marketAddress,
    marketId,
    staker: punditAddress,
    outcome,
    amount: amountWei.toString(),
  };
  const guard = verifyStakeReceipt(intent, receipt);
  recordActivity('cup.punditStake', `${pick.label} ${pick.pick}`);

  const execution = result({
    ...enriched,
    outcome,
    amount: amountWei.toString(),
    amountDisplay,
    txHash,
    explorerUrl,
    verified: guard.verified,
    status: guard.verified ? 'staked' : 'stake_unverified',
    reason: guard.reason,
  });
  recordPunditExecution(execution);
  return execution;
}
