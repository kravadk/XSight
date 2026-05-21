import { Router, type Request, type Response } from 'express';
import { getAddress } from 'ethers';
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
import { buildCupActionPlan, getCupAiEdge, getCupFairOdds, getCupPlayerStats, getCupResult, getCupSentiment, getCupSettlementCheck, listCupMatches, scoreCupTeamStrength } from '../services/cupData.js';
import { getFanScore } from '../services/cupReputation.js';

function requireAddress(raw: string, res: Response): string | null {
  const trimmed = raw.trim();
  if (!trimmed) { res.status(400).json({ error: 'address param required' }); return null; }
  try { return getAddress(trimmed); }
  catch { res.status(400).json({ error: 'invalid Ethereum address' }); return null; }
}

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
    assetAddress: env.x402AssetAddress,
    decimals: 6,
    payTo: env.x402PayoutAddress,
    gasSponsored: true,
    zeroGasAssets: X_LAYER.zeroGasAssets,
    paymentScheme: 'exact',
    paymentInstruction: {
      header: 'X-PAYMENT',
      format: 'base64-encoded JSON of {payTo, amount, asset, network, txHash?, payer?}',
      devBypassHeader: 'X-PAYMENT: dev-bypass (development only; production always requires a real payment tx)',
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
      {
        method: 'GET',
        path: '/api/v1/cup/fixtures',
        priceUsdt: '0.01',
        description: 'World Cup fixture feed with real source receipts for builder apps',
        responseShape: { fixtures: 'CupMatch[]', sourceStatus: 'live|source_quorum_unavailable|provider_rate_limited' },
      },
      {
        method: 'GET',
        path: '/api/v1/cup/result/:matchId',
        priceUsdt: '0.02',
        description: 'Canonical match result and optimistic settlement state',
        responseShape: { matchId: 'string', settlement: 'object', receipts: 'CupSourceReceipt[]' },
      },
      {
        method: 'GET',
        path: '/api/v1/cup/player-stats',
        priceUsdt: '0.02',
        description: 'Player impact stats when a real provider supplies them; returns unavailable/empty instead of fabricated players',
        query: { matchId: 'CupHub match id' },
        responseShape: { players: 'CupPlayerStat[]', sourceHash: 'string' },
      },
      {
        method: 'GET',
        path: '/api/v1/cup/ai-edge',
        priceUsdt: '0.03',
        description: 'AI-ready fair probabilities, confidence, and settlement risk',
        query: { matchId: 'CupHub match id' },
        responseShape: { fairProbability: 'object', risk: 'LOW|MEDIUM|HIGH', edge: 'string' },
      },
      {
        method: 'GET',
        path: '/api/v1/cup/fair-odds',
        priceUsdt: '0.03',
        description: 'Decimal fair odds derived from XSight fairProbability; not bookmaker odds',
        query: { matchId: 'CupHub match id' },
        responseShape: { market: '1X2', decimalOdds: 'object', confidence: 'number', sourceHash: 'string' },
      },
      {
        method: 'GET',
        path: '/api/v1/cup/settlement-check',
        priceUsdt: '0.02',
        description: 'Machine-readable settlement readiness, quorum, challenge, and finalization state',
        query: { matchId: 'CupHub match id' },
        responseShape: { canPropose: 'boolean', canFinalize: 'boolean', status: 'string', receipts: 'CupSourceReceipt[]' },
      },
      {
        method: 'GET',
        path: '/api/v1/cup/sentiment',
        priceUsdt: '0.02',
        description: 'Fan/social sentiment signal for a match, treated as non-canonical AI input',
        query: { matchId: 'CupHub match id' },
        responseShape: { home: 'sentiment object', away: 'sentiment object', sourceHash: 'string' },
      },
      {
        method: 'GET',
        path: '/api/v1/cup/team-strength',
        priceUsdt: '0.02',
        description: 'Team strength and form score for fair-pricing engines',
        query: { matchId: 'CupHub match id' },
        responseShape: { home: 'strength object', away: 'strength object', delta: 'number' },
      },
      {
        method: 'GET',
        path: '/api/v1/cup/fan-score',
        priceUsdt: '0.01',
        description: 'FanPass wallet reputation score for World Cup app gating',
        query: { wallet: '0x address' },
        responseShape: { wallet: 'string', score: 'number', breakdown: 'object' },
      },
      {
        method: 'POST',
        path: '/api/v1/cup/action-plan',
        priceUsdt: '0.05',
        description: 'Builder/agent action plan for using CupHub around a match',
        responseShape: { primaryAction: 'string', guardrails: 'string[]', apiCalls: 'string[]' },
      },
    ],
    examples: {
      unauthenticated_returns_402:
        'curl -i http://localhost:8787/api/v1/market-summary',
      dev_bypass:
        'curl -H "X-PAYMENT: dev-bypass" http://localhost:8787/api/v1/market-summary  # development only',
      signed_payment:
        "curl -H \"X-PAYMENT: $(printf '%s' '{\"payTo\":\"0x...\",\"amount\":\"0.01\",\"asset\":\"USDT\",\"network\":\"xlayer-mainnet\",\"txHash\":\"0x...\"}' | base64)\" http://localhost:8787/api/v1/market-summary",
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
    const token = requireAddress(String(req.query.token ?? ''), res);
    if (!token) return;
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
    const wallet = requireAddress(String(req.query.wallet ?? ''), res);
    if (!wallet) return;
    try {
      const portfolio = await getWalletBalances(wallet);
      const advice = await analyticsJson('Recommend rebalancing for this portfolio', { portfolio });
      res.json({ wallet, portfolio, advice });
    } catch (err) {
      handleError(res, err);
    }
  },
);

