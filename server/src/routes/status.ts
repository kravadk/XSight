import { Router, type Request, type Response } from 'express';
import { x402Log } from '../middleware/x402.js';
import {
  snapshot,
  setAutoDeploy,
  setDeployThreshold,
  getEconomyConfig,
  getDeployHistory,
} from '../services/economyLoop.js';
import { getAddress } from 'ethers';
import { getWalletBalances, getTokenSecurity, OnchainOsError } from '../services/onchainos.js';
import { triggerAutoDeploy, readOkbPrice } from '../services/autoDeploy.js';
import { activitySnapshot } from '../services/activityTracker.js';
import { getTopPools } from '../services/uniswap.js';
import { env, isConfigured } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';
import type { PortfolioResponse } from '../types/index.js';

import { TOKEN_ADDRESSES as SYMBOL_TO_ADDRESS } from '../utils/tokens.js';

export const statusRouter = Router();

statusRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    network: env.x402Network,
    chainId: X_LAYER.chainId,
    explorer: X_LAYER.explorer,
    walletAddress: env.agenticWalletAddress || null,
    walletExplorer: env.agenticWalletAddress
      ? `${X_LAYER.explorer}/address/${env.agenticWalletAddress}`
      : null,
    zeroGasAssets: X_LAYER.zeroGasAssets,
    configured: {
      anthropic: isConfigured.anthropic(),
      okx: isConfigured.okx(),
      x402: isConfigured.x402(),
      signer: isConfigured.signer(),
    },
  });
});

statusRouter.get('/x402-log', (_req: Request, res: Response) => {
  res.json({ calls: x402Log.slice(-50).reverse() });
});

statusRouter.get('/economy', async (_req: Request, res: Response) => {
  // Mark-to-market the LP-equivalent position with the current OKB price and
  // the wallet's OKB balance, both pulled live from OnchainOS.
  let okbPriceUsdt = 0;
  let walletOkbBalance = 0;
  try {
    okbPriceUsdt = await readOkbPrice();
  } catch {
    /* */
  }
  try {
    if (env.agenticWalletAddress) {
      const balances = await getWalletBalances(env.agenticWalletAddress);
      walletOkbBalance =
        balances.find((b) => b.symbol.toUpperCase() === 'WOKB')?.amount ??
        balances.find((b) => b.symbol.toUpperCase() === 'OKB')?.amount ??
        0;
    }
  } catch {
    /* */
  }
  res.json(snapshot({ okbPriceUsdt, walletOkbBalance }));
});

statusRouter.post('/economy/configure', (req: Request, res: Response) => {
  const body = req.body as { autoDeployEnabled?: boolean; threshold?: number };
  if (typeof body.autoDeployEnabled === 'boolean') {
    setAutoDeploy(body.autoDeployEnabled);
  }
  if (typeof body.threshold === 'number') {
    setDeployThreshold(body.threshold);
  }
  res.json({ ok: true, ...getEconomyConfig() });
});

statusRouter.post('/economy/trigger-deploy', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { force?: boolean; fraction?: number };
  const result = await triggerAutoDeploy({ force: body.force, fraction: body.fraction });
  if (!result.ok) {
    return res.status(409).json(result);
  }
  res.json({
    ...result,
    explorerUrl: result.txHash ? `${X_LAYER.explorer}/tx/${result.txHash}` : undefined,
  });
});

statusRouter.get('/economy/history', (_req: Request, res: Response) => {
  res.json({
    deploys: getDeployHistory().map((e) => ({
      ...e,
      explorerUrl: `${X_LAYER.explorer}/tx/${e.txHash}`,
    })),
  });
});

statusRouter.get('/pools', async (_req: Request, res: Response) => {
  try {
    const pools = await getTopPools();
    res.json({ pools, source: 'OnchainOS market price-info', dexNetwork: X_LAYER.name });
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : 'pools fetch failed' });
  }
});

statusRouter.get('/activity', (_req: Request, res: Response) => {
  res.json({
    walletAddress: env.agenticWalletAddress || null,
    walletExplorer: env.agenticWalletAddress
      ? `${X_LAYER.explorer}/address/${env.agenticWalletAddress}`
      : null,
    chainId: X_LAYER.chainId,
    network: X_LAYER.name,
    ...activitySnapshot(),
  });
});

statusRouter.get('/security', async (req: Request, res: Response) => {
  const tokenParam = String(req.query.token ?? '').trim();
  if (!tokenParam) {
    return res.status(400).json({ error: 'token query param required (symbol or 0x address)' });
  }
  let resolved: string | undefined;
  if (tokenParam.startsWith('0x')) {
    try {
      resolved = getAddress(tokenParam).toLowerCase();
    } catch {
      return res.status(400).json({ error: 'invalid token address' });
    }
  } else {
    resolved = SYMBOL_TO_ADDRESS[tokenParam.toUpperCase()];
  }
  if (!resolved) {
    return res.status(400).json({ error: `unknown token symbol: ${tokenParam}` });
  }
  try {
    const security = await getTokenSecurity(resolved);
    res.json(security);
  } catch (err) {
    if (err instanceof OnchainOsError) {
      return res.status(503).json({ error: 'OnchainOS unavailable', detail: err.message });
    }
    const msg = err instanceof Error ? err.message : 'security scan failed';
    res.status(500).json({ error: msg });
  }
});

statusRouter.get('/portfolio', async (req: Request, res: Response) => {
  const rawAddress = String(req.query.address ?? env.agenticWalletAddress);
  if (!rawAddress) {
    return res.status(400).json({ error: 'address required' });
  }
  let address: string;
  try {
    address = getAddress(rawAddress); // validates checksum + format
  } catch {
    return res.status(400).json({ error: 'invalid wallet address' });
  }
  try {
    const balances = await getWalletBalances(address);
    const totalUsd = balances.reduce((sum, b) => sum + b.usdValue, 0);
    const payload: PortfolioResponse = {
      address,
      network: 'X Layer Mainnet',
      totalUsd,
      change24h: 0,
      changePercent: 0,
      tokens: balances,
    };
    res.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'portfolio fetch failed';
    console.error('[portfolio] upstream error:', msg);
    res.status(503).json({ error: 'portfolio service unavailable', detail: msg });
  }
});
