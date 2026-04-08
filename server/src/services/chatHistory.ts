/**
 * Multi-session chat history — persisted to data/sessions.json.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dir  = dirname(fileURLToPath(import.meta.url));
const DATA   = join(__dir, '../../../data');
const FILE   = join(DATA, 'sessions.json');
const MAX_PER_SESSION = 200;

export interface StoredMessage {
  id: string;
  role: 'user' | 'ai';
  cards: unknown[];
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  messages: StoredMessage[];
}

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  messageCount: number;
}

// ── in-memory cache ──────────────────────────────────────────────────────────

let sessions: Session[] = [];
let ready = false;

async function ensureDir() { await mkdir(DATA, { recursive: true }); }

async function load() {
  try {
    await ensureDir();
    sessions = JSON.parse(await readFile(FILE, 'utf-8')) as Session[];
  } catch { sessions = []; }
  ready = true;
}

async function flush() {
  await ensureDir();
  await writeFile(FILE, JSON.stringify(sessions), 'utf-8');
}

async function init() { if (!ready) await load(); }

// ── public API ────────────────────────────────────────────────────────────────

export async function listSessions(): Promise<SessionMeta[]> {
  await init();
  return sessions
    .map(s => ({ id: s.id, title: s.title, createdAt: s.createdAt, messageCount: s.messages.length }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSession(id: string): Promise<Session | null> {
  await init();
  return sessions.find(s => s.id === id) ?? null;
}

export async function createSession(firstMessage?: string): Promise<Session> {
  await init();
  const title = firstMessage
    ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '…' : '')
    : 'New chat';
  const s: Session = { id: randomUUID(), title, createdAt: Date.now(), messages: [] };
  sessions.unshift(s);
  await flush();
  return s;
}

export async function appendToSession(id: string, messages: StoredMessage[]): Promise<void> {
  await init();
  const s = sessions.find(s => s.id === id);
  if (!s) return;
  s.messages = [...s.messages, ...messages].slice(-MAX_PER_SESSION);
  await flush();
}

export async function deleteSession(id: string): Promise<void> {
  await init();
  sessions = sessions.filter(s => s.id !== id);
  await flush();
}

export async function clearSession(id: string): Promise<void> {
  await init();
  const s = sessions.find(s => s.id === id);
  if (s) { s.messages = []; await flush(); }
}

// legacy compat — used by /api/chat/history routes (single-session)
export async function getHistory(): Promise<StoredMessage[]> {
  const list = await listSessions();
  if (!list.length) return [];
  const s = await getSession(list[0].id);
  return s?.messages ?? [];
}
export async function appendMessages(msgs: StoredMessage[]): Promise<void> {
  const list = await listSessions();
  if (list.length) await appendToSession(list[0].id, msgs);
}
export async function clearHistory(): Promise<void> {
  await init(); sessions = []; await flush();
}
