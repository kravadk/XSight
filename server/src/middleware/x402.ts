import type { Request, Response, NextFunction } from 'express';
import { id, zeroPadValue } from 'ethers';
import { env } from '../config/env.js';
import { recordActivity } from '../services/activityTracker.js';
import { hasCupPaymentReceipt, recordCupPaymentReceipt } from '../services/cupPersistence.js';
import { getProvider } from '../services/wallet.js';
import type { X402CallLog, X402PaymentInstruction, X402PaymentProof } from '../types/index.js';

export interface X402Options {
  amount: string;
  description: string;
}

export const x402Log: X402CallLog[] = [];
const consumedPaymentTxs = new Set<string>();

// Warn once at startup so it's visible in logs
if (process.env.NODE_ENV !== 'production' && env.allowDevBypass) {
  console.warn('[x402] dev-bypass is enabled — set NODE_ENV=production to disable');
}

function logCall(entry: X402CallLog) {
  x402Log.push(entry);
  if (x402Log.length > 500) x402Log.shift();
  recordActivity(entry.status === 'paid' ? 'x402.payment' : 'x402.rejected', entry.endpoint);
}

function parsePaymentHeader(header: string): X402PaymentProof | null {
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    const obj = JSON.parse(decoded) as X402PaymentProof;
    if (typeof obj.payTo !== 'string' || typeof obj.amount !== 'string') return null;
    return obj;
  } catch {
    return null;
  }
}

export interface X402DecisionInput {
  nodeEnv: string;
  allowDevBypass: boolean;
  header: string | undefined;
  amount: string;
  asset: string;
  network: string;
  payTo: string;
}

export interface X402Decision {
  ok: boolean;
  error?: 'missing_payment' | 'invalid_payment_header' | 'payment_verification_failed' | 'payment_tx_required';
  proof?: X402PaymentProof;
  paid?: number;
  caller?: string;
}

export function buildX402Decision(input: X402DecisionInput): X402Decision {
  if (!input.header) return { ok: false, error: 'missing_payment' };
  if (input.header === 'dev-bypass') {
    return input.nodeEnv !== 'production' && input.allowDevBypass
      ? { ok: true, caller: 'dev-bypass', paid: Number(input.amount) }
      : { ok: false, error: 'payment_verification_failed' };
  }

  const proof = parsePaymentHeader(input.header);
  if (!proof) return { ok: false, error: 'invalid_payment_header' };

  const expectedPayTo = input.payTo.toLowerCase();
  const actualPayTo = proof.payTo.toLowerCase();
  const paid = Number(proof.amount);
  const isValidAddress = /^0x[0-9a-f]{40}$/.test(actualPayTo);
  const caller = proof.payer ?? (isValidAddress ? actualPayTo.slice(0, 12) : 'unknown');
  const baseValid =
    isValidAddress &&
    actualPayTo === expectedPayTo &&
    Number.isFinite(paid) &&
    paid >= Number(input.amount) &&
    proof.network === input.network &&
    proof.asset === input.asset;

  if (!baseValid) return { ok: false, error: 'payment_verification_failed', proof, paid, caller };
  if (input.nodeEnv === 'production' && !proof.txHash) {
    return { ok: false, error: 'payment_tx_required', proof, paid, caller };
  }

  return { ok: true, proof, paid, caller };
}

function buildInstructions(opts: X402Options): { x402Version: number; accepts: X402PaymentInstruction[] } {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: env.x402Network,
        asset: env.x402Asset,
        assetAddress: env.x402AssetAddress,
        decimals: 6,
        amount: opts.amount,
        payTo: env.x402PayoutAddress,
        description: opts.description,
        gasSponsored: true,
      },
    ],
  };
}

