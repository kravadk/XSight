/**
 * Append-only, capped JSON log of pundit X (Twitter) post attempts. Mirrors
 * `punditExecutionLog.ts`. This is the feed the AI Pundit screen renders.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface XPost {
  matchId: string;
  text: string;
  status: 'posted' | 'skipped' | 'failed';
  tweetId: string | null;
  reason: string;
  createdAt: string; // ISO timestamp
}

const MAX_LOG_ENTRIES = 50;
const LOG_PATH = resolve(process.cwd(), process.env.X_POSTS_PATH ?? '../data/x-posts.json');

let loaded = false;
let posts: XPost[] = [];

export function recordXPost(entry: XPost): XPost {
  load();
  posts.unshift(entry);
  if (posts.length > MAX_LOG_ENTRIES) posts.length = MAX_LOG_ENTRIES;
  save();
  return entry;
}

export function listXPosts(): XPost[] {
  load();
  return posts.map((p) => ({ ...p }));
}

export function clearXPosts(): void {
  load();
  posts = [];
  save();
}

function load(): void {
  if (loaded) return;
  loaded = true;
  if (!existsSync(LOG_PATH)) {
    posts = [];
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(LOG_PATH, 'utf8')) as { posts?: XPost[] };
    posts = Array.isArray(parsed.posts) ? parsed.posts : [];
  } catch {
    posts = [];
  }
}

function save(): void {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  const tmp = `${LOG_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify({ posts }, null, 2));
  renameSync(tmp, LOG_PATH);
}
