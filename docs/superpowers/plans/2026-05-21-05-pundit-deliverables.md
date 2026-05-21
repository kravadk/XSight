# Plan 5: AI Pundit (Hermes) + Deliverables — Implementation Plan

> **For agentic workers:** execute task-by-task, commit per task. NO MOCKS — real Claude
> API, real fixture data, honest fallback when no key.

**Goal:** The autonomous **Hermes** pundit — a Claude-backed agent that researches a
fixture and issues a conviction-weighted pick — plus the X Cup submission deliverables
(README, LICENSE, contract addresses).

**What exists:** `services/ai.ts` (Anthropic SDK client pattern), `getCupAiEdge` (a
rating heuristic), the frontend `PunditPage` (currently wired to `cupAiEdge`).

---

## Task 1: `services/punditService.ts`

**Files:** Create `server/src/services/punditService.ts`.

- [ ] `getPunditPick(matchId)` — pulls the fixture (`getCupMatch`) + the heuristic edge
  (`getCupAiEdge`) as input signal, then calls Claude (reusing the `ai.ts` client
  pattern) for a structured pundit verdict: `{ pick: HOME|DRAW|AWAY|PASS, conviction
  0–1, take (1–2 sentences, pundit voice), keyFactors[] }`. Parses JSON from the reply.
- [ ] **Honest fallback:** when `ANTHROPIC_API_KEY` is absent, derive the pick from the
  heuristic edge and tag `source: 'heuristic'` (vs `'hermes-claude'`) — never fabricate.
- [ ] In-memory cache per match (TTL ~10 min) so picks are stable + cheap.
- [ ] `listPunditPicks(limit)` — picks for the next upcoming fixtures.
- [ ] `getPunditProfile()` — Hermes identity + config (`model`, `mode`).
- [ ] Commit: `feat(pundit): add Claude-backed Hermes pundit service`.

## Task 2: Pundit routes + API client

**Files:** Modify `server/src/routes/cup.ts`, `server/src/index.ts`, `src/api/client.ts`.

- [ ] `GET /api/cup/pundit` → `{ profile, picks }`; `GET /api/cup/pundit/:matchId` → one
  pick. Add both to the index endpoint map.
- [ ] `api.cupPundit()` + `api.cupPunditPick(matchId)` + DTOs in `client.ts`.
- [ ] Commit: `feat(pundit): expose /api/cup/pundit routes`.

## Task 3: Wire PunditPage to the real pundit

**Files:** Modify `src/pages/PunditPage.tsx`.

- [ ] Replace the per-card `cupAiEdge` call with `cupPunditPick`; show the pundit's
  `take` + `conviction` + `source` badge. Profile card reads `getPunditProfile`.
- [ ] Commit: `feat(ui): wire AI Pundit screen to the Hermes service`.

## Task 4: Pundit verification script

**Files:** Create `server/scripts/test-pundit.ts`; Modify `server/package.json`.

- [ ] Print the pundit profile + picks for a few fixtures; works with or without a key
  (heuristic fallback). Add `test:pundit`. Run it. Commit: `test(pundit): add dry-run`.

## Task 5: Submission deliverables

**Files:** Create `LICENSE`, `docs/xcup/CONTRACTS.md`; rewrite `README.md`.

- [ ] `LICENSE` — MIT.
- [ ] `README.md` — X Cup rewrite: what it is, architecture, how to run (frontend +
  server + contracts), links to `docs/xcup/DESIGN.md` + `BUILD-STATUS.md`.
- [ ] `docs/xcup/CONTRACTS.md` — contract registry: `CupOracleV2` (deployed address +
  explorer), `ParimutuelMarket` / `FanPassSBT` (deploy-pending), X Layer USDT/USDC.
- [ ] Commit: `docs: X Cup README, LICENSE, contract registry`.

---

## Notes / gated extensions
- Autonomous **staking** and **X posting** by Hermes reuse the resolver's safety model
  (operator-gated, default-off) — documented here, not built, to avoid half-built
  autonomous money/posting paths. The pundit *pick engine* is the real, shippable core.

## Self-Review
- DESIGN §2.1 Flow D (pundit research → decision), §13 Day 4–6 (pundit + deliverables).
- No mocks: real Claude API; honest `heuristic` source label when no key.

## Outcome
X Cup is feature-complete: contracts, oracle pipeline, market backend, 8-screen
frontend, an AI pundit, and a submission-ready repo.
