/**
 * Hermes — the autonomous AI pundit (DESIGN §2.1 Flow D).
 *
 * A Claude-backed agent: it reads a real fixture + the multi-source heuristic edge,
 * then issues a conviction-weighted verdict in a pundit voice.
 *
 * NO MOCKS: with ANTHROPIC_API_KEY it calls the real Claude API; without a key it
 * derives the pick from the real heuristic edge and labels the source `heuristic` —
 * it never fabricates a verdict.
 */
import Anthropic from '@anthropic-ai/sdk';
import { env, isConfigured } from '../config/env.js';
import { getCupAiEdge, getCupFeed, getCupMatch } from './cupData.js';
import { recordActivity } from './activityTracker.js';

export type PunditOutcome = 'HOME' | 'DRAW' | 'AWAY' | 'PASS';

export interface PunditPick {
  matchId: string;
  label: string;
  home: { code: string; name: string };
  away: { code: string; name: string };
  kickoffUtc: string;
  pick: PunditOutcome;
  conviction: number; // 0..1
  take: string;
  keyFactors: string[];
  source: 'hermes-claude' | 'heuristic';
  generatedAt: string;
}

const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, { pick: PunditPick; expires: number }>();
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

export function getPunditProfile() {
  return {
    name: 'Hermes',
    role: 'Autonomous football pundit',
    mode: isConfigured.anthropic() ? 'hermes-claude' : 'heuristic',
    model: isConfigured.anthropic() ? env.anthropicModel : null,
    bio: 'Reads every fixture against a multi-source quorum, issues a conviction-weighted pick, and is meant to be beaten.',
  };
}

const SYSTEM_PROMPT =
  'You are Hermes, an autonomous football (soccer) pundit for a World Cup prediction market. ' +
  'Given one fixture and a quantitative edge signal, return a sharp verdict. ' +
  'Respond with ONLY a JSON object, no prose, no markdown fences:\n' +
  '{"pick":"HOME|DRAW|AWAY|PASS","conviction":0.0-1.0,"take":"one or two punchy sentences in a confident pundit voice","keyFactors":["factor","factor","factor"]}\n' +
  'Use PASS when the edge is genuinely unclear. conviction is your confidence in the pick.';

function heuristicPick(
  match: NonNullable<Awaited<ReturnType<typeof getCupMatch>>>,
  edge: Awaited<ReturnType<typeof getCupAiEdge>>,
): PunditPick {
  const pick: PunditOutcome = !edge || edge.edge === 'NO_TRADE' ? 'PASS' : edge.edge;
  return {
    matchId: match.id,
    label: `${match.home.code} v ${match.away.code}`,
    home: { code: match.home.code, name: match.home.name },
    away: { code: match.away.code, name: match.away.name },
    kickoffUtc: match.kickoffUtc,
    pick,
    conviction: edge ? edge.confidence : 0.4,
    take:
      pick === 'PASS'
        ? `No clear edge in ${match.home.name} v ${match.away.name} — Hermes sits this one out.`
        : `Hermes leans ${pick} in ${match.home.name} v ${match.away.name} on the rating-and-form model.`,
    keyFactors: edge ? edge.rationale.slice(0, 3) : ['Heuristic rating model — no Claude key configured'],
    source: 'heuristic',
    generatedAt: new Date().toISOString(),
  };
}

function parseVerdict(
  text: string,
): { pick: PunditOutcome; conviction: number; take: string; keyFactors: string[] } | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const pick = String(v.pick ?? '').toUpperCase();
    if (!['HOME', 'DRAW', 'AWAY', 'PASS'].includes(pick)) return null;
    return {
      pick: pick as PunditOutcome,
      conviction: Math.max(0, Math.min(1, Number(v.conviction) || 0.5)),
      take: String(v.take ?? '').slice(0, 400) || 'Verdict issued.',
      keyFactors: Array.isArray(v.keyFactors) ? v.keyFactors.map(String).slice(0, 4) : [],
    };
  } catch {
    return null;
  }
}

export async function getPunditPick(matchId: string): Promise<PunditPick | null> {
  const cached = cache.get(matchId);
  if (cached && cached.expires > Date.now()) return cached.pick;

  const match = await getCupMatch(matchId);
  if (!match) return null;
  const edge = await getCupAiEdge(matchId);
  recordActivity('cup.edge', matchId);

  let pick: PunditPick;
  if (isConfigured.anthropic()) {
    try {
      const prompt =
        `Fixture: ${match.home.name} (${match.home.code}, rating ${match.home.rating}, form ${match.home.form || 'n/a'}) ` +
        `vs ${match.away.name} (${match.away.code}, rating ${match.away.rating}, form ${match.away.form || 'n/a'}). ` +
        `Stage: ${match.stage}. Kickoff: ${match.kickoffUtc}.\n` +
        `Quantitative edge signal: model favours ${edge?.edge ?? 'unclear'} ` +
        `(fair probabilities home ${edge?.fairProbability.home ?? '?'}, draw ${edge?.fairProbability.draw ?? '?'}, ` +
        `away ${edge?.fairProbability.away ?? '?'}; confidence ${edge?.confidence ?? '?'}).`;
      const res = await getClient().messages.create({
        model: env.anthropicModel,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      const verdict = parseVerdict(text);
      pick = verdict
        ? {
            matchId: match.id,
            label: `${match.home.code} v ${match.away.code}`,
            home: { code: match.home.code, name: match.home.name },
            away: { code: match.away.code, name: match.away.name },
            kickoffUtc: match.kickoffUtc,
            ...verdict,
            source: 'hermes-claude',
            generatedAt: new Date().toISOString(),
          }
        : heuristicPick(match, edge);
    } catch (err) {
      console.warn('[pundit] Claude call failed, using heuristic:', err instanceof Error ? err.message : err);
      pick = heuristicPick(match, edge);
    }
  } else {
    pick = heuristicPick(match, edge);
  }

  cache.set(matchId, { pick, expires: Date.now() + CACHE_TTL_MS });
  return pick;
}

/** Picks for the next upcoming fixtures — Hermes' open board. */
export async function listPunditPicks(limit = 9): Promise<PunditPick[]> {
  const feed = await getCupFeed();
  const upcoming = feed.fixtures.filter((m) => m.status === 'scheduled').slice(0, limit);
  const picks = await Promise.all(upcoming.map((m) => getPunditPick(m.id).catch(() => null)));
  return picks.filter((p): p is PunditPick => p !== null);
}
