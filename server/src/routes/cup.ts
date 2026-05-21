import { Router, type Request, type Response } from 'express';
import { listCupAdapters } from '../services/cupAdapters.js';
import { cupOverview, getCupAiEdge, getCupFairOdds, getCupFantasyQuest, getCupMatch, getCupPlayerStats, getCupResult, getCupSentiment, getCupSettlementCheck, getCupTrackProof, listCupMatches, buildCupActionPlan, scoreCupTeamStrength } from '../services/cupData.js';
import { getFanScore } from '../services/cupReputation.js';
import { getFanPassSbtEligibility, mintFanPassSbt } from '../services/fanPassSbt.js';
import { listCupSettlementLog } from '../services/cupSettlementLog.js';
import { getCupPersistenceHealth } from '../services/cupPersistence.js';
import { getResolverStatus, resolveCupMatches } from '../services/quorumResolver.js';
import { getPunditPick, getPunditProfile, listPunditPicks } from '../services/punditService.js';
import { executePunditPick } from '../services/punditExecutor.js';
import { listPunditExecutions } from '../services/punditExecutionLog.js';
import { listXPosts } from '../services/xPostLog.js';
import { recordFreePick, getFreePicks } from '../services/freePoolService.js';
import { globalLeaderboard } from '../services/leaderboardService.js';
import { createLeague, joinLeague, leaguesForWallet, leagueLeaderboard } from '../services/leagueService.js';
import { bracketScoreboard, saveBracket } from '../services/bracketService.js';
import { bracketNftMetadata, readMintedBy, buildBracketMintTx } from '../services/bracketNftContract.js';
import { env } from '../config/env.js';
import {
  challengeCupOracleResult,
  cupOracleMetadata,
  cupOracleReadiness,
  finalizeCupOracleResult,
  proposeCupOracleResult,
  readCupOracleMatch,
  type CupOracleOutcome,
} from '../services/cupOracleContract.js';
import { isCupWriteAuthorized } from './cupWriteAuth.js';

export const cupRouter = Router();

function notFound(res: Response, label = 'match not found') {
  res.status(404).json({ error: label });
}

function parseOutcome(value: unknown): CupOracleOutcome | null {
  return value === 'HOME' || value === 'DRAW' || value === 'AWAY' ? value : null;
}

function txError(res: Response, err: unknown) {
  const message = err instanceof Error ? err.message : 'CupOracle transaction failed';
  res.status(400).json({ error: 'CupOracle transaction failed', detail: message });
}

function requireCupWrite(req: Request, res: Response): boolean {
  const auth = isCupWriteAuthorized({
    nodeEnv: env.nodeEnv,
    writeApiEnabled: env.cupWriteApiEnabled,
    configuredKey: env.cupWriteApiKey,
    providedKey: String(req.header('X-CUP-ADMIN-KEY') ?? ''),
  });
  if (auth.ok) return true;
  res.status(auth.reason?.includes('disabled') ? 403 : 401).json({
    error: 'Cup write API unauthorized',
    detail: auth.reason,
  });
  return false;
}

cupRouter.post('/free-picks', async (req: Request, res: Response) => {
  const body = req.body as { fixtureId?: string; wallet?: string; outcome?: string };
  if (!body.fixtureId || !body.wallet || !body.outcome) {
    return res.status(400).json({ error: 'fixtureId, wallet and outcome are required' });
  }
  const result = await recordFreePick(body.fixtureId, body.wallet, body.outcome);
  if (!result.ok) {
    return res.status(result.reason === 'fixture_not_found' ? 404 : 400).json({ error: result.reason });
  }
  res.json({ pick: result.pick });
});

cupRouter.get('/free-picks', async (req: Request, res: Response) => {
  const wallet = typeof req.query.wallet === 'string' ? req.query.wallet : undefined;
  const fixtureId = typeof req.query.matchId === 'string' ? req.query.matchId : undefined;
  res.json({ picks: await getFreePicks({ wallet, fixtureId }) });
});

cupRouter.get('/leaderboard', async (_req: Request, res: Response) => {
  res.json(await globalLeaderboard());
});

cupRouter.post('/leagues', (req: Request, res: Response) => {
  const body = req.body as { name?: string; wallet?: string };
  if (!body.name || !body.wallet) {
    return res.status(400).json({ error: 'name and wallet are required' });
  }
  const result = createLeague(body.name, body.wallet);
  if (!result.ok) return res.status(400).json({ error: result.reason });
  res.json({ league: result.value });
});

cupRouter.post('/leagues/join', (req: Request, res: Response) => {
  const body = req.body as { inviteCode?: string; wallet?: string };
  if (!body.inviteCode || !body.wallet) {
    return res.status(400).json({ error: 'inviteCode and wallet are required' });
  }
  const result = joinLeague(body.inviteCode, body.wallet);
  if (!result.ok) {
    return res.status(result.reason === 'league_not_found' ? 404 : 400).json({ error: result.reason });
  }
  res.json({ league: result.value });
});

