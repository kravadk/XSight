# Plan 10: Pundit X-Posting + Autonomous Cron — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Complete the autonomous AI pundit loop (DESIGN §2.1 Flow D): a cron picks an upcoming fixture, runs the existing `executePunditPick` (research → on-chain stake → completion guard), and on a *verified* stake posts an announcement to X. Both the cron and X-posting are **off by default** and degrade honestly without config.

**Architecture:** `xPoster.ts` composes a tweet from a verified `PunditExecution` (pure `composeTweet`) and posts it via OAuth-1.0a-signed `POST /2/tweets` (no-op without X keys). `xPostLog.ts` is a JSON-file log of post attempts. `punditScheduler.ts` has a pure `pickNextFixture` core + an interval loop gated by `PUNDIT_AUTOSTAKE_ENABLED`. The `PunditPage` gains a "Hermes on X" feed.

**Tech Stack:** TypeScript (NodeNext ESM), Express, React 19 + Vite, `node:crypto` for OAuth 1.0a. Backend tests are `tsx` scripts. Frontend verification is `npm run build`.

**Depends on:** Plan(pundit-executor) — `punditExecutor.ts` exports `executePunditPick`, `PunditExecution`; `punditExecutionLog.ts` exports `listPunditExecutions`; `cupData.ts` exports `listCupMatches`.

**Safety:** Building this spends no money and posts nothing. The cron stakes real OKB only when the operator sets `PUNDIT_AUTOSTAKE_ENABLED=true` AND the pundit wallet is funded; X-posting happens only when the four `X_*` keys are set. Both are operator actions outside this plan.

---

## File Structure

**Create:**
- `server/src/services/xPostLog.ts` — JSON-file log of X post attempts.
- `server/src/services/xPoster.ts` — `composeTweet` (pure) + `postToX` (OAuth 1.0a) + `announceExecution`.
- `server/src/services/punditScheduler.ts` — pure `pickNextFixture` + the autonomous loop.
- `server/scripts/test-x-poster.ts` — TDD test for `composeTweet`.
- `server/scripts/test-pundit-scheduler.ts` — TDD test for `pickNextFixture`.

**Modify:**
- `server/src/config/env.ts` — add `X_*` keys, `PUNDIT_AUTOSTAKE_ENABLED`, `PUNDIT_AUTOSTAKE_INTERVAL_MS`; `isConfigured.x`.
- `server/src/index.ts` — start the scheduler; document the endpoint.
- `server/src/routes/cup.ts` — add `GET /pundit/x-posts`.
- `server/package.json` — add `test:x-poster` + `test:pundit-scheduler` scripts.
- `server/.env.example` — document the new env vars.
- `src/api/client.ts` — add `XPostDto` + `cupPunditXPosts` method.
- `src/pages/PunditPage.tsx` — add the "Hermes on X" feed.

---

## Task 1: X-poster

**Files:**
- Modify: `server/src/config/env.ts`
- Create: `server/src/services/xPostLog.ts`
- Create: `server/src/services/xPoster.ts`
- Create: `server/scripts/test-x-poster.ts`
- Modify: `server/package.json`
- Modify: `server/.env.example`

- [ ] **Step 1: Add env vars to `env.ts`**

In `server/src/config/env.ts`, insert immediately after the line `  punditStakeAmount: process.env.PUNDIT_STAKE_AMOUNT ?? '0.5',`:

```ts
  // X (Twitter) API — OAuth 1.0a user context, required to post pundit announcements.
  // Empty => the X-poster honestly no-ops; nothing is ever posted.
  xApiKey: required('X_API_KEY'),
  xApiSecret: required('X_API_SECRET'),
  xAccessToken: required('X_ACCESS_TOKEN'),
  xAccessTokenSecret: required('X_ACCESS_TOKEN_SECRET'),
  // Autonomous pundit cron (DESIGN Flow D). OFF by default — when true the scheduler
  // sends real OKB-spending stake txs from the pundit wallet on a timer.
  punditAutoStakeEnabled: process.env.PUNDIT_AUTOSTAKE_ENABLED === 'true',
  punditAutoStakeIntervalMs: Number(process.env.PUNDIT_AUTOSTAKE_INTERVAL_MS ?? 1_800_000),
```

Then, in the `isConfigured` object, insert after the `pundit:` line:

```ts
  x: () =>
    env.xApiKey.length > 0 &&
    env.xApiSecret.length > 0 &&
    env.xAccessToken.length > 0 &&
    env.xAccessTokenSecret.length > 0,
```

