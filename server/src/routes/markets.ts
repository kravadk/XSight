/**
 * /api/markets — the prediction-market surface the X Cup frontend (Plan 4) renders.
 * Read endpoints + unsigned stake/claim calldata for the user's wallet + gated operator
 * actions. Distinct from the unrelated `/api/market` token route.
 */
import { Router, type Request, type Response } from 'express';
import { env } from '../config/env.js';
import { deriveMarketId } from '../utils/cupIds.js';
import {
  buildSwapStakeTx,
  ensureMarketsForUpcomingFixtures,
  getMarketDetail,
  getPosition,
  getWalletAllowance,
  listMarkets,
  listWalletPositions,
  settleMarket,
} from '../services/marketService.js';
import { getIndexerStatus } from '../services/marketIndexer.js';
import { buildApproveTx, buildClaimTx, buildStakeTx, parimutuelMetadata } from '../services/parimutuelContract.js';
import { isCupWriteAuthorized } from './cupWriteAuth.js';

export const marketsRouter = Router();

function requireWrite(req: Request, res: Response): boolean {
  const auth = isCupWriteAuthorized({
    nodeEnv: env.nodeEnv,
    writeApiEnabled: env.cupWriteApiEnabled,
    configuredKey: env.cupWriteApiKey,
    providedKey: String(req.header('X-CUP-ADMIN-KEY') ?? ''),
  });
  if (auth.ok) return true;
  res.status(auth.reason?.includes('disabled') ? 403 : 401).json({ error: 'market write unauthorized', detail: auth.reason });
  return false;
}

function txError(res: Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  res.status(message === 'contract_not_deployed' ? 409 : 400).json({ error: 'market tx build failed', detail: message });
}

marketsRouter.get('/', async (_req: Request, res: Response) => {
  res.json({ markets: await listMarkets(), contract: parimutuelMetadata() });
});

marketsRouter.get('/indexer', (_req: Request, res: Response) => {
  res.json(getIndexerStatus());
});

marketsRouter.get('/allowance', async (req: Request, res: Response) => {
  const wallet = String(req.query.wallet ?? '');
  if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
  res.json({ wallet, allowance: await getWalletAllowance(wallet) });
});

marketsRouter.get('/positions', async (req: Request, res: Response) => {
  const wallet = String(req.query.wallet ?? '');
  if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
  res.json({ wallet, positions: await listWalletPositions(wallet) });
});

marketsRouter.get('/:id', async (req: Request, res: Response) => {
  const detail = await getMarketDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'market not found' });
  res.json(detail);
});

marketsRouter.get('/:id/position', async (req: Request, res: Response) => {
  const wallet = String(req.query.wallet ?? '');
  if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
  const position = await getPosition(req.params.id, wallet);
  if (!position) return res.status(404).json({ error: 'market not found' });
  res.json(position);
});

// Unsigned calldata — the user's wallet signs and broadcasts these.
marketsRouter.post('/:id/stake-tx', async (req: Request, res: Response) => {
  const body = req.body as { outcome?: number; amount?: string };
  const outcome = Number(body.outcome);
  const amount = String(body.amount ?? '');
  if (![1, 2, 3].includes(outcome)) return res.status(400).json({ error: 'outcome must be 1 (home), 2 (draw) or 3 (away)' });
  if (!/^\d+$/.test(amount) || amount === '0') {
    return res.status(400).json({ error: 'amount must be a positive integer in token base units' });
  }
  try {
    const marketId = deriveMarketId(req.params.id);
    res.json({
      approveTx: await buildApproveTx(amount),
      stakeTx: buildStakeTx(marketId, outcome, amount),
    });
  } catch (err) {
    txError(res, err);
  }
});

// Stake with ANY X Layer token — OKX DEX swaps it to the settlement USDT in the
// user's wallet, then approve + stake follow. Returns the full unsigned step list.
marketsRouter.post('/:id/swap-stake-tx', async (req: Request, res: Response) => {
  const body = req.body as { fromToken?: string; amount?: string; outcome?: number; wallet?: string };
  const fromToken = String(body.fromToken ?? '');
  const amount = String(body.amount ?? '');
  const outcome = Number(body.outcome);
  const wallet = String(body.wallet ?? '');
  if (!/^0x[0-9a-fA-F]{40}$/.test(fromToken)) return res.status(400).json({ error: 'fromToken must be a token address' });
  if (![1, 2, 3].includes(outcome)) return res.status(400).json({ error: 'outcome must be 1, 2 or 3' });
  if (!/^\d+$/.test(amount) || amount === '0') {
    return res.status(400).json({ error: 'amount must be a positive integer in fromToken base units' });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return res.status(400).json({ error: 'wallet must be a valid address' });
  try {
    res.json(await buildSwapStakeTx({ cupMatchId: req.params.id, fromToken, amount, outcome, wallet }));
  } catch (err) {
    txError(res, err);
  }
});

marketsRouter.get('/:id/claim-tx', (req: Request, res: Response) => {
  try {
    res.json({ claimTx: buildClaimTx(deriveMarketId(req.params.id)) });
  } catch (err) {
    txError(res, err);
  }
});

// Operator actions (gated).
marketsRouter.post('/ensure', async (req: Request, res: Response) => {
  if (!requireWrite(req, res)) return;
  const body = req.body as { limit?: number };
  // default cap of 16 so a bare call never fires the whole fixture list
  const limit = Number.isInteger(body.limit) && (body.limit ?? 0) > 0 ? body.limit : 16;
  res.json(await ensureMarketsForUpcomingFixtures(limit));
});

marketsRouter.post('/:id/settle', async (req: Request, res: Response) => {
  if (!requireWrite(req, res)) return;
  try {
    res.json(await settleMarket(req.params.id));
  } catch (err) {
    txError(res, err);
  }
});
