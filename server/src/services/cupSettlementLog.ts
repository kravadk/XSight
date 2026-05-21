import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CupOracleOutcome } from './cupOracleContract.js';
import { recordCupSettlementEvent } from './cupPersistence.js';

export interface CupSettlementTx {
  timestamp: number;
  matchId: string;
  action: 'registerMatch' | 'proposeResult' | 'challengeResult' | 'finalizeResult' | 'emergencyFinalize';
  outcome: CupOracleOutcome | null;
  txHash: string;
  explorerUrl: string;
  signer: string;
}

const MAX_LOG_ENTRIES = 50;
const LOG_PATH = resolve(process.cwd(), process.env.CUP_SETTLEMENT_LOG_PATH ?? '../data/cup-settlement-log.json');

let loaded = false;
let log: CupSettlementTx[] = [];

export function recordCupSettlementTx(entry: Omit<CupSettlementTx, 'timestamp'>): CupSettlementTx {
  loadLog();
  const next = { ...entry, timestamp: Date.now() };
  if (process.env.NODE_ENV !== 'production') {
    log.unshift(next);
    if (log.length > MAX_LOG_ENTRIES) log.length = MAX_LOG_ENTRIES;
    saveLog();
  }
  recordCupSettlementEvent({
    txHash: entry.txHash,
    matchId: entry.matchId,
    action: entry.action,
    outcome: entry.outcome,
    signer: entry.signer,
    explorerUrl: entry.explorerUrl,
  }).catch((err) => {
    console.warn('[cup] settlement persistence skipped:', err instanceof Error ? err.message : err);
  });
  return next;
}

export function listCupSettlementLog(matchId?: string): CupSettlementTx[] {
  loadLog();
  const entries = matchId ? log.filter((entry) => entry.matchId === matchId) : log;
  return entries.map((entry) => ({ ...entry }));
}

export function clearCupSettlementLog() {
  loadLog();
  log.length = 0;
  saveLog();
}

function loadLog() {
  if (loaded) return;
  loaded = true;
  if (!existsSync(LOG_PATH)) {
    log = [];
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(LOG_PATH, 'utf8')) as { events?: CupSettlementTx[] };
    log = Array.isArray(parsed.events) ? parsed.events.slice(0, MAX_LOG_ENTRIES) : [];
  } catch {
    log = [];
  }
}

function saveLog() {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  const tmpPath = `${LOG_PATH}.tmp`;
  writeFileSync(tmpPath, JSON.stringify({ events: log }, null, 2));
  renameSync(tmpPath, LOG_PATH);
}
