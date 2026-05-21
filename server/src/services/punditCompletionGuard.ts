/**
 * Pundit completion guard.
 *
 * A signed transaction that mined with status 1 is NOT proof the intended action
 * happened — the calldata could have been wrong, or a different event fired. Before
 * the pundit (or anything reading its log) may state "Hermes staked on X", the guard
 * must find a `Staked` event, emitted by the ParimutuelMarket contract itself, that
 * matches the intent exactly. This is the line between "the agent decided" and
 * "the action is verified".
 */
import { Interface } from 'ethers';
import { PARIMUTUEL_ABI } from './parimutuelContract.js';

export interface StakeIntent {
  marketAddress: string; // the ParimutuelMarket contract that must have emitted the event
  marketId: string;      // bytes32
  staker: string;        // pundit wallet address
  outcome: number;       // 1 = HOME, 2 = DRAW, 3 = AWAY
  amount: string;        // stake amount in token base units (wei string)
}

export interface ReceiptLike {
  status?: number | null;
  logs?: ReadonlyArray<{ address: string; topics: ReadonlyArray<string>; data: string }>;
}

export interface GuardResult {
  verified: boolean;
  reason: string;
}

const iface = new Interface(PARIMUTUEL_ABI as unknown as string[]);

/**
 * Verify a stake receipt against the intent. Returns `verified: true` only when a
 * `Staked` event emitted by `intent.marketAddress`, with matching market id, staker,
 * outcome and amount, is present. When a staker-matching event is found but a field
 * disagrees, the most specific mismatch reason is reported.
 */
export function verifyStakeReceipt(intent: StakeIntent, receipt: ReceiptLike | null): GuardResult {
  if (!receipt) return { verified: false, reason: 'no_receipt' };
  if (receipt.status !== 1) return { verified: false, reason: 'tx_reverted' };

  let mismatchReason: string | null = null;

  for (const log of receipt.logs ?? []) {
    if (log.address.toLowerCase() !== intent.marketAddress.toLowerCase()) continue;

    let parsed;
    try {
      parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    } catch {
      continue; // a log from the market we cannot decode — not a Staked event
    }
    if (!parsed || parsed.name !== 'Staked') continue;

    if (String(parsed.args.marketId).toLowerCase() !== intent.marketId.toLowerCase()) continue;
    if (String(parsed.args.user).toLowerCase() !== intent.staker.toLowerCase()) continue;
    if (Number(parsed.args.outcome) !== intent.outcome) {
      mismatchReason = 'outcome_mismatch';
      continue;
    }
    if (BigInt(parsed.args.amount) !== BigInt(intent.amount)) {
      mismatchReason = 'amount_mismatch';
      continue;
    }
    return { verified: true, reason: 'staked_event_confirmed' };
  }
  return { verified: false, reason: mismatchReason ?? 'no_staked_event' };
}

/**
 * Whether a public success statement (X post, API `staked` status) is allowed for an
 * execution. The guard's verdict — not the bare tx hash — is the gate.
 */
export function claimAllowed(execution: {
  executed: boolean;
  verified: boolean;
  txHash: string | null;
}): boolean {
  return execution.executed && execution.verified && Boolean(execution.txHash);
}
