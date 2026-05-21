import { env } from '../config/env.js';

export interface CupAdapterConfig {
  footballDataApiKey: string;
  theSportsDbApiKey: string;
  espnEnabled: boolean;
  demoMode: boolean;
}

export interface CupAdapterStatus {
  id: 'xsight-seed' | 'football-data' | 'thesportsdb' | 'espn';
  name: string;
  role: 'seed' | 'fixtures' | 'scores' | 'stats';
  configured: boolean;
  confidenceWeight: number;
  docsUrl: string;
  status: 'live' | 'needs_key' | 'disabled' | 'dev_only';
  note: string;
}

export interface CupAdapterOverview {
  mode: 'live-source-quorum-ready' | 'live-source-quorum-missing' | 'demo-dev-only';
  liveSources: number;
  requiredLiveSources: number;
  readyForProductionSettlement: boolean;
  adapters: CupAdapterStatus[];
}

export function listCupAdapters(): CupAdapterOverview {
  return buildCupAdapterStatus({
    footballDataApiKey: env.footballDataApiKey,
    theSportsDbApiKey: env.theSportsDbApiKey,
    espnEnabled: env.espnSourceEnabled,
    demoMode: env.cupDemoMode,
  });
}

export function buildCupAdapterStatus(config: CupAdapterConfig): CupAdapterOverview {
  const adapters: CupAdapterStatus[] = [
    {
      id: 'football-data',
      name: 'football-data.org',
      role: 'fixtures',
      configured: config.footballDataApiKey.trim().length > 0,
      confidenceWeight: 0.64,
      docsUrl: 'https://docs.football-data.org/general/v4/match.html',
      status: config.footballDataApiKey.trim().length > 0 ? 'live' : 'needs_key',
      note: 'Free-tier keyed fixture and result source. Missing key means no fabricated replacement.',
    },
    {
      id: 'thesportsdb',
      name: 'TheSportsDB',
      role: 'stats',
      configured: config.theSportsDbApiKey.trim().length > 0,
      confidenceWeight: 0.61,
      docsUrl: 'https://www.thesportsdb.com/documentation',
      status: config.theSportsDbApiKey.trim().length > 0 ? 'live' : 'needs_key',
      note: 'Free API event/team/player metadata source. Used only when a key is configured.',
    },
    {
      id: 'espn',
      name: 'ESPN scoreboard',
      role: 'scores',
      configured: config.espnEnabled,
      confidenceWeight: 0.55,
      docsUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/scoreboard',
      status: config.espnEnabled ? 'live' : 'disabled',
      note: 'Public scoreboard source used as a real fixture/result source when the endpoint returns events.',
    },
  ];

  if (config.demoMode) {
    adapters.unshift({
      id: 'xsight-seed',
      name: 'XSight seed',
      role: 'seed',
      configured: true,
      confidenceWeight: 0,
      docsUrl: 'docs/xcup-cupos-strategy.md',
      status: 'dev_only',
      note: 'Development-only seed. Hidden and disabled in production.',
    });
  }

  const liveSources = adapters.filter((adapter) => adapter.id !== 'xsight-seed' && adapter.configured).length;
  const requiredLiveSources = 2;
  const readyForProductionSettlement = liveSources >= requiredLiveSources;
  return {
    mode: config.demoMode ? 'demo-dev-only' : readyForProductionSettlement ? 'live-source-quorum-ready' : 'live-source-quorum-missing',
    liveSources,
    requiredLiveSources,
    readyForProductionSettlement,
    adapters,
  };
}
