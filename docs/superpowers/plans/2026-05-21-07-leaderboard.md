# Plan 7: Global Leaderboard + Head-to-Head — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A global leaderboard that ranks every participant by free-pool pick accuracy, with the AI pundit "Hermes" as a first-class ranked participant — closing DESIGN §1 Compete ("глобальний лідерборд", "head-to-head «обіграй AI»").

**Architecture:** Builds directly on Plan 6 (free pools). `leaderboardService.ts` mirrors the pundit's picks into the free-pool store under a dedicated Hermes wallet, then ranks `freePoolStandings()` into numbered rows — fans and bot side by side. Pure `rankLeaderboard` core is unit-tested; one public `GET /api/cup/leaderboard` route; the `LeaderboardPage` placeholder is replaced with the real board + a real You-vs-Hermes card.

**Tech Stack:** TypeScript (NodeNext ESM), Express, React 19 + Vite. Backend tests are `tsx` scripts with `node:assert/strict`. Frontend verification is `npm run build`.

**Depends on:** Plan 6 — `freePoolService.ts` exports `freePoolStandings`, `getFreePicks`, `recordFreePick`, `FreePoolStanding`.

---

## File Structure

**Create:**
- `server/src/services/leaderboardService.ts` — ranking logic + pundit-pick mirroring.
- `server/scripts/test-leaderboard.ts` — TDD test for the pure `rankLeaderboard` core.

**Modify:**
- `server/src/routes/cup.ts` — add `GET /leaderboard`.
- `server/src/index.ts` — document the endpoint.
- `server/package.json` — add `test:leaderboard` script.
- `src/api/client.ts` — add `LeaderboardRowDto` + `cupLeaderboard` method.
- `src/pages/LeaderboardPage.tsx` — replace the placeholder with the real board.

---

## Task 1: Leaderboard service

**Files:**
- Create: `server/src/services/leaderboardService.ts`
- Create: `server/scripts/test-leaderboard.ts`
- Modify: `server/package.json`

- [ ] **Step 1: Add the npm test script to `server/package.json`**

Replace the line `    "test:free-pool": "tsx scripts/test-free-pool-service.ts",` with:

```json
    "test:free-pool": "tsx scripts/test-free-pool-service.ts",
    "test:leaderboard": "tsx scripts/test-leaderboard.ts",
```

- [ ] **Step 2: Write the failing test**

Create `server/scripts/test-leaderboard.ts`:

```ts
/**
 * TDD test for the pure leaderboard ranking core — fully offline.
 *
 * Run: npm --prefix server run test:leaderboard
 */
import assert from 'node:assert/strict';
import { rankLeaderboard } from '../src/services/leaderboardService.js';
import type { FreePoolStanding } from '../src/services/freePoolService.js';

const standings: FreePoolStanding[] = [
  { wallet: '0xhermes', picks: 5, correct: 4, points: 40, accuracy: 0.8 },
  { wallet: '0xfan', picks: 3, correct: 1, points: 10, accuracy: 1 / 3 },
];

const rows = rankLeaderboard(standings, '0xhermes');
assert.equal(rows.length, 2);
assert.equal(rows[0]?.rank, 1, 'first row is rank 1');
assert.equal(rows[1]?.rank, 2, 'second row is rank 2');
assert.equal(rows[0]?.isHermes, true, 'hermes row flagged');
assert.equal(rows[1]?.isHermes, false, 'fan row not flagged');
assert.equal(rows[0]?.points, 40, 'standing fields carried through');
assert.equal(rows[1]?.correct, 1, 'standing fields carried through');

assert.equal(rankLeaderboard(standings, null).every((r) => !r.isHermes), true, 'null hermes flags nobody');

const ci = rankLeaderboard([{ wallet: '0xABC', picks: 1, correct: 1, points: 10, accuracy: 1 }], '0xabc');
assert.equal(ci[0]?.isHermes, true, 'hermes match is case-insensitive');

assert.deepEqual(rankLeaderboard([], '0xhermes'), [], 'empty standings -> empty board');

console.log('leaderboard checks passed');
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm --prefix server run test:leaderboard`
Expected: FAIL — `Cannot find module '../src/services/leaderboardService.js'`.

