import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    return '';
  }
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
  okxApiKey: required('OKX_API_KEY'),
  okxSecretKey: required('OKX_SECRET_KEY'),
  okxPassphrase: required('OKX_PASSPHRASE'),
  okxProjectId: required('OKX_PROJECT_ID'),
  agenticWalletAddress: required('AGENTIC_WALLET_ADDRESS'),
  deployerPrivateKey: required('DEPLOYER_PRIVATE_KEY'),
  xLayerRpcUrl: process.env.X_LAYER_RPC_URL ?? 'https://rpc.xlayer.tech',
  x402PayoutAddress: required('X402_PAYOUT_ADDRESS'),
  x402Network: process.env.X402_NETWORK ?? 'xlayer-mainnet',
  x402Asset: process.env.X402_ASSET ?? 'USDT',
  x402AssetAddress: required('X402_ASSET_ADDRESS'),
  cupOracleAddress: required('CUP_ORACLE_ADDRESS'),
  cupOracleV2Address: required('CUP_ORACLE_V2_ADDRESS'),
  fanPassSbtAddress: required('FANPASS_SBT_ADDRESS'),
  cupWriteApiEnabled: process.env.CUP_WRITE_API_ENABLED
    ? process.env.CUP_WRITE_API_ENABLED === 'true'
    : (process.env.NODE_ENV ?? 'development') !== 'production',
  cupWriteApiKey: required('CUP_WRITE_API_KEY'),
  // Autonomous oracle resolver. OFF by default — when true the scheduler sends real
  // OKB-spending registerMatch/proposeResult/finalizeResult txs on CupOracleV2.
  cupResolverEnabled: process.env.CUP_RESOLVER_ENABLED === 'true',
  cupResolverIntervalMs: Number(process.env.CUP_RESOLVER_INTERVAL_MS ?? 300000),
  // ParimutuelMarket (Plan 3). Empty market address => contract not deployed yet:
  // the market service + indexer idle and the API returns honest not-deployed states.
  parimutuelMarketAddress: required('PARIMUTUEL_MARKET_ADDRESS'),
  parimutuelTokenAddress: required('PARIMUTUEL_TOKEN_ADDRESS'),
  parimutuelDeployBlock: Number(process.env.PARIMUTUEL_DEPLOY_BLOCK ?? 0),
  marketIndexerIntervalMs: Number(process.env.MARKET_INDEXER_INTERVAL_MS ?? 30000),
  marketIndexerRange: Number(process.env.MARKET_INDEXER_RANGE ?? 2000),
  databaseUrl: required('DATABASE_URL'),
  cupDemoMode: process.env.CUP_DEMO_MODE === 'true' && (process.env.NODE_ENV ?? 'development') !== 'production',
  footballDataApiKey: required('FOOTBALL_DATA_API_KEY'),
  theSportsDbApiKey: required('THESPORTSDB_API_KEY'),
  theSportsDbLeagueId: process.env.THESPORTSDB_LEAGUE_ID ?? '4429',
  espnScoreboardUrl: process.env.ESPN_SCOREBOARD_URL ?? 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
  espnSourceEnabled: process.env.ESPN_SOURCE_ENABLED !== 'false',
  corsOrigin: process.env.CORS_ORIGIN ?? 'https://x-sight.vercel.app,http://localhost:5173',
  allowDevBypass: process.env.ALLOW_DEV_BYPASS === 'true',
} as const;

export const isConfigured = {
  anthropic: () => env.anthropicApiKey.length > 0,
  okx: () =>
    env.okxApiKey.length > 0 &&
    env.okxSecretKey.length > 0 &&
    env.okxPassphrase.length > 0 &&
    env.okxProjectId.length > 0,
  x402: () => env.x402PayoutAddress.length > 0,
  signer: () => env.deployerPrivateKey.length > 0 && env.agenticWalletAddress.length > 0,
};