export function withX402(opts: X402Options) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('X-PAYMENT');
    const endpoint = req.originalUrl;
    const required = Number(opts.amount);

    const decision = buildX402Decision({
      nodeEnv: env.nodeEnv,
      allowDevBypass: env.allowDevBypass,
      header,
      amount: opts.amount,
      asset: env.x402Asset,
      network: env.x402Network,
      payTo: env.x402PayoutAddress,
    });

    if (!decision.ok && decision.error === 'missing_payment') {
      logCall({
        timestamp: Date.now(),
        endpoint,
        caller: 'anonymous',
        amount: required,
        asset: env.x402Asset,
        status: 'rejected',
      });
      res.status(402).json(buildInstructions(opts));
      return;
    }

    if (decision.ok && decision.caller === 'dev-bypass') {
      logCall({
        timestamp: Date.now(),
        endpoint,
        caller: 'dev-bypass',
        amount: required,
        asset: env.x402Asset,
        status: 'paid',
      });
      next();
      return;
    }

    if (!decision.ok && decision.error === 'invalid_payment_header') {
      logCall({
        timestamp: Date.now(),
        endpoint,
        caller: 'invalid',
        amount: required,
        asset: env.x402Asset,
        status: 'rejected',
      });
      res.status(402).json({ ...buildInstructions(opts), error: 'invalid_payment_header' });
      return;
    }

    const proof = decision.proof;
    const paid = decision.paid ?? 0;
    const callerLabel = decision.caller ?? proof?.payer ?? 'unknown';

    if (!decision.ok || !proof) {
      logCall({
        timestamp: Date.now(),
        endpoint,
        caller: callerLabel,
        amount: paid,
        asset: env.x402Asset,
        status: 'rejected',
      });
      res.status(402).json({ ...buildInstructions(opts), error: decision.error ?? 'payment_verification_failed' });
      return;
    }

    try {
      await verifyPaymentTransaction(proof, opts.amount);
      if (proof.txHash) {
        await recordCupPaymentReceipt({
          txHash: proof.txHash,
          endpoint,
          payer: proof.payer,
          amount: paid,
          asset: env.x402Asset,
          network: env.x402Network,
        });
      }
    } catch (err) {
      logCall({
        timestamp: Date.now(),
        endpoint,
        caller: callerLabel,
        amount: paid,
        asset: env.x402Asset,
        status: 'rejected',
      });
      res.status(402).json({
        ...buildInstructions(opts),
        error: 'payment_verification_failed',
        detail: err instanceof Error ? err.message : 'transaction verification failed',
      });
      return;
    }

    logCall({
      timestamp: Date.now(),
      endpoint,
      caller: callerLabel,
      amount: paid,
      asset: env.x402Asset,
      status: 'paid',
    });
    next();
  };
}

async function verifyPaymentTransaction(proof: X402PaymentProof, amount: string): Promise<void> {
  if (env.nodeEnv !== 'production' && !proof.txHash) return;
  if (!proof.txHash || !/^0x[0-9a-fA-F]{64}$/.test(proof.txHash)) {
    throw new Error('payment_tx_required');
  }
  const txHash = proof.txHash.toLowerCase();
  if (consumedPaymentTxs.has(txHash) || await hasCupPaymentReceipt(txHash)) throw new Error('payment_tx_replayed');
  if (!env.x402AssetAddress || !/^0x[0-9a-fA-F]{40}$/.test(env.x402AssetAddress)) {
    throw new Error('X402_ASSET_ADDRESS required for production payment verification');
  }

  const receipt = await getProvider().getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) throw new Error('payment transaction not confirmed');

  const transferTopic = id('Transfer(address,address,uint256)');
  const payoutTopic = zeroPadValue(env.x402PayoutAddress, 32).toLowerCase();
  const minAmount = BigInt(Math.ceil(Number(amount) * 1_000_000));
  const paid = receipt.logs.some((log) => {
    if (log.address.toLowerCase() !== env.x402AssetAddress.toLowerCase()) return false;
    if (log.topics[0]?.toLowerCase() !== transferTopic.toLowerCase()) return false;
    if (log.topics[2]?.toLowerCase() !== payoutTopic) return false;
    return BigInt(log.data) >= minAmount;
  });
  if (!paid) throw new Error('payment transfer log not found');
  consumedPaymentTxs.add(txHash);
}
