/**
 * XSight Strategy Engine — trigger/condition/action automation.
 *
 * Inspired by DeFi Saver's automation pattern (SubStorage + StrategyExecutor):
 * users register strategies that the engine evaluates on a 60s tick. When
 * conditions are met the action fires (notify the user, or execute on-chain
 * via the existing autoDeploy/swap services).
 *
 * In-memory store, no persistence — matches the rest of XSight's runtime
 * state model. A real deployment would back this with a database.
 */
import { getAllTrackedTokens, getTokenAnalytics } from './tokenTracker.js';
import { getAllPools } from './poolTracker.js';
import { triggerAutoDeploy } from './autoDeploy.js';

const TICK_MS = 60_000;

export type TriggerKind =
  | 'price_below'
  | 'price_above'
  | 'change24h_below'
  | 'change24h_above'
  | 'volume_spike'
  | 'apr_above'
  | 'apr_below'
  | 'new_token'
  | 'concentration_above';

export type ActionKind = 'notify' | 'auto_deploy';

export interface StrategySpec {
  kind: TriggerKind;
  /** Token symbol for token triggers, pool pair for pool triggers, percent for concentration */
  target?: string;
  /** Numeric threshold the trigger compares against */
  threshold?: number;
  /** Action to fire when triggered */
  action: ActionKind;
  /** Free-text label the user gave the alert (or auto-generated) */
  label?: string;
  /** Optional HTTPS webhook URL to POST a JSON payload when this strategy fires */
  webhookUrl?: string;
}

export interface Strategy extends StrategySpec {
  id: string;
  description: string;
  createdAt: number;
  enabled: boolean;
  firedCount: number;
  lastFiredAt: number;
  lastEvaluatedAt: number;
  /** Cooldown in ms — won't re-fire within this window after a hit */
  cooldownMs: number;
}

export interface FiredEvent {
  strategyId: string;
  timestamp: number;
  reason: string;
  actionResult?: string;
}

const strategies = new Map<string, Strategy>();
const recentFires: FiredEvent[] = [];
let intervalHandle: NodeJS.Timeout | null = null;
let counter = 0;

const nextId = () => `s-${Date.now()}-${++counter}`;

function describe(spec: StrategySpec): string {
  switch (spec.kind) {
    case 'price_below':
      return `Notify when ${spec.target} drops below $${spec.threshold}`;
    case 'price_above':
      return `Notify when ${spec.target} rises above $${spec.threshold}`;
    case 'change24h_below':
      return `Notify when ${spec.target} 24h change < ${spec.threshold}%`;
    case 'change24h_above':
      return `Notify when ${spec.target} 24h change > ${spec.threshold}%`;
    case 'volume_spike':
      return `Notify when ${spec.target} volume > ${spec.threshold ?? 2}× average`;
    case 'apr_above':
      return `Notify when pool ${spec.target} APR > ${spec.threshold}%`;
    case 'apr_below':
      return `Notify when pool ${spec.target} APR < ${spec.threshold}%`;
    case 'new_token':
      return 'Notify when a new token is detected on X Layer';
    case 'concentration_above':
      return `Notify when ${spec.target ?? 'top holding'} > ${spec.threshold}% of portfolio`;
  }
}

export function createStrategy(spec: StrategySpec): Strategy {
  const id = nextId();
  const s: Strategy = {
    ...spec,
    id,
    description: describe(spec),
    createdAt: Date.now(),
    enabled: true,
    firedCount: 0,
    lastFiredAt: 0,
    lastEvaluatedAt: 0,
    cooldownMs: 5 * 60_000, // 5 min cooldown by default
  };
  strategies.set(id, s);
  return s;
}

