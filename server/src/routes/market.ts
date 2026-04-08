/**
 * /api/market/* — public read-only surface backed by tokenTracker + poolTracker
 * background services. Frontend portfolio + earn pages poll these for live
 * lists; the chat AI uses them as context input.
 */
import { Router, type Request, type Response } from 'express';
import {
  getAllTrackedTokens,
  getTokenAnalytics,
  getTrendingAnalytics,
  getTokenTrackerStatus,
} from '../services/tokenTracker.js';
import { getAllPools, getPoolTrackerStatus } from '../services/poolTracker.js';
import { searchCatalog, resolveToken, catalogStats, getAllCatalogTokens } from '../services/tokenCatalog.js';

export const marketRouter = Router();

// Token catalog — full X Layer universe via OKX getAllTokens (refreshed 10min)
marketRouter.get('/catalog', (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));
  const tokens = q.length > 0 ? searchCatalog(q, limit) : getAllCatalogTokens().slice(0, limit);
  res.json({ tokens, total: getAllCatalogTokens().length, stats: catalogStats() });
});

marketRouter.get('/catalog/resolve', (req: Request, res: Response) => {
  const input = String(req.query.input ?? '');
  const token = resolveToken(input);
  if (!token) return res.status(404).json({ error: 'not found in catalog' });
  res.json(token);
});

marketRouter.get('/tokens', (_req: Request, res: Response) => {
  const tokens = getAllTrackedTokens();
  res.json({
    count: tokens.length,
    trendingCount: tokens.filter((t) => t.isTrending).length,
    tokens,
    tracker: getTokenTrackerStatus(),
  });
});

marketRouter.get('/tokens/:symbol', (req: Request, res: Response) => {
  const symbol = String(req.params.symbol ?? '').trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  const data = getTokenAnalytics(symbol);
  if (!data) return res.status(404).json({ error: 'token not tracked yet' });
  res.json(data);
});

marketRouter.get('/pools', (_req: Request, res: Response) => {
  const pools = getAllPools();
  res.json({
    count: pools.length,
    pools,
    tracker: getPoolTrackerStatus(),
  });
});

marketRouter.get('/alerts', (_req: Request, res: Response) => {
  const tokens = getAllTrackedTokens();
  const pools = getAllPools();
  const alerts: { kind: string; severity: 'info' | 'warn' | 'critical'; message: string; timestamp: number }[] = [];
  const now = Date.now();

  for (const t of tokens) {
    if (Math.abs(t.change24h) > 15) {
      alerts.push({
        kind: 'price-move',
        severity: Math.abs(t.change24h) > 30 ? 'critical' : 'warn',
        message: `${t.symbol} ${t.change24h >= 0 ? '+' : ''}${t.change24h.toFixed(2)}% in 24h`,
        timestamp: t.lastUpdated,
      });
    }
    if (t.volumeRatio > 2.5 && t.volumeAvg > 0) {
      alerts.push({
        kind: 'volume-spike',
        severity: 'info',
        message: `${t.symbol} volume ${t.volumeRatio.toFixed(1)}× above average ($${(t.volume24h / 1_000_000).toFixed(1)}M)`,
        timestamp: t.lastUpdated,
      });
    }
    if (t.isNew) {
      alerts.push({
        kind: 'new-token',
        severity: 'info',
        message: `${t.symbol} newly tracked`,
        timestamp: t.lastUpdated,
      });
    }
  }

  for (const p of pools) {
    if (p.aprTrend === 'rising' && p.apr - p.aprPrev > 0.5) {
      alerts.push({
        kind: 'apr-rising',
        severity: 'info',
        message: `${p.pair} APR rising: ${p.apr.toFixed(2)}% (was ${p.aprPrev.toFixed(2)}%)`,
        timestamp: p.lastUpdated,
      });
    }
    if (p.isNew) {
      alerts.push({
        kind: 'new-pool',
        severity: 'info',
        message: `New pool tracked: ${p.pair} ${p.apr.toFixed(2)}% APR`,
        timestamp: p.lastUpdated,
      });
    }
  }

  alerts.sort((a, b) => b.timestamp - a.timestamp);

  res.json({ generatedAt: now, count: alerts.length, alerts: alerts.slice(0, 50) });
});

marketRouter.get('/trending', (_req: Request, res: Response) => {
  res.json({ trending: getTrendingAnalytics() });
});
