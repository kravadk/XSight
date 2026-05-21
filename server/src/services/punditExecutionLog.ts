/**
 * Append-only, capped JSON log of pundit on-chain stake executions. Mirrors
 * `cupSettlementLog.ts`. This is the record the AI Pundit tab renders and a future
 * X-poster reads — every entry carries the completion-guard verdict (`verified`).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { PunditExecution } from './punditExecutor.js';

const MAX_LOG_ENTRIES = 50;
const LOG_PATH = resolve(
  process.cwd(),
  process.env.PUNDIT_EXECUTION_LOG_PATH ?? '../data/pundit-execution-log.json',
);

let loaded = false;
let log: PunditExecution[] = [];

export function recordPunditExecution(entry: PunditExecution): PunditExecution {
  loadLog();
  log.unshift(entry);
  if (log.length > MAX_LOG_ENTRIES) log.length = MAX_LOG_ENTRIES;
  saveLog();
  return entry;
}

export function listPunditExecutions(matchId?: string): PunditExecution[] {
  loadLog();
  const entries = matchId ? log.filter((e) => e.matchId === matchId) : log;
  return entries.map((e) => ({ ...e }));
}

export function clearPunditExecutionLog() {
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
    const parsed = JSON.parse(readFileSync(LOG_PATH, 'utf8')) as { executions?: PunditExecution[] };
    log = Array.isArray(parsed.executions) ? parsed.executions.slice(0, MAX_LOG_ENTRIES) : [];
  } catch {
    log = [];
  }
}

function saveLog() {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  const tmpPath = `${LOG_PATH}.tmp`;
  writeFileSync(tmpPath, JSON.stringify({ executions: log }, null, 2));
  renameSync(tmpPath, LOG_PATH);
}