cupRouter.get('/leagues', (req: Request, res: Response) => {
  const wallet = typeof req.query.wallet === 'string' ? req.query.wallet : '';
  if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
  res.json({ leagues: leaguesForWallet(wallet) });
});

cupRouter.get('/leagues/:id/leaderboard', async (req: Request, res: Response) => {
  const result = await leagueLeaderboard(req.params.id);
  if (!result) return notFound(res, 'league not found');
  res.json(result);
});

cupRouter.get('/bracket', async (req: Request, res: Response) => {
  const wallet = typeof req.query.wallet === 'string' ? req.query.wallet : '';
  if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
  res.json(await bracketScoreboard(wallet));
});

cupRouter.post('/bracket', (req: Request, res: Response) => {
  const body = req.body as { wallet?: string; picks?: Record<string, string> };
  if (!body.wallet || !body.picks || typeof body.picks !== 'object') {
    return res.status(400).json({ error: 'wallet and picks are required' });
  }
  const result = saveBracket(body.wallet, body.picks);
  if (!result.ok) return res.status(400).json({ error: result.reason });
  res.json({ bracket: result.value });
});

cupRouter.get('/bracket-nft', async (req: Request, res: Response) => {
  const wallet = typeof req.query.wallet === 'string' ? req.query.wallet : '';
  const metadata = bracketNftMetadata();
  const mintedTokenId = wallet ? await readMintedBy(wallet) : 0;
  let mintTx = null;
  try {
    mintTx = metadata.address ? buildBracketMintTx() : null;
  } catch {
    mintTx = null;
  }
  res.json({ metadata, mintedTokenId, mintTx });
});

cupRouter.get('/overview', async (_req: Request, res: Response) => {
  res.json({ ...(await cupOverview()), contract: cupOracleMetadata() });
});

cupRouter.get('/contract', (_req: Request, res: Response) => {
  res.json(cupOracleMetadata());
});

cupRouter.get('/readiness', async (_req: Request, res: Response) => {
  res.json(await cupOracleReadiness());
});

cupRouter.get('/adapters', (_req: Request, res: Response) => {
  res.json(listCupAdapters());
});

cupRouter.get('/persistence', async (_req: Request, res: Response) => {
  res.json(await getCupPersistenceHealth());
});

cupRouter.get('/track-proof', async (_req: Request, res: Response) => {
  res.json(await getCupTrackProof());
});

cupRouter.get('/fixtures', async (_req: Request, res: Response) => {
  res.json({ fixtures: await listCupMatches() });
});

cupRouter.get('/matches/:matchId', async (req: Request, res: Response) => {
  const match = await getCupMatch(req.params.matchId);
  if (!match) return notFound(res);
  res.json(match);
});

cupRouter.get('/onchain/:matchId', async (req: Request, res: Response) => {
  const match = await getCupMatch(req.params.matchId);
  if (!match) return notFound(res);
  res.json(await readCupOracleMatch(req.params.matchId));
});

cupRouter.get('/settlement-log', (req: Request, res: Response) => {
  const matchId = typeof req.query.matchId === 'string' ? req.query.matchId : undefined;
  res.json({ events: listCupSettlementLog(matchId) });
});

cupRouter.get('/resolver', (_req: Request, res: Response) => {
  res.json(getResolverStatus());
});

cupRouter.post('/resolver/run', async (req: Request, res: Response) => {
  if (!requireCupWrite(req, res)) return;
  const body = req.body as { dryRun?: boolean };
  // Dry-run by default unless the resolver is explicitly enabled; an explicit body wins.
  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : !env.cupResolverEnabled;
  try {
    res.json(await resolveCupMatches({ dryRun }));
  } catch (err) {
    txError(res, err);
  }
});

cupRouter.get('/result/:matchId', async (req: Request, res: Response) => {
  const result = await getCupResult(req.params.matchId);
  if (!result) return notFound(res);
  res.json(result);
});

cupRouter.get('/player-stats', async (req: Request, res: Response) => {
  const matchId = String(req.query.matchId ?? '');
  if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
  const stats = await getCupPlayerStats(matchId);
  if (!stats) return notFound(res);
  res.json(stats);
});

cupRouter.get('/ai-edge', async (req: Request, res: Response) => {
  const matchId = String(req.query.matchId ?? '');
  if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
  const edge = await getCupAiEdge(matchId);
  if (!edge) return notFound(res);
  res.json(edge);
});

cupRouter.get('/pundit', async (_req: Request, res: Response) => {
  res.json({ profile: getPunditProfile(), picks: await listPunditPicks() });
});

cupRouter.get('/pundit/x-posts', (_req: Request, res: Response) => {
  res.json({ posts: listXPosts() });
});

cupRouter.get('/pundit/executions', (req: Request, res: Response) => {
  const matchId = typeof req.query.matchId === 'string' ? req.query.matchId : undefined;
  res.json({ executions: listPunditExecutions(matchId) });
});

