import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { chatRouter } from './routes/chat.js';
import { analysisRouter } from './routes/analysis.js';
import { statusRouter } from './routes/status.js';
import { swapRouter } from './routes/swap.js';
import { economyRouter } from './routes/economy.js';
import { marketRouter } from './routes/market.js';
import { strategyRouter } from './routes/strategies.js';
import { mcpRouter } from './routes/mcp.js';
import { cupRouter } from './routes/cup.js';
import { marketsRouter } from './routes/markets.js';
import { startTokenTracker } from './services/tokenTracker.js';
import { startPoolTracker } from './services/poolTracker.js';
import { startStrategyEngine } from './services/strategyEngine.js';
import { startTokenCatalog } from './services/tokenCatalog.js';
import { startAgentHeartbeat } from './services/agentHeartbeat.js';
import { startQuorumResolver } from './services/cupScheduler.js';
import { startMarketIndexer } from './services/marketIndexer.js';

const app = express();

const allowedOrigins = env.corsOrigin === '*'
  ? true
  : env.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: env.corsOrigin !== '*',
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api/chat', chatRouter);
app.use('/api/swap', swapRouter);
app.use('/api/status', statusRouter);
app.use('/api/economy', economyRouter); // spec-aliased shim, see routes/economy.ts
app.use('/api/market', marketRouter);
app.use('/api/strategies', strategyRouter);
app.use('/api/cup', cupRouter);
app.use('/api/markets', marketsRouter);
app.use('/api/v1', analysisRouter);
app.use('/mcp', mcpRouter);

// Background data trackers + automation engine
startTokenCatalog(); // must run before swap routes resolve
startTokenTracker();
startPoolTracker();
startStrategyEngine();
startAgentHeartbeat(); // autonomous micro-swaps every 8 min for on-chain activity
startQuorumResolver(); // autonomous CupOracleV2 resolution (off unless CUP_RESOLVER_ENABLED=true)
void startMarketIndexer(); // ParimutuelMarket event indexer (idle until PARIMUTUEL_MARKET_ADDRESS set)

app.get('/', (_req, res) => {
  res.json({
    name: 'XSight server',
    version: '0.2.0',
    network: env.x402Network,
    endpoints: {
      chat: 'POST /api/chat',
      swapQuote: 'GET /api/swap/quote?from=USDT&to=OKB&amount=10',
      swap: 'POST /api/swap',
      health: 'GET /api/status/health',
      heartbeat: 'GET /api/status/heartbeat',
      portfolio: 'GET /api/status/portfolio',
      portfolioHistory: 'GET /api/status/portfolio/history',
      x402Log: 'GET /api/status/x402-log',
      economy: 'GET /api/status/economy',
      economyConfigure: 'POST /api/status/economy/configure',
      economyTriggerDeploy: 'POST /api/status/economy/trigger-deploy',
      economyHistory: 'GET /api/status/economy/history',
      activity: 'GET /api/status/activity',
      pools: 'GET /api/status/pools',
      security: 'GET /api/status/security?token=OKB',
      marketTokens: 'GET /api/market/tokens',
      marketTokenDetail: 'GET /api/market/tokens/:symbol',
      marketPools: 'GET /api/market/pools',
      marketTrending: 'GET /api/market/trending',
      marketAlerts: 'GET /api/market/alerts',
      strategiesList: 'GET /api/strategies',
      strategiesCreate: 'POST /api/strategies',
      strategiesFires: 'GET /api/strategies/fires',
      cupOverview: 'GET /api/cup/overview',
      cupFixtures: 'GET /api/cup/fixtures',
      cupAiEdge: 'GET /api/cup/ai-edge?matchId=<live-match-id>',
      cupPlayerStats: 'GET /api/cup/player-stats?matchId=<live-match-id>',
      cupSentiment: 'GET /api/cup/sentiment?matchId=<live-match-id>',
      cupTeamStrength: 'GET /api/cup/team-strength?matchId=<live-match-id>',
      cupSettlementLog: 'GET /api/cup/settlement-log?matchId=<live-match-id>',
      cupResolver: 'GET /api/cup/resolver',
      cupPundit: 'GET /api/cup/pundit',
      cupFreePicks: 'GET/POST /api/cup/free-picks  (free-to-play, no wallet money)',
      cupLeaderboard: 'GET /api/cup/leaderboard',
      cupLeagues: 'GET/POST /api/cup/leagues  ·  POST /api/cup/leagues/join  ·  GET /api/cup/leagues/:id/leaderboard',
      cupPunditExecutions: 'GET /api/cup/pundit/executions',
      cupPunditExecute: 'POST /api/cup/pundit/execute  (operator-gated, body {matchId})',
      cupProposeResult: 'POST /api/cup/propose-result',
      markets: 'GET /api/markets',
      marketDetail: 'GET /api/markets/:id',
      marketPosition: 'GET /api/markets/:id/position?wallet=0x...',
      marketIndexer: 'GET /api/markets/indexer',
      marketStakeTx: 'POST /api/markets/:id/stake-tx',
      mcp: 'POST /mcp  (MCP JSON-RPC 2.0)',
      mcpDiscover: 'GET /mcp  (capability discovery)',
      x402Spec: 'GET /api/v1/x402-spec',
      monetized: [
        'GET /api/v1/market-summary  (0.01 USDT)',
        'GET /api/v1/token-analysis?token=0x...  (0.05 USDT)',
        'GET /api/v1/trading-signals  (0.10 USDT)',
        'GET /api/v1/portfolio-advice?wallet=0x...  (0.05 USDT)',
        'GET /api/v1/cup/ai-edge?matchId=<live-match-id>  (0.03 USDT)',
        'GET /api/v1/cup/player-stats?matchId=<live-match-id>  (0.02 USDT)',
        'GET /api/v1/cup/sentiment?matchId=<live-match-id>  (0.02 USDT)',
        'GET /api/v1/cup/team-strength?matchId=<live-match-id>  (0.02 USDT)',
        'GET /api/v1/cup/fan-score?wallet=0x...  (0.01 USDT)',
      ],
    },
  });
});

app.listen(env.port, () => {
  console.log(`[xsight-server] listening on http://localhost:${env.port}`);
});