- [ ] **Step 2: Add the npm test scripts to `server/package.json`**

Replace the line `    "test:bracket": "tsx scripts/test-bracket.ts",` with:

```json
    "test:bracket": "tsx scripts/test-bracket.ts",
    "test:x-poster": "tsx scripts/test-x-poster.ts",
    "test:pundit-scheduler": "tsx scripts/test-pundit-scheduler.ts",
```

- [ ] **Step 3: Document the env vars in `server/.env.example`**

Append to the end of `server/.env.example`:

```
# --- AI pundit autonomous loop (Flow D) ---------------------------------------
# X (Twitter) API OAuth 1.0a user-context keys. Empty => the pundit never posts.
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
# Autonomous staking cron. 'true' makes the pundit stake real OKB on a timer.
PUNDIT_AUTOSTAKE_ENABLED=false
PUNDIT_AUTOSTAKE_INTERVAL_MS=1800000
```

- [ ] **Step 4: Write the failing test**

Create `server/scripts/test-x-poster.ts`:

```ts
/**
 * TDD test for the pure tweet composer — fully offline.
 *
 * Run: npm --prefix server run test:x-poster
 */
import assert from 'node:assert/strict';
import { composeTweet } from '../src/services/xPoster.js';
import type { PunditExecution } from '../src/services/punditExecutor.js';

const execution: PunditExecution = {
  matchId: 'cup-bra-cro',
  marketId: '0xmarket',
  label: 'BRA v CRO',
  status: 'staked',
  pick: 'HOME',
  conviction: 0.71,
  outcome: 1,
  amount: '500000',
  amountDisplay: '0.5 USDT',
  txHash: '0xabc',
  explorerUrl: 'https://www.okx.com/web3/explorer/xlayer/tx/0xabc',
  verified: true,
  reason: 'staked_event_confirmed',
  executedAt: '2026-05-21T00:00:00.000Z',
};

const tweet = composeTweet(execution);
assert.ok(tweet.includes('BRA v CRO'), 'tweet names the fixture');
assert.ok(tweet.includes('0.5 USDT'), 'tweet states the stake size');
assert.ok(tweet.includes('HOME'), 'tweet states the pick');
assert.ok(tweet.includes('71%'), 'tweet states the conviction percentage');
assert.ok(tweet.includes(execution.explorerUrl!), 'tweet links the on-chain proof');
assert.ok(tweet.length <= 280, `tweet is within the 280-char limit (was ${tweet.length})`);

console.log('x-poster checks passed');
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm --prefix server run test:x-poster`
Expected: FAIL — `Cannot find module '../src/services/xPoster.js'`.

- [ ] **Step 6: Write the X post log**

Create `server/src/services/xPostLog.ts`:

```ts
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
```

- [ ] **Step 7: Write the X poster**

Create `server/src/services/xPoster.ts`:

```ts
/**
 * Posts pundit announcements to X (Twitter). `composeTweet` is a pure text builder;
 * `postToX` performs an OAuth-1.0a-signed POST to the X API v2 and honestly no-ops
 * when the four X_* keys are not configured; `announceExecution` ties them together
 * and records every attempt to the X post log.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { env, isConfigured } from '../config/env.js';
import { recordXPost, type XPost } from './xPostLog.js';
import type { PunditExecution } from './punditExecutor.js';

const TWEETS_URL = 'https://api.twitter.com/2/tweets';

/** Pure: compose the announcement tweet for a verified pundit stake. */
export function composeTweet(execution: PunditExecution): string {
  const conviction = Math.round(execution.conviction * 100);
  const proof = execution.explorerUrl ?? '';
  return (
    `🤖 Hermes staked ${execution.amountDisplay} on ${execution.pick} — ${execution.label} ` +
    `(conviction ${conviction}%).\n\nVerified on X Layer ⬇️\n${proof}`
  );
}

/** RFC-3986 percent-encoding, as OAuth 1.0a requires. */
function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Build the OAuth 1.0a Authorization header for a JSON-body POST (body is not signed). */
function oauthHeader(method: string, url: string): string {
  const params: Record<string, string> = {
    oauth_consumer_key: env.xApiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.xAccessToken,
    oauth_version: '1.0',
  };
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k]!)}`)
    .join('&');
  const baseString = `${method.toUpperCase()}&${rfc3986(url)}&${rfc3986(paramString)}`;
  const signingKey = `${rfc3986(env.xApiSecret)}&${rfc3986(env.xAccessTokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');
  const headerParams = { ...params, oauth_signature: signature };
  return (
    'OAuth ' +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${rfc3986(k)}="${rfc3986(headerParams[k as keyof typeof headerParams])}"`)
      .join(', ')
  );
}

