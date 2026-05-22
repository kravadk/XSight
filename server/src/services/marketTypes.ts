/**
 * X Cup market-type registry (HARDENING-PLAN P0-2).
 *
 * A fixture is no longer just a 1X2 market — it can carry several pari-mutuel
 * markets (Match Result, Over/Under 2.5 goals, Both Teams To Score). Every type
 * is a small fixed set of outcomes derived purely from the final score, and each
 * uses outcome indices 1..3 — so the already-deployed 3-slot `ParimutuelMarket`
 * and `CupOracle` settle them with NO contract change. A 2-outcome type simply
 * never uses slot 3.
 *
 * Each (fixture × marketType) is a distinct on-chain market and a distinct oracle
 * record, keyed by `encodeMarketKey` (see utils/cupIds.ts).
 */

export type MarketTypeId = '1X2' | 'OU25' | 'BTTS';

export interface MarketTypeDef {
  id: MarketTypeId;
  /** Human label for the UI and the settlement rulebook. */
  label: string;
  /** Short tab/card label. */
  shortLabel: string;
  /** Number of outcomes — maps to contract slots 1..outcomeCount. */
  outcomeCount: 2 | 3;
  /** Outcome labels; index i is contract outcome i+1. */
  outcomes: readonly string[];
  /** Winning contract outcome (1-based) for a final score. */
  deriveOutcome: (score: { home: number; away: number }) => 1 | 2 | 3;
}

export const MARKET_TYPES: Record<MarketTypeId, MarketTypeDef> = {
  '1X2': {
    id: '1X2',
    label: 'Match Result (1X2)',
    shortLabel: 'Match Result',
    outcomeCount: 3,
    outcomes: ['Home', 'Draw', 'Away'],
    deriveOutcome: (s) => (s.home > s.away ? 1 : s.home < s.away ? 3 : 2),
  },
  OU25: {
    id: 'OU25',
    label: 'Total Goals — Over/Under 2.5',
    shortLabel: 'Over/Under 2.5',
    outcomeCount: 2,
    outcomes: ['Over 2.5', 'Under 2.5'],
    deriveOutcome: (s) => (s.home + s.away > 2.5 ? 1 : 2),
  },
  BTTS: {
    id: 'BTTS',
    label: 'Both Teams To Score',
    shortLabel: 'Both Score',
    outcomeCount: 2,
    outcomes: ['Yes', 'No'],
    deriveOutcome: (s) => (s.home > 0 && s.away > 0 ? 1 : 2),
  },
};

/** All market-type ids, '1X2' first (the legacy/default type). */
export const MARKET_TYPE_IDS: MarketTypeId[] = ['1X2', 'OU25', 'BTTS'];

export function isMarketTypeId(value: string): value is MarketTypeId {
  return value in MARKET_TYPES;
}

/** The default type — its key encoding is the bare match id, so legacy markets are unchanged. */
export const DEFAULT_MARKET_TYPE: MarketTypeId = '1X2';