cupRouter.post('/pundit/execute', async (req: Request, res: Response) => {
  if (!requireCupWrite(req, res)) return;
  const body = req.body as { matchId?: string };
  if (!body.matchId) return res.status(400).json({ error: 'matchId required' });
  try {
    res.json(await executePunditPick(body.matchId));
  } catch (err) {
    // executePunditPick is documented to never throw (it catches on-chain failures
    // internally); this catch is defensive insurance and 500s a genuine server fault.
    res.status(500).json({
      error: 'pundit execution failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

cupRouter.get('/pundit/:matchId', async (req: Request, res: Response) => {
  const pick = await getPunditPick(req.params.matchId);
  if (!pick) return notFound(res);
  res.json(pick);
});

cupRouter.get('/fair-odds', async (req: Request, res: Response) => {
  const matchId = String(req.query.matchId ?? '');
  if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
  const odds = await getCupFairOdds(matchId);
  if (!odds) return notFound(res);
  res.json(odds);
});

cupRouter.get('/settlement-check', async (req: Request, res: Response) => {
  const matchId = String(req.query.matchId ?? '');
  if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
  const check = await getCupSettlementCheck(matchId);
  if (!check) return notFound(res);
  res.json(check);
});

cupRouter.get('/sentiment', async (req: Request, res: Response) => {
  const matchId = String(req.query.matchId ?? '');
  if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
  const sentiment = await getCupSentiment(matchId);
  if (!sentiment) return notFound(res);
  res.json(sentiment);
});

cupRouter.get('/team-strength', async (req: Request, res: Response) => {
  const matchId = String(req.query.matchId ?? '');
  if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
  const strength = await scoreCupTeamStrength(matchId);
  if (!strength) return notFound(res);
  res.json(strength);
});

cupRouter.get('/fan-score', async (req: Request, res: Response) => {
  const wallet = String(req.query.wallet ?? '');
  if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
  const score = await getFanScore(wallet);
  if (!score) return res.status(400).json({ error: 'invalid wallet' });
  res.json(score);
});

cupRouter.get('/fanpass/sbt-eligibility', async (req: Request, res: Response) => {
  const wallet = String(req.query.wallet ?? '');
  if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
  const eligibility = await getFanPassSbtEligibility(wallet);
  if (!eligibility) return res.status(400).json({ error: 'invalid wallet' });
  res.json(eligibility);
});

cupRouter.get('/fantasy-quest', async (req: Request, res: Response) => {
  const matchId = String(req.query.matchId ?? '');
  const wallet = String(req.query.wallet ?? '');
  if (!matchId) return res.status(400).json({ error: 'matchId query param required' });
  if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
  const quest = await getCupFantasyQuest(matchId, wallet);
  if (!quest) return res.status(400).json({ error: 'fantasy quest unavailable', detail: 'match or wallet is invalid' });
  res.json(quest);
});

cupRouter.post('/action-plan', async (req: Request, res: Response) => {
  const body = req.body as { matchId?: string; mode?: 'builder' | 'agent' | 'fan' };
  if (!body.matchId) return res.status(400).json({ error: 'matchId required' });
  const plan = await buildCupActionPlan(body.matchId, body.mode ?? 'builder');
  if (!plan) return notFound(res);
  res.json(plan);
});

cupRouter.post('/fanpass/sbt-mint', async (req: Request, res: Response) => {
  if (!requireCupWrite(req, res)) return;
  const body = req.body as { wallet?: string };
  if (!body.wallet) return res.status(400).json({ error: 'wallet required' });
  try {
    res.json(await mintFanPassSbt(body.wallet));
  } catch (err) {
    txError(res, err);
  }
});

cupRouter.post('/propose-result', async (req: Request, res: Response) => {
  if (!requireCupWrite(req, res)) return;
  const body = req.body as { matchId?: string; outcome?: unknown };
  if (!body.matchId) return res.status(400).json({ error: 'matchId required' });
  const match = await getCupMatch(body.matchId);
  if (!match) return notFound(res);
  const outcome = parseOutcome(body.outcome);
  if (!outcome) return res.status(400).json({ error: 'outcome must be HOME, DRAW, or AWAY' });
  try {
    res.json(await proposeCupOracleResult(body.matchId, outcome));
  } catch (err) {
    txError(res, err);
  }
});

cupRouter.post('/challenge-result', async (req: Request, res: Response) => {
  if (!requireCupWrite(req, res)) return;
  const body = req.body as { matchId?: string };
  if (!body.matchId) return res.status(400).json({ error: 'matchId required' });
  const match = await getCupMatch(body.matchId);
  if (!match) return notFound(res);
  try {
    res.json(await challengeCupOracleResult(body.matchId));
  } catch (err) {
    txError(res, err);
  }
});

cupRouter.post('/finalize-result', async (req: Request, res: Response) => {
  if (!requireCupWrite(req, res)) return;
  const body = req.body as { matchId?: string };
  if (!body.matchId) return res.status(400).json({ error: 'matchId required' });
  const match = await getCupMatch(body.matchId);
  if (!match) return notFound(res);
  try {
    res.json(await finalizeCupOracleResult(body.matchId));
  } catch (err) {
    txError(res, err);
  }
});