/** Post a tweet. No-ops honestly when X is not configured. */
export async function postToX(text: string): Promise<{ ok: boolean; tweetId: string | null; reason: string }> {
  if (!isConfigured.x()) return { ok: false, tweetId: null, reason: 'x_not_configured' };
  try {
    const res = await fetch(TWEETS_URL, {
      method: 'POST',
      headers: {
        Authorization: oauthHeader('POST', TWEETS_URL),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: { id?: string }; detail?: string; title?: string };
    if (!res.ok) {
      return { ok: false, tweetId: null, reason: body.detail ?? body.title ?? `x_api_${res.status}` };
    }
    return { ok: true, tweetId: body.data?.id ?? null, reason: 'posted' };
  } catch (err) {
    return { ok: false, tweetId: null, reason: err instanceof Error ? err.message : 'x_request_failed' };
  }
}

/**
 * Announce a pundit execution on X. Only verified `staked` executions are announced;
 * every attempt (including skips/failures) is recorded to the X post log.
 */
export async function announceExecution(execution: PunditExecution): Promise<XPost> {
  const now = new Date().toISOString();
  if (execution.status !== 'staked' || !execution.verified) {
    return recordXPost({
      matchId: execution.matchId,
      text: '',
      status: 'skipped',
      tweetId: null,
      reason: `not announced — execution status ${execution.status}`,
      createdAt: now,
    });
  }
  const text = composeTweet(execution);
  const result = await postToX(text);
  return recordXPost({
    matchId: execution.matchId,
    text,
    status: result.ok ? 'posted' : 'failed',
    tweetId: result.tweetId,
    reason: result.reason,
    createdAt: now,
  });
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm --prefix server run test:x-poster`
Expected: PASS — prints `x-poster checks passed`.

- [ ] **Step 9: Typecheck**

Run: `npm --prefix server run typecheck`
Expected: PASS — no errors.

- [ ] **Step 10: Commit**

```bash
git add server/src/config/env.ts server/src/services/xPostLog.ts server/src/services/xPoster.ts server/scripts/test-x-poster.ts server/package.json server/.env.example
git commit -m "feat(pundit): X-poster — OAuth 1.0a tweet posting with honest no-op"
```

---

## Task 2: Autonomous scheduler + route

**Files:**
- Create: `server/src/services/punditScheduler.ts`
- Create: `server/scripts/test-pundit-scheduler.ts`
- Modify: `server/src/routes/cup.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `server/scripts/test-pundit-scheduler.ts`:

```ts
/**
 * TDD test for the pure fixture-picker core — fully offline.
 *
 * Run: npm --prefix server run test:pundit-scheduler
 */
import assert from 'node:assert/strict';
import { pickNextFixture, type SchedulableFixture } from '../src/services/punditScheduler.js';

const fixtures: SchedulableFixture[] = [
  { id: 'm-late', status: 'scheduled', kickoffUtc: '2026-06-12T18:00:00.000Z' },
  { id: 'm-soon', status: 'scheduled', kickoffUtc: '2026-06-12T15:00:00.000Z' },
  { id: 'm-live', status: 'live', kickoffUtc: '2026-06-12T14:00:00.000Z' },
];

assert.equal(pickNextFixture(fixtures, new Set()), 'm-soon', 'picks the soonest scheduled fixture');
assert.equal(
  pickNextFixture(fixtures, new Set(['m-soon'])),
  'm-late',
  'skips an already-executed fixture',
);
assert.equal(
  pickNextFixture(fixtures, new Set(['m-soon', 'm-late'])),
  null,
  'returns null when every scheduled fixture is done',
);
assert.equal(pickNextFixture([], new Set()), null, 'returns null with no fixtures');
assert.equal(
  pickNextFixture([{ id: 'm-live', status: 'live', kickoffUtc: '2026-06-12T14:00:00.000Z' }], new Set()),
  null,
  'never picks a non-scheduled fixture',
);

console.log('pundit scheduler checks passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server run test:pundit-scheduler`
Expected: FAIL — `Cannot find module '../src/services/punditScheduler.js'`.

- [ ] **Step 3: Write the scheduler**

Create `server/src/services/punditScheduler.ts`:

```ts
/**
 * Autonomous AI pundit loop (DESIGN §2.1 Flow D). On a timer it picks the soonest
 * upcoming fixture the pundit has not acted on, runs `executePunditPick` (research →
 * on-chain stake → completion guard), and announces a verified stake on X.
 *
 * OFF by default — `startPunditAutoStake` returns immediately unless
 * PUNDIT_AUTOSTAKE_ENABLED=true. The pure `pickNextFixture` core is unit-tested.
 */
import { env } from '../config/env.js';
import { listCupMatches } from './cupData.js';
import { executePunditPick } from './punditExecutor.js';
import { listPunditExecutions } from './punditExecutionLog.js';
import { announceExecution } from './xPoster.js';

/** The subset of a fixture the scheduler needs. */
export interface SchedulableFixture {
  id: string;
  status: string;
  kickoffUtc: string;
}

/** Pure: the soonest scheduled fixture not in `done`, or null. */
export function pickNextFixture(fixtures: SchedulableFixture[], done: Set<string>): string | null {
  const candidates = fixtures
    .filter((f) => f.status === 'scheduled' && !done.has(f.id))
    .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));
  return candidates[0]?.id ?? null;
}

let timer: NodeJS.Timeout | null = null;

/** Run one autonomous tick: pick a fixture, stake, announce a verified stake. */
async function tick(): Promise<void> {
  try {
    const matches = await listCupMatches();
    const done = new Set(listPunditExecutions().map((e) => e.matchId));
    const matchId = pickNextFixture(matches, done);
    if (!matchId) return;
    const execution = await executePunditPick(matchId);
    if (execution.status === 'staked' && execution.verified) {
      await announceExecution(execution);
    }
  } catch (err) {
    console.warn('[pundit-cron] tick failed:', err instanceof Error ? err.message : err);
  }
}

/** Start the autonomous loop. No-op unless PUNDIT_AUTOSTAKE_ENABLED=true. */
export function startPunditAutoStake(): void {
  if (!env.punditAutoStakeEnabled) {
    console.log('[pundit-cron] disabled (set PUNDIT_AUTOSTAKE_ENABLED=true to enable)');
    return;
  }
  if (timer) return;
  console.log(`[pundit-cron] enabled — every ${Math.round(env.punditAutoStakeIntervalMs / 1000)}s`);
  timer = setInterval(() => void tick(), env.punditAutoStakeIntervalMs);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix server run test:pundit-scheduler`
Expected: PASS — prints `pundit scheduler checks passed`.

- [ ] **Step 5: Add the X-posts route to `cup.ts`**

In `server/src/routes/cup.ts`, find the line:

```ts
import { listPunditExecutions } from '../services/punditExecutionLog.js';
```

and insert immediately after it:

```ts
import { listXPosts } from '../services/xPostLog.js';
```

Then find the existing route registration `cupRouter.get('/pundit/executions', (req: Request, res: Response) => {` and insert the following immediately BEFORE it:

```ts
cupRouter.get('/pundit/x-posts', (_req: Request, res: Response) => {
  res.json({ posts: listXPosts() });
});

```

- [ ] **Step 6: Start the scheduler + document the endpoint in `index.ts`**

In `server/src/index.ts`, find the line `import { startMarketIndexer } from './services/marketIndexer.js';` and insert immediately after it:

```ts
import { startPunditAutoStake } from './services/punditScheduler.js';
```

Then find the line `void startMarketIndexer();` and insert immediately after it:

```ts
startPunditAutoStake(); // autonomous pundit loop (off unless PUNDIT_AUTOSTAKE_ENABLED=true)
```

Then find the line `      cupPunditExecutions: 'GET /api/cup/pundit/executions',` and insert immediately after it:

```ts
      cupPunditXPosts: 'GET /api/cup/pundit/x-posts',
```

- [ ] **Step 7: Typecheck**

Run: `npm --prefix server run typecheck`
Expected: PASS — no errors.

- [ ] **Step 8: Verify the route + that the cron is off by default**

Start the server: `npm --prefix server run dev` (port 8787; if `EADDRINUSE`, a hot-reload server already has your changes — use it). Confirm the startup log contains `[pundit-cron] disabled`. In a second terminal:

Run: `curl -s http://localhost:8787/api/cup/pundit/x-posts`
Expected: `{"posts":[...]}` — HTTP 200 (array may be empty).

Stop the server (Ctrl+C) if you started it.

- [ ] **Step 9: Commit**

```bash
git add server/src/services/punditScheduler.ts server/scripts/test-pundit-scheduler.ts server/src/routes/cup.ts server/src/index.ts
git commit -m "feat(pundit): autonomous stake-and-announce cron (off by default)"
```

---

## Task 3: Frontend X feed

**Files:**
- Modify: `src/api/client.ts`
- Modify: `src/pages/PunditPage.tsx`

- [ ] **Step 1: Add the DTO + API method to `src/api/client.ts`**

In `src/api/client.ts`, add this interface next to the other `...Dto` interface declarations:

```ts
export interface XPostDto {
  matchId: string;
  text: string;
  status: 'posted' | 'skipped' | 'failed';
  tweetId: string | null;
  reason: string;
  createdAt: string;
}
```

Then, inside the `api` object, add this method immediately after the `cupPunditPick` method:

```ts
  cupPunditXPosts: () => request<{ posts: XPostDto[] }>('/cup/pundit/x-posts'),
```

- [ ] **Step 2: Add the "Hermes on X" feed to `src/pages/PunditPage.tsx`**

Read `src/pages/PunditPage.tsx`. It is a React component that already renders the pundit profile and open picks via `useApi`. Make three changes:

(a) Add the `Twitter` icon — find the existing `lucide-react` import line and add `Twitter` to it (keep whatever icons are already imported, just add `Twitter`).

(b) Inside the `PunditPage` component, add a second `useApi` call immediately after the existing one:

```ts
  const xPosts = useApi(() => api.cupPunditXPosts(), []);
```

(c) Find the component's outermost closing `</div>` — the last one before the final `);` of the returned JSX — and insert this section immediately BEFORE that closing `</div>`:

```tsx
      <div className="stadium-card mt-4 p-4">
        <div className="mb-3 flex items-center gap-2 text-micro text-pitch">
          <Twitter className="h-3.5 w-3.5" /> Hermes on X
        </div>
        {xPosts.data && xPosts.data.posts.filter((p) => p.status === 'posted').length > 0 ? (
          <div className="flex flex-col gap-2">
            {xPosts.data.posts
              .filter((p) => p.status === 'posted')
              .slice(0, 6)
              .map((p) => (
                <div key={p.createdAt} className="rounded-lg border border-stadium-line px-3 py-2">
                  <p className="whitespace-pre-line text-xs text-stadium-text-secondary">{p.text}</p>
                  {p.tweetId && (
                    <a
                      href={`https://x.com/i/web/status/${p.tweetId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-[10px] font-bold text-pitch hover:underline"
                    >
                      view on X ↗
                    </a>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-xs text-stadium-text-muted">
            No posts yet — Hermes posts here after each verified on-chain stake.
          </div>
        )}
      </div>
```

If `npm run build` (Step 3) reports a JSX-nesting error, the section was inserted at the wrong depth — it must be a direct child of the component's outermost wrapper `<div>`, as the last child. If `Twitter` is not a valid `lucide-react` export in the installed version, use `MessageSquare` instead (it is always available) and adjust the import + the icon usage.

- [ ] **Step 3: Build the frontend**

Run: `npm run build`
Expected: PASS — no TypeScript or bundler errors.

- [ ] **Step 4: Commit**

```bash
git add src/api/client.ts src/pages/PunditPage.tsx
git commit -m "feat(pundit): Hermes-on-X feed on the AI Pundit screen"
```

---

## Self-Review

**1. Spec coverage** — DESIGN §2.1 Flow D (autonomous pundit):
- Cron picks a fixture, stakes, verifies: `punditScheduler` + the existing `executePunditPick` (Task 2). ✓
- Posts to X on a verified stake: `announceExecution` → `composeTweet` + `postToX` (Task 1). ✓
- Off / honest without config: cron returns early unless `PUNDIT_AUTOSTAKE_ENABLED`; `postToX` returns `x_not_configured` without keys; every attempt logged (Tasks 1-2). ✓
- "Live X feed" on the AI Pundit screen (DESIGN wireframe [6]): the Hermes-on-X feed (Task 3). ✓
- No money/posting happens from building this — both paths are operator-gated. ✓

**2. Placeholder scan** — every code step has complete content; every command an expected output. The two adaptive notes (build-gated icon fallback, JSX nesting) are not placeholders. ✓

**3. Type consistency** — `XPost` defined in `xPostLog.ts`, used by `xPoster.ts` + the route. `PunditExecution` is the existing pundit-executor export consumed by `composeTweet`/`announceExecution`. `SchedulableFixture` / `pickNextFixture` defined in `punditScheduler.ts`, used by its test. `composeTweet` / `postToX` / `announceExecution` signatures match every call site. `XPostDto` (frontend) mirrors `XPost`; `cupPunditXPosts()` matches the route.

**Out of scope (deliberate):** Follow/Fade buttons on the pundit (a separate UX feature); a tweet for non-staked outcomes; threading replies.