export function listStrategies(): Strategy[] {
  return Array.from(strategies.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getStrategy(id: string): Strategy | undefined {
  return strategies.get(id);
}

export function deleteStrategy(id: string): boolean {
  return strategies.delete(id);
}

export function setStrategyEnabled(id: string, enabled: boolean): Strategy | null {
  const s = strategies.get(id);
  if (!s) return null;
  s.enabled = enabled;
  return s;
}

export function getRecentFires(limit = 50): FiredEvent[] {
  return recentFires.slice(0, limit);
}

/**
 * Notification sink — wired by the route layer to push events into the
 * notification stream / SSE / etc. Default impl just logs.
 */
type NotifySink = (kind: 'success' | 'info' | 'error' | 'event', title: string, body?: string) => void;
let notifySink: NotifySink = (kind, title, body) => {
  console.log(`[strategy:notify] ${kind} ${title}${body ? ' — ' + body : ''}`);
};
export function setNotifySink(sink: NotifySink) {
  notifySink = sink;
}

interface EvalResult {
  fired: boolean;
  reason?: string;
}

function evaluate(s: Strategy): EvalResult {
  const target = s.target?.toUpperCase();
  switch (s.kind) {
    case 'price_below': {
      if (!target || s.threshold == null) return { fired: false };
      const t = getTokenAnalytics(target);
      if (!t || t.price === 0) return { fired: false };
      if (t.price < s.threshold)
        return { fired: true, reason: `${t.symbol} price $${t.price.toFixed(4)} < $${s.threshold}` };
      return { fired: false };
    }
    case 'price_above': {
      if (!target || s.threshold == null) return { fired: false };
      const t = getTokenAnalytics(target);
      if (!t || t.price === 0) return { fired: false };
      if (t.price > s.threshold)
        return { fired: true, reason: `${t.symbol} price $${t.price.toFixed(4)} > $${s.threshold}` };
      return { fired: false };
    }
    case 'change24h_below': {
      if (!target || s.threshold == null) return { fired: false };
      const t = getTokenAnalytics(target);
      if (!t) return { fired: false };
      if (t.change24h < s.threshold)
        return { fired: true, reason: `${t.symbol} 24h ${t.change24h.toFixed(2)}% < ${s.threshold}%` };
      return { fired: false };
    }
    case 'change24h_above': {
      if (!target || s.threshold == null) return { fired: false };
      const t = getTokenAnalytics(target);
      if (!t) return { fired: false };
      if (t.change24h > s.threshold)
        return { fired: true, reason: `${t.symbol} 24h ${t.change24h.toFixed(2)}% > ${s.threshold}%` };
      return { fired: false };
    }
    case 'volume_spike': {
      if (!target) return { fired: false };
      const t = getTokenAnalytics(target);
      if (!t || t.volumeAvg === 0) return { fired: false };
      const minRatio = s.threshold ?? 2;
      if (t.volumeRatio >= minRatio)
        return { fired: true, reason: `${t.symbol} volume ${t.volumeRatio.toFixed(2)}× avg ≥ ${minRatio}×` };
      return { fired: false };
    }
    case 'apr_above': {
      if (!target || s.threshold == null) return { fired: false };
      const pool = getAllPools().find((p) => p.pair.toUpperCase() === target);
      if (!pool) return { fired: false };
      if (pool.apr > s.threshold)
        return { fired: true, reason: `${pool.pair} APR ${pool.apr.toFixed(2)}% > ${s.threshold}%` };
      return { fired: false };
    }
    case 'apr_below': {
      if (!target || s.threshold == null) return { fired: false };
      const pool = getAllPools().find((p) => p.pair.toUpperCase() === target);
      if (!pool) return { fired: false };
      if (pool.apr < s.threshold)
        return { fired: true, reason: `${pool.pair} APR ${pool.apr.toFixed(2)}% < ${s.threshold}%` };
      return { fired: false };
    }
    case 'new_token': {
      const newOnes = getAllTrackedTokens().filter((t) => t.isNew);
      if (newOnes.length === 0) return { fired: false };
      return {
        fired: true,
        reason: `New token(s) tracked: ${newOnes.map((t) => t.symbol).join(', ')}`,
      };
    }
    case 'concentration_above': {
      // This would need wallet balances injected — simplified: skip until we
      // get a portfolio reference. For demo we just compare the threshold to
      // any tracked token that is also in the curated set.
      if (s.threshold == null) return { fired: false };
      // Engine doesn't have direct portfolio access — chat enrichment passes
      // it via the data block. For autonomous evaluation we leave this as a
      // no-op so it doesn't false-fire.
      return { fired: false };
    }
  }
}

async function fireWebhook(s: Strategy, reason: string, actionResult: string): Promise<void> {
  if (!s.webhookUrl) return;
  try {
    const url = new URL(s.webhookUrl); // validate URL
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
    await fetch(s.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyId: s.id,
        label: s.label ?? s.description,
        reason,
        actionResult,
        timestamp: Date.now(),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* best-effort */ }
}

async function executeAction(s: Strategy, reason: string): Promise<string> {
  if (s.action === 'notify') {
    notifySink('event', s.label ?? s.description, reason);
    const result = 'notified';
    await fireWebhook(s, reason, result);
    return result;
  }
  if (s.action === 'auto_deploy') {
    notifySink('event', `Auto-deploy triggered by ${s.description}`, reason);
    let result: string;
    try {
      const res = await triggerAutoDeploy({ force: true });
      if (res.ok) {
        notifySink(
          'success',
          'Auto-deploy executed',
          `${res.fromAmountUsdt} USDT → ${res.toAmountOkb?.toFixed(8)} OKB`,
        );
        result = `deployed ${res.fromAmountUsdt} USDT`;
      } else {
        notifySink('error', 'Auto-deploy failed', res.reason ?? 'unknown');
        result = `deploy failed: ${res.reason}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      notifySink('error', 'Auto-deploy threw', msg);
      result = `error: ${msg}`;
    }
    await fireWebhook(s, reason, result);
    return result;
  }
  return 'noop';
}

async function tick(): Promise<void> {
  for (const s of strategies.values()) {
    if (!s.enabled) continue;
    s.lastEvaluatedAt = Date.now();
    if (s.lastFiredAt > 0 && Date.now() - s.lastFiredAt < s.cooldownMs) continue;
    const result = evaluate(s);
    if (result.fired) {
      s.firedCount += 1;
      s.lastFiredAt = Date.now();
      const actionResult = await executeAction(s, result.reason ?? 'condition met');
      const event: FiredEvent = {
        strategyId: s.id,
        timestamp: Date.now(),
        reason: result.reason ?? '',
        actionResult,
      };
      recentFires.unshift(event);
      if (recentFires.length > 100) recentFires.pop();
    }
  }
}

export function startStrategyEngine() {
  if (intervalHandle) return;
  void tick();
  intervalHandle = setInterval(() => void tick(), TICK_MS);
}

export function stopStrategyEngine() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

export function strategyEngineStatus() {
  return {
    running: intervalHandle !== null,
    tickIntervalMs: TICK_MS,
    activeStrategies: strategies.size,
    fireCount: recentFires.length,
  };
}