- [ ] **Step 4: Write the service**

Create `server/src/services/leaderboardService.ts`:

```ts
/**
 * Global leaderboard (DESIGN §1 Compete, §5 wireframe [5]).
 *
 * Ranks every participant by their free-pool record. The AI pundit "Hermes" is a
 * first-class participant (DESIGN §1 — the bot is a non-human "user"): its picks are
 * mirrored into the free-pool store under a dedicated wallet, so the same
 * `freePoolStandings()` aggregation ranks fans and the bot side by side — that is the
 * "beat the AI" head-to-head.
 */
import { isAddress } from 'ethers';
import { env } from '../config/env.js';
import { listPunditPicks } from './punditService.js';
import { freePoolStandings, getFreePicks, recordFreePick, type FreePoolStanding } from './freePoolService.js';

export interface LeaderboardRow {
  rank: number; // 1-based
  wallet: string;
  isHermes: boolean; // true for the AI pundit's row
  picks: number;
  correct: number;
  accuracy: number; // 0..1
  points: number;
}

/** The wallet identity the AI pundit's free picks are recorded under, or null. */
export function hermesWallet(): string | null {
  const pundit = env.punditWalletAddress.trim();
  if (isAddress(pundit)) return pundit.toLowerCase();
  const agentic = env.agenticWalletAddress.trim();
  if (isAddress(agentic)) return agentic.toLowerCase();
  return null;
}

/** Pure: number sorted standings into ranked rows, flagging the Hermes row. */
export function rankLeaderboard(standings: FreePoolStanding[], hermes: string | null): LeaderboardRow[] {
  return standings.map((s, i) => ({
    rank: i + 1,
    wallet: s.wallet,
    isHermes: hermes !== null && s.wallet.toLowerCase() === hermes,
    picks: s.picks,
    correct: s.correct,
    accuracy: s.accuracy,
    points: s.points,
  }));
}

/** Mirror the pundit's current non-PASS picks into the free-pool store as Hermes' picks. */
export async function recordPunditFreePicks(): Promise<{ mirrored: number }> {
  const hermes = hermesWallet();
  if (!hermes) return { mirrored: 0 };
  const picks = await listPunditPicks();
  let mirrored = 0;
  for (const pick of picks) {
    if (pick.pick === 'PASS') continue;
    const res = await recordFreePick(pick.matchId, hermes, pick.pick);
    if (res.ok) mirrored += 1;
  }
  return { mirrored };
}

/** The ranked global leaderboard plus the Hermes row, if present. */
export async function globalLeaderboard(): Promise<{ rows: LeaderboardRow[]; hermes: LeaderboardRow | null }> {
  // Best-effort: a pundit/LLM failure must not break the leaderboard for fans.
  try {
    await recordPunditFreePicks();
  } catch {
    /* Hermes simply will not appear this cycle */
  }
  const picks = await getFreePicks(); // lazy-scores every pending pick
  const rows = rankLeaderboard(freePoolStandings(picks), hermesWallet());
  return { rows, hermes: rows.find((r) => r.isHermes) ?? null };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm --prefix server run test:leaderboard`
Expected: PASS — prints `leaderboard checks passed`.

- [ ] **Step 6: Typecheck**

Run: `npm --prefix server run typecheck`
Expected: PASS — no errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/leaderboardService.ts server/scripts/test-leaderboard.ts server/package.json
git commit -m "feat(leaderboard): ranking service with Hermes as a participant"
```

---

## Task 2: API route

**Files:**
- Modify: `server/src/routes/cup.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add the service import to `cup.ts`**

In `server/src/routes/cup.ts`, find the line:

```ts
import { recordFreePick, getFreePicks } from '../services/freePoolService.js';
```

and insert immediately after it:

```ts
import { globalLeaderboard } from '../services/leaderboardService.js';
```

- [ ] **Step 2: Add the route to `cup.ts`**

