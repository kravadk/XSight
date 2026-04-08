/**
 * Server-side chat history — persisted to data/chat-history.json.
 * All card payloads are stored as-is (opaque JSON) so the frontend
 * can render them exactly as it did originally.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, '../../../data');
const FILE = join(DATA_DIR, 'chat-history.json');

const MAX_MESSAGES = 300;

export interface StoredMessage {
  id: string;
  role: 'user' | 'ai';
  cards: unknown[];
  createdAt: number;
}

let cache: StoredMessage[] = [];
let ready = false;

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function load(): Promise<void> {
  try {
    await ensureDir();
    const raw = await readFile(FILE, 'utf-8');
    cache = JSON.parse(raw) as StoredMessage[];
  } catch {
    cache = [];
  }
  ready = true;
}

async function flush(): Promise<void> {
  await ensureDir();
  await writeFile(FILE, JSON.stringify(cache), 'utf-8');
}

export async function getHistory(): Promise<StoredMessage[]> {
  if (!ready) await load();
  return cache;
}

export async function appendMessages(messages: StoredMessage[]): Promise<void> {
  if (!ready) await load();
  cache = [...cache, ...messages].slice(-MAX_MESSAGES);
  await flush();
}

export async function clearHistory(): Promise<void> {
  cache = [];
  ready = true;
  await flush();
}
