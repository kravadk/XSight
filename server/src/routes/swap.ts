import { Router, type Request, type Response } from 'express';
import { getSwapQuote, executeSwap, OnchainOsError } from '../services/onchainos.js';
import { WalletError } from '../services/wallet.js';
import { resolveToken } from '../services/tokenCatalog.js';
import { env } from '../config/env.js';

export const swapRouter = Router();

/**
 * Resolve a user-provided token reference to its canonical X Layer address.
 * Accepts: symbol ("OKB", "USDT", "BULL"), full 0x address, or "native".
 *
 * Order of resolution:
 *   1. Token catalog (covers entire X Layer universe + native OKB sentinel)
 *   2. Raw 0x passthrough (works even before catalog finishes loading)
 *
 * Throws OnchainOsError if nothing can be resolved.
 */
function resolveOrThrow(input: string): string {
  const resolved = resolveToken(input);
  if (resolved) return resolved.address;
  if (/^0x[0-9a-fA-F]{40}$/.test(input)) return input.toLowerCase();
  throw new OnchainOsError(
    `unknown token: "${input}". Pass a symbol from /api/market/catalog or a 0x contract address.`,
  );
}

function handleError(res: Response, err: unknown, fallback: string) {
  if (err instanceof WalletError) {
    return res.status(503).json({ error: 'Signer unavailable', detail: err.message });
  }
  if (err instanceof OnchainOsError) {
    return res.status(503).json({ error: 'OnchainOS unavailable', detail: err.message });
  }
  const msg = err instanceof Error ? err.message : fallback;
  res.status(500).json({ error: msg });
}

swapRouter.get('/quote', async (req: Request, res: Response) => {
  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  const amount = String(req.query.amount ?? '');
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'from, to, amount required' });
  }
  if (!env.agenticWalletAddress) {
    return res.status(503).json({ error: 'AGENTIC_WALLET_ADDRESS not configured' });
  }
  try {
    const fromAddr = resolveOrThrow(from);
    const toAddr = resolveOrThrow(to);
    const quote = await getSwapQuote({
      fromToken: fromAddr,
      toToken: toAddr,
      amount,
      userAddress: env.agenticWalletAddress,
    });
    res.json(quote);
  } catch (err) {
    handleError(res, err, 'quote failed');
  }
});

swapRouter.post('/', async (req: Request, res: Response) => {
  const { from, to, amount } = req.body as { from?: string; to?: string; amount?: number | string };
  if (!from || !to || amount === undefined) {
    return res.status(400).json({ error: 'from, to, amount required' });
  }
  if (!env.agenticWalletAddress) {
    return res.status(503).json({ error: 'AGENTIC_WALLET_ADDRESS not configured' });
  }
  try {
    const fromAddr = resolveOrThrow(from);
    const toAddr = resolveOrThrow(to);
    const fromCatalog = resolveToken(from);
    const toCatalog = resolveToken(to);
    const result = await executeSwap({
      fromToken: fromAddr,
      toToken: toAddr,
      amount: String(amount),
      fromSymbol: fromCatalog?.symbol ?? from.toUpperCase(),
      toSymbol: toCatalog?.symbol ?? to.toUpperCase(),
      userAddress: env.agenticWalletAddress,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err, 'swap failed');
  }
});
