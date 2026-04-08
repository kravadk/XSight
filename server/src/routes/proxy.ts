/**
 * Thin server-side proxy for third-party APIs that need secret keys
 * and cannot be called directly from the browser (CORS / key exposure).
 *
 * Mounted at: /api/proxy
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export const proxyRouter = Router();

// ── Blockaid token / address scan ─────────────────────────────────────────
// Frontend calls  POST /api/proxy/blockaid/v0/evm/token/scan
// This forwards to https://api.blockaid.io/v0/evm/token/scan
// with the server-side BLOCKAID_API_KEY (never exposed to browser).

proxyRouter.post('/blockaid/*', async (req: Request, res: Response): Promise<void> => {
  if (!env.blockaidApiKey) {
    res.status(503).json({ error: 'BLOCKAID_API_KEY not configured on server' });
    return;
  }

  const subPath = req.path.replace(/^\/blockaid/, '');
  const url = `https://api.blockaid.io${subPath}`;

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': env.blockaidApiKey,
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = (await upstream.json()) as unknown;
    res.status(upstream.status).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    res.status(502).json({ error: `Blockaid proxy error: ${message}` });
  }
});
