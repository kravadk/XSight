/**
 * Strategy CRUD — user-defined alerts and automations.
 *
 *   POST   /api/strategies                 → create
 *   GET    /api/strategies                 → list
 *   GET    /api/strategies/fires           → recent triggered events
 *   GET    /api/strategies/status          → engine status
 *   PATCH  /api/strategies/:id             → enable / disable
 *   DELETE /api/strategies/:id             → delete
 */
import { Router, type Request, type Response } from 'express';
import {
  createStrategy,
  deleteStrategy,
  getRecentFires,
  listStrategies,
  setStrategyEnabled,
  strategyEngineStatus,
  type StrategySpec,
  type TriggerKind,
  type ActionKind,
} from '../services/strategyEngine.js';

const MAX_STRATEGIES = 50;
// Simple per-IP rate limit: max 10 creates per minute
const createCounts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = createCounts.get(ip);
  if (!entry || entry.resetAt < now) {
    createCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

export const strategyRouter = Router();

const VALID_TRIGGERS: TriggerKind[] = [
  'price_below',
  'price_above',
  'change24h_below',
  'change24h_above',
  'volume_spike',
  'apr_above',
  'apr_below',
  'new_token',
  'concentration_above',
];

const VALID_ACTIONS: ActionKind[] = ['notify', 'auto_deploy'];

strategyRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    strategies: listStrategies(),
    status: strategyEngineStatus(),
  });
});

strategyRouter.get('/fires', (_req: Request, res: Response) => {
  res.json({ fires: getRecentFires() });
});

strategyRouter.get('/status', (_req: Request, res: Response) => {
  res.json(strategyEngineStatus());
});

strategyRouter.post('/', (req: Request, res: Response) => {
  const ip = req.ip ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many strategies created — wait a minute' });
  }
  if (listStrategies().length >= MAX_STRATEGIES) {
    return res.status(400).json({ error: `Maximum of ${MAX_STRATEGIES} strategies reached` });
  }

  const body = (req.body ?? {}) as Partial<StrategySpec>;
  if (!body.kind || !VALID_TRIGGERS.includes(body.kind)) {
    return res.status(400).json({ error: `kind must be one of ${VALID_TRIGGERS.join(', ')}` });
  }

  // concentration_above requires live portfolio data the engine doesn't have autonomously
  if (body.kind === 'concentration_above') {
    return res.status(400).json({
      error: 'concentration_above is not supported for autonomous evaluation — use the chat to get portfolio concentration alerts instead',
    });
  }

  const action: ActionKind = body.action ?? 'notify';
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `action must be one of ${VALID_ACTIONS.join(', ')}` });
  }

  // Per-trigger validation
  const needsTarget = body.kind !== 'new_token';
  const needsThreshold = body.kind !== 'new_token';
  if (needsTarget && (!body.target || typeof body.target !== 'string')) {
    return res.status(400).json({ error: 'target is required for this trigger kind' });
  }
  if (needsThreshold && (body.threshold === undefined || typeof body.threshold !== 'number')) {
    return res.status(400).json({ error: 'threshold (number) is required for this trigger kind' });
  }

  const strategy = createStrategy({
    kind: body.kind,
    target: body.target,
    threshold: body.threshold,
    action,
    label: body.label,
  });

  res.json({ ok: true, strategy });
});

strategyRouter.patch('/:id', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { enabled?: boolean };
  if (typeof body.enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) required' });
  }
  const updated = setStrategyEnabled(req.params.id, body.enabled);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, strategy: updated });
});

strategyRouter.delete('/:id', (req: Request, res: Response) => {
  const ok = deleteStrategy(req.params.id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});