analysisRouter.get(
  '/cup/fixtures',
  withX402({ amount: '0.01', description: 'CupHub fixture feed with source receipts' }),
  async (_req: Request, res: Response) => {
    res.json({ fixtures: await listCupMatches() });
  },
);

analysisRouter.get(
  '/cup/result/:matchId',
  withX402({ amount: '0.02', description: 'CupHub canonical result and settlement state' }),
  async (req: Request, res: Response) => {
    const result = await getCupResult(req.params.matchId);
    if (!result) return res.status(404).json({ error: 'match not found' });
    res.json(result);
  },
);

analysisRouter.get(
  '/cup/player-stats',
  withX402({ amount: '0.02', description: 'CupHub player impact stats' }),
  async (req: Request, res: Response) => {
    const matchId = String(req.query.matchId ?? '');
    if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
    const stats = await getCupPlayerStats(matchId);
    if (!stats) return res.status(404).json({ error: 'match not found' });
    res.json(stats);
  },
);

analysisRouter.get(
  '/cup/ai-edge',
  withX402({ amount: '0.03', description: 'CupHub AI edge and settlement risk signal' }),
  async (req: Request, res: Response) => {
    const matchId = String(req.query.matchId ?? '');
    if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
    const edge = await getCupAiEdge(matchId);
    if (!edge) return res.status(404).json({ error: 'match not found' });
    res.json(edge);
  },
);

analysisRouter.get(
  '/cup/fair-odds',
  withX402({ amount: '0.03', description: 'CupHub fair odds quote' }),
  async (req: Request, res: Response) => {
    const matchId = String(req.query.matchId ?? '');
    if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
    const odds = await getCupFairOdds(matchId);
    if (!odds) return res.status(404).json({ error: 'match not found' });
    res.json(odds);
  },
);

analysisRouter.get(
  '/cup/settlement-check',
  withX402({ amount: '0.02', description: 'CupHub settlement readiness check' }),
  async (req: Request, res: Response) => {
    const matchId = String(req.query.matchId ?? '');
    if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
    const check = await getCupSettlementCheck(matchId);
    if (!check) return res.status(404).json({ error: 'match not found' });
    res.json(check);
  },
);

analysisRouter.get(
  '/cup/sentiment',
  withX402({ amount: '0.02', description: 'CupHub sentiment signal' }),
  async (req: Request, res: Response) => {
    const matchId = String(req.query.matchId ?? '');
    if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
    const sentiment = await getCupSentiment(matchId);
    if (!sentiment) return res.status(404).json({ error: 'match not found' });
    res.json(sentiment);
  },
);

analysisRouter.get(
  '/cup/team-strength',
  withX402({ amount: '0.02', description: 'CupHub team strength score' }),
  async (req: Request, res: Response) => {
    const matchId = String(req.query.matchId ?? '');
    if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
    const strength = await scoreCupTeamStrength(matchId);
    if (!strength) return res.status(404).json({ error: 'match not found' });
    res.json(strength);
  },
);

analysisRouter.get(
  '/cup/fan-score',
  withX402({ amount: '0.01', description: 'FanPass wallet reputation score' }),
  async (req: Request, res: Response) => {
    const wallet = String(req.query.wallet ?? '');
    if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
    const score = await getFanScore(wallet);
    if (!score) return res.status(400).json({ error: 'invalid wallet' });
    res.json(score);
  },
);

analysisRouter.post(
  '/cup/action-plan',
  withX402({ amount: '0.05', description: 'CupHub builder or agent action plan' }),
  async (req: Request, res: Response) => {
    const body = req.body as { matchId?: string; mode?: 'builder' | 'agent' | 'fan' };
    if (!body.matchId) return res.status(400).json({ error: 'matchId required' });
    const plan = await buildCupActionPlan(body.matchId, body.mode ?? 'builder');
    if (!plan) return res.status(404).json({ error: 'match not found' });
    res.json(plan);
  },
);
