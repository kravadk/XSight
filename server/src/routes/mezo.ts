import { Router, type Request, type Response } from 'express';
import { getAddress } from 'ethers';
import {
  getTrovePosition,
  fetchBtcPrice,
  getMezoPools,
  estimateBorrow,
} from '../services/mezoService.js';
import {
  MEZO,
  MEZO_CONTRACTS,
  MIN_MUSD_BORROW,
  MUSD_GAS_COMPENSATION,
  SAFE_COLLATERAL_RATIO,
} from '../utils/mezo.js';

export const mezoRouter = Router();

/**
 * GET /api/mezo/trove/:address
 * Returns the Trove position for a given wallet address on Mezo chain.
 */
mezoRouter.get('/trove/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  let checksummed: string;
  try {
    checksummed = getAddress(address as string);
  } catch {
    res.status(400).json({ error: 'invalid Ethereum address' });
    return;
  }

  try {
    const position = await getTrovePosition(checksummed);
    res.json({ trove: position, network: MEZO.name, chainId: MEZO.chainId });
  } catch (err) {
    console.error('[mezo] getTrovePosition error:', err instanceof Error ? err.message : err);
    res.status(503).json({
      error: 'Failed to read Trove position from Mezo chain',
      detail: err instanceof Error ? err.message : 'unknown error',
    });
  }
});

/**
 * GET /api/mezo/price
 * Returns the current BTC price in USD from the Mezo PriceFeed contract.
 */
mezoRouter.get('/price', async (_req: Request, res: Response) => {
  try {
    const btcPriceUsd = await fetchBtcPrice();
    res.json({ btcPriceUsd, fetchedAt: Date.now(), source: 'Mezo PriceFeed', network: MEZO.name });
  } catch (err) {
    console.error('[mezo] fetchBtcPrice error:', err instanceof Error ? err.message : err);
    res.status(503).json({
      error: 'Failed to fetch BTC price from Mezo PriceFeed',
      detail: err instanceof Error ? err.message : 'unknown error',
    });
  }
});

/**
 * GET /api/mezo/pools
 * Returns MUSD liquidity pool info for yield deployment.
 */
mezoRouter.get('/pools', (_req: Request, res: Response) => {
  const pools = getMezoPools();
  res.json({
    pools,
    network: MEZO.name,
    chainId: MEZO.chainId,
    note: 'APR estimates based on protocol fee ranges and swap activity. Always verify on-chain.',
  });
});

/**
 * GET /api/mezo/estimate?coll=0.05&musd=1800
 * Estimates borrow parameters given a BTC collateral amount.
 * - coll: BTC collateral amount (required)
 * - musd: desired MUSD borrow amount (optional, defaults to safe amount)
 */
mezoRouter.get('/estimate', async (req: Request, res: Response) => {
  const collRaw = req.query['coll'];
  const musdRaw = req.query['musd'];

  const collBtc = parseFloat(collRaw as string);
  if (!Number.isFinite(collBtc) || collBtc <= 0) {
    res.status(400).json({ error: 'coll param required (positive number, BTC amount)' });
    return;
  }

  const requestedMusd = musdRaw ? parseFloat(musdRaw as string) : undefined;
  if (requestedMusd !== undefined && (!Number.isFinite(requestedMusd) || requestedMusd <= 0)) {
    res.status(400).json({ error: 'musd param must be a positive number' });
    return;
  }

  try {
    const estimate = await estimateBorrow(collBtc, requestedMusd);
    res.json({
      estimate,
      guidance: {
        minBorrow: MIN_MUSD_BORROW,
        gasCompensation: MUSD_GAS_COMPENSATION,
        safeRatio: SAFE_COLLATERAL_RATIO,
        borrowUrl: 'https://mezo.org/feature/borrow',
        contracts: {
          BorrowerOperations: MEZO_CONTRACTS.BorrowerOperations,
          TroveManager: MEZO_CONTRACTS.TroveManager,
        },
      },
    });
  } catch (err) {
    console.error('[mezo] estimateBorrow error:', err instanceof Error ? err.message : err);
    res.status(503).json({
      error: 'Failed to estimate borrow — could not fetch BTC price',
      detail: err instanceof Error ? err.message : 'unknown error',
    });
  }
});

/**
 * GET /api/mezo/info
 * Returns Mezo network metadata and contract addresses.
 */
mezoRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    network: MEZO,
    contracts: MEZO_CONTRACTS,
    musd: {
      minBorrow: MIN_MUSD_BORROW,
      gasCompensation: MUSD_GAS_COMPENSATION,
      borrowFeeRange: '1-5%',
      collateralAsset: 'BTC / tBTC',
      docs: 'https://mezo.org/docs/developers',
      borrowUrl: 'https://mezo.org/feature/borrow',
    },
  });
});