In `server/src/routes/cup.ts`, find the existing route registration `cupRouter.get('/overview', async (_req: Request, res: Response) => {` and insert the following immediately BEFORE it:

```ts
cupRouter.get('/leaderboard', async (_req: Request, res: Response) => {
  res.json(await globalLeaderboard());
});

```

- [ ] **Step 3: Document the endpoint in `index.ts`**

In `server/src/index.ts`, find the line:

```ts
      cupFreePicks: 'GET/POST /api/cup/free-picks  (free-to-play, no wallet money)',
```

and insert immediately after it:

```ts
      cupLeaderboard: 'GET /api/cup/leaderboard',
```

- [ ] **Step 4: Typecheck**

Run: `npm --prefix server run typecheck`
Expected: PASS — no errors.

- [ ] **Step 5: Verify the route responds**

Start the server: `npm --prefix server run dev` (port 8787; if `EADDRINUSE`, a hot-reload dev server is already running and has your changes — use it). In a second terminal:

Run: `curl -s http://localhost:8787/api/cup/leaderboard`
Expected: a JSON object `{"rows":[...],"hermes":...}` — HTTP 200 (`rows` may be empty, `hermes` may be null before any fixture resolves).

Stop the server (Ctrl+C) if you started it.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/cup.ts server/src/index.ts
git commit -m "feat(leaderboard): public leaderboard route"
```

---

## Task 3: Frontend leaderboard

**Files:**
- Modify: `src/api/client.ts`
- Modify: `src/pages/LeaderboardPage.tsx`

- [ ] **Step 1: Add the DTO + API method to `src/api/client.ts`**

In `src/api/client.ts`, add this interface next to the other `...Dto` interface declarations:

```ts
export interface LeaderboardRowDto {
  rank: number;
  wallet: string;
  isHermes: boolean;
  picks: number;
  correct: number;
  accuracy: number;
  points: number;
}
```

Then, inside the `api` object, add this method immediately after the `cupPunditPick` method:

```ts
  cupLeaderboard: () =>
    request<{ rows: LeaderboardRowDto[]; hermes: LeaderboardRowDto | null }>('/cup/leaderboard'),
```

- [ ] **Step 2: Replace `src/pages/LeaderboardPage.tsx` with the real board**

Overwrite `src/pages/LeaderboardPage.tsx` with EXACTLY:

```tsx
import { Crown, Bot, User } from 'lucide-react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useWalletStore } from '../store/walletStore';
import { PageHeader, StatePanel } from '../components/cup/CupKit';
import { cn } from '../utils/format';

