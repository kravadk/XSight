import { Router, type Request, type Response } from 'express';
import { withX402 } from '../middleware/x402.js';
import { analyticsJson, AiServiceError } from '../services/ai.js';
import {
  getTrendingTokens,
  getTokenSecurity,
  getWalletBalances,
  OnchainOsError,
} from '../services/onchainos.js';
import { env } from '../config/env.js';
import { X_LAYER } from '../utils/xlayer.js';

export const analysisRouter = Router();

// Public OpenAPI-style spec for the x402 endpoints. No payment required —
// this is the discovery surface that judges + integrators hit first.
analysisRouter.get('/x402-spec', (_req: Request, res: Response) => {
  res.json({
    name: 'XSight x402 API',
    version: '1.0.0',
    description:
      'Pay-per-call AI trading primitives on X Layer. Each endpoint is gated by an x402 payment receipt; pay in USDT (zero-gas on X Layer) and receive AI-generated structured JSON powered by Anthropic Claude + OnchainOS market data.',
    network: env.x402Network,
    chainId: X_LAYER.chainId,
    chainName: X_LAYER.name,
    asset: env.x402Asset,
    payTo: env.x402PayoutAddress,
    gasSponsored: true,
    zeroGasAssets: X_LAYER.zeroGasAssets,
    paymentScheme: 'exact',
    paymentInstruction: {
      header: 'X-PAYMENT',
      format: 'base64-encoded JSON of {payTo, amount, asset, network, txHash?, payer?}',
      devBypassHeader: 'X-PAYMENT: dev-bypass (only when NODE_ENV != production)',
    },
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/market-summary',
        priceUsdt: '0.01',
        description: 'AI-generated market overview for X Layer tokens',
        responseShape: { generatedAt: 'number', trending: 'TrendingToken[]', summary: 'AI JSON' },
      },
      {
        method: 'GET',
        path: '/api/v1/token-analysis',
        priceUsdt: '0.05',
        description: 'Deep token analysis with risk score',
        query: { token: '0x address' },
        responseShape: { token: 'string', risk: 'TokenSecurity', analysis: 'AI JSON' },
      },
      {
        method: 'GET',
        path: '/api/v1/trading-signals',
        priceUsdt: '0.10',
        description: 'AI buy/sell/hold signals with confidence scores',
        responseShape: { generatedAt: 'number', signals: 'AI JSON' },
      },
      {
        method: 'GET',
        path: '/api/v1/portfolio-advice',
        priceUsdt: '0.05',
        description: 'AI rebalancing recommendations for a wallet',
        query: { wallet: '0x address' },
        responseShape: { wallet: 'string', portfolio: 'TokenBalance[]', advice: 'AI JSON' },
      },
    ],
    examples: {
      unauthenticated_returns_402:
        'curl -i http://localhost:8787/api/v1/market-summary',
      dev_bypass:
        'curl -H "X-PAYMENT: dev-bypass" http://localhost:8787/api/v1/market-summary',
      signed_payment:
        "curl -H \"X-PAYMENT: $(printf '%s' '{\"payTo\":\"0x...\",\"amount\":\"0.01\",\"asset\":\"USDT\",\"network\":\"xlayer-mainnet\"}' | base64)\" http://localhost:8787/api/v1/market-summary",
    },
  });
});

function handleError(res: Response, err: unknown) {
  if (err instanceof AiServiceError) {
    return res.status(503).json({ error: 'AI service unavailable', detail: err.message });
  }
  if (err instanceof OnchainOsError) {
    return res.status(503).json({ error: 'OnchainOS unavailable', detail: err.message });
  }
  const msg = err instanceof Error ? err.message : 'unknown error';
  res.status(500).json({ error: msg });
}

analysisRouter.get(
  '/market-summary',
  withX402({ amount: '0.01', description: 'AI-generated X Layer market summary' }),
  async (_req: Request, res: Response) => {
    try {
      const trending = await getTrendingTokens();
      const summary = await analyticsJson('Summarize current X Layer market state', { trending });
      res.json({ generatedAt: Date.now(), trending, summary });
    } catch (err) {
      handleError(res, err);
    }
  },
);

analysisRouter.get(
  '/token-analysis',
  withX402({ amount: '0.05', description: 'Deep AI token analysis with risk score' }),
  async (req: Request, res: Response) => {
    const token = String(req.query.token ?? '');
    if (!token) return res.status(400).json({ error: 'token query param required' });
    try {
      const risk = await getTokenSecurity(token);
      const analysis = await analyticsJson('Analyze this token for traders', { token, risk });
      res.json({ token, risk, analysis });
    } catch (err) {
      handleError(res, err);
    }
  },
);

analysisRouter.get(
  '/trading-signals',
  withX402({ amount: '0.10', description: 'AI buy/sell signals with confidence scores' }),
  async (_req: Request, res: Response) => {
    try {
      const trending = await getTrendingTokens(undefined, 20);
      const signals = await analyticsJson(
        'Generate buy/sell/hold signals with confidence 0-1 for each token',
        { trending },
      );
      res.json({ generatedAt: Date.now(), signals });
    } catch (err) {
      handleError(res, err);
    }
  },
);

analysisRouter.get(
  '/portfolio-advice',
  withX402({ amount: '0.05', description: 'AI rebalancing recommendations' }),
  async (req: Request, res: Response) => {
    const wallet = String(req.query.wallet ?? '');
    if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
    try {
      const portfolio = await getWalletBalances(wallet);
      const advice = await analyticsJson('Recommend rebalancing for this portfolio', { portfolio });
      res.json({ wallet, portfolio, advice });
    } catch (err) {
      handleError(res, err);
    }
  },
);
