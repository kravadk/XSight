/**
 * Spec-aliased economy routes.
 *
 * The canonical URLs live under /api/status/economy/* but the public spec
 * exposes them as /api/economy/* — this router is a thin shim that delegates
 * to the same handler functions, so both URL shapes work identically.
 */
import { Router, type Request, type Response } from 'express';
import {
  setAutoDeploy,
  setDeployThreshold,
  getEconomyConfig,
  getDeployHistory,
} from '../services/economyLoop.js';
import { triggerAutoDeploy } from '../services/autoDeploy.js';
import { X_LAYER } from '../utils/xlayer.js';

export const economyRouter = Router();

economyRouter.post('/configure', (req: Request, res: Response) => {
  const body = req.body as { autoDeployEnabled?: boolean; threshold?: number; enabled?: boolean };
  // accept both `autoDeployEnabled` and the spec alias `enabled`
  const enabled = body.autoDeployEnabled ?? body.enabled;
  if (typeof enabled === 'boolean') setAutoDeploy(enabled);
  if (typeof body.threshold === 'number') setDeployThreshold(body.threshold);
  res.json({ ok: true, saved: true, ...getEconomyConfig() });
});

economyRouter.post('/trigger-deploy', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { force?: boolean; fraction?: number };
  const result = await triggerAutoDeploy({ force: body.force, fraction: body.fraction });
  if (!result.ok) return res.status(409).json(result);
  res.json({
    ...result,
    amountDeployed: result.fromAmountUsdt,
    explorerUrl: result.txHash ? `${X_LAYER.explorer}/tx/${result.txHash}` : undefined,
  });
});

economyRouter.get('/history', (_req: Request, res: Response) => {
  res.json({
    deploys: getDeployHistory().map((e) => ({
      ...e,
      explorerUrl: `${X_LAYER.explorer}/tx/${e.txHash}`,
    })),
  });
});