function shortWallet(w: string): string {
  return w.length > 12 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w;
}
function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function LeaderboardPage() {
  const { connected, address } = useWalletStore();
  const { data, loading, error, reload } = useApi(() => api.cupLeaderboard(), []);

  const rows = data?.rows ?? [];
  const hermes = data?.hermes ?? null;
  const you =
    connected && address ? rows.find((r) => r.wallet.toLowerCase() === address.toLowerCase()) ?? null : null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        kicker="Beat the bots"
        title="Leaderboard"
        sub="Global ranking by free-pool pick accuracy — you against every fan and the AI pundit."
      />

      <div className="stadium-card pitch-stripes mb-4 p-5">
        <div className="mb-4 flex items-center gap-2 text-micro text-pitch">
          <Crown className="h-3.5 w-3.5" /> You vs Hermes
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-stadium-line bg-stadium-base p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-pitch-bg">
                <User className="h-4 w-4 text-pitch" />
              </div>
              <span className="text-sm font-bold text-stadium-text">
                {you ? `#${you.rank}` : connected ? 'You' : 'Connect wallet'}
              </span>
            </div>
            <div className="font-display text-3xl text-pitch">{you ? pct(you.accuracy) : '—'}</div>
            <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">
              {you ? `${you.correct}/${you.picks} correct · ${you.points} pts` : 'no scored picks yet'}
            </div>
          </div>
          <div className="rounded-xl border border-gold-border bg-gold-bg p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-stadium-base">
                <Bot className="h-4 w-4 text-gold" />
              </div>
              <span className="text-sm font-bold text-stadium-text">
                Hermes{hermes ? ` · #${hermes.rank}` : ''}
              </span>
            </div>
            <div className="font-display text-3xl text-gold">{hermes ? pct(hermes.accuracy) : 'AI'}</div>
            <div className="text-[10px] uppercase tracking-wider text-stadium-text-muted">
              {hermes ? `${hermes.correct}/${hermes.picks} correct · ${hermes.points} pts` : 'autonomous pundit'}
            </div>
          </div>
        </div>
      </div>

      <StatePanel
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyLabel="Global ranking opens at the first settlement"
        onRetry={reload}
      >
        <div className="stadium-card divide-y divide-stadium-line">
          {rows.map((r) => (
            <div
              key={r.wallet}
              className={cn(
                'flex items-center gap-3 p-3.5',
                you && r.wallet === you.wallet && 'bg-pitch-bg',
              )}
            >
              <span className="font-display w-8 text-center text-lg text-stadium-text-muted">{r.rank}</span>
              <div className="flex items-center gap-2">
                {r.isHermes ? (
                  <Bot className="h-4 w-4 text-gold" />
                ) : (
                  <User className="h-4 w-4 text-stadium-text-muted" />
                )}
                <span className="font-mono text-xs text-stadium-text">
                  {r.isHermes ? 'Hermes' : shortWallet(r.wallet)}
                </span>
              </div>
              <span className="ml-auto font-mono text-sm font-bold text-pitch">{pct(r.accuracy)}</span>
              <span className="w-20 text-right font-mono text-xs text-stadium-text-secondary">
                {r.correct}/{r.picks}
              </span>
              <span className="w-16 text-right font-mono text-xs font-bold text-gold">{r.points} pts</span>
            </div>
          ))}
        </div>
      </StatePanel>
    </div>
  );
}
```

If `npm run build` (Step 3) reports that `StatePanel` / `PageHeader` is not exported by `../components/cup/CupKit`, or `cn` is not exported by `../utils/format`, or `useWalletStore` lacks `address` — open the referenced file and correct the import minimally to match the real exports (these are the same imports `MarketDetailPage.tsx` uses, so they should match). Do not change behaviour.

- [ ] **Step 3: Build the frontend**

Run: `npm run build`
Expected: PASS — no TypeScript or bundler errors.

- [ ] **Step 4: Commit**

```bash
git add src/api/client.ts src/pages/LeaderboardPage.tsx
git commit -m "feat(leaderboard): real ranked board + You-vs-Hermes card"
```

---

## Self-Review

**1. Spec coverage** — DESIGN §1 Compete:
- Global leaderboard: `globalLeaderboard()` + `GET /cup/leaderboard` + the `LeaderboardPage` ranked list (Tasks 1-3). ✓
- Head-to-head "обіграй AI": Hermes is a ranked participant via `recordPunditFreePicks`; the You-vs-Hermes card compares the connected wallet's row to the Hermes row (Tasks 1, 3). ✓
- Honest empty state: before any fixture resolves, `freePoolStandings` is empty → the board shows "Global ranking opens at the first settlement" (Task 3). ✓
- Resilient: a pundit/LLM failure is caught — the fan leaderboard still renders (Task 1). ✓

**2. Placeholder scan** — every code step has complete content; every command an expected output. The Task 3 Step 2 adaptive note is a build-gated import fix, not a placeholder. ✓

**3. Type consistency** — `LeaderboardRow` defined in `leaderboardService.ts`, used by its test. `rankLeaderboard(standings, hermes)` / `globalLeaderboard()` signatures match the route + test. `FreePoolStanding` / `freePoolStandings` / `getFreePicks` / `recordFreePick` are the Plan 6 exports. `LeaderboardRowDto` (frontend) mirrors `LeaderboardRow` (backend); `cupLeaderboard()` returns `{ rows, hermes }` matching the route. ✓

**Out of scope (deliberate):** league-scoped leaderboards (next feature — friend leagues); ranking by on-chain market P&L (the board ranks free-pool accuracy, the F2P funnel metric — market P&L is a later enrichment).
