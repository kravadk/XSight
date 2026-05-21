# Plan 2: Oracle Resolution Pipeline — Implementation Plan

> **For agentic workers:** execute task-by-task, commit per task. Steps use checkbox
> (`- [ ]`) syntax. NO MOCKS — real sports APIs, real CupOracleV2, real signer.

**Goal:** Close the loop between the existing multi-source CupHub ingestion and the
deployed `CupOracleV2` so a finished match flows **ingest → quorum → registerMatch →
proposeResult → (challenge window) → finalizeResult** with no manual step — DESIGN §2.1
Flow F.

**What already exists (verified, do not rebuild):**
- `services/cupData.ts` — 3 real source adapters (ESPN, football-data.org, TheSportsDB),
  `mergeProviderMatches`, `evaluateSettlementQuorum` (2-of-N agreement), evidence/source/
  rules hashing. A finished match exposes `settlement.sourceQuorum.status` and
  `settlement.proposedOutcome`.
- `services/cupOracleContract.ts` — `readCupOracleMatch`, `proposeCupOracleResult`,
  `challengeCupOracleResult`, `finalizeCupOracleResult` (signed txs, gated by
  `CUP_WRITE_API_ENABLED`). **Gap:** no `registerMatch` wrapper — and the real oracle
  reverts `MatchNotFound` on `proposeResult` for an unregistered match.
- `services/cupSettlementLog.ts` / `cupPersistence.ts` — settlement-tx logging.

**What this plan adds:**
1. `registerCupOracleMatch` in `cupOracleContract.ts`.
2. `services/quorumResolver.ts` — the orchestrator (on-chain-state-driven, idempotent).
3. `services/cupScheduler.ts` — periodic tick, **off by default**.
4. Wiring in `index.ts` + a `GET /api/cup/resolver` status route.
5. `server/scripts/test-quorum-resolver.ts` — dry-run verification against the live feed.

**Safety:** the resolver sends **real on-chain txs that spend real OKB**. It is gated by
a new `CUP_RESOLVER_ENABLED` flag (default `false`) *in addition to*
`CUP_WRITE_API_ENABLED`. With the flag off, the resolver still runs in **dry-run**
(computes the plan, sends nothing). The autonomous loop only starts when the flag is on.

---

## Task 1: `registerMatch` support in `cupOracleContract.ts`

**Files:** Modify `server/src/services/cupOracleContract.ts`.

- [ ] Add `registerCupOracleMatch(matchId)` — wraps `registerMatch(matchId, rulesHash,
  sourceHash, evidenceHash, evidenceUri)`, pulling the four hashes from the live
  `getCupMatch(matchId).settlement`. `registerMatch` is `onlyOwner`, so it reuses the
  signer; surface a clear error if the signer is not the oracle owner.
- [ ] Add `readCupChallengeWindow()` — reads `challengeWindow()` once, cached.
- [ ] Extend `writeCupOracleTx`'s method union with `registerMatch` (no quorum gate —
  registration is allowed before quorum; the quorum gate stays on `proposeResult`).
- [ ] Commit: `feat(oracle): add registerMatch wrapper + challengeWindow read`.

---

## Task 2: `services/quorumResolver.ts`

**Files:** Create `server/src/services/quorumResolver.ts`.

The resolver is **idempotent** and **driven by on-chain state** (`readCupOracleMatch`),
never by local assumptions. One pass:

- [ ] `planResolution()` — for every fixture in the live feed, decide the next action:
  - match not `final` → `skip` (`reason: not finished`).
  - `final` but `sourceQuorum.status !== 'settlement_ready'` → `hold` (honest state:
    `conflicting_sources` / `source_quorum_unavailable`).
  - on-chain `state` unknown/not-registered → next action `register`.
  - on-chain `state === Open` (0) → next action `propose` (outcome = quorum outcome).
  - on-chain `state === Proposed` (1) and `now < challengeEndsAt` → `wait_challenge`.
  - on-chain `state === Proposed` (1) and `now >= challengeEndsAt` → `finalize`.
  - on-chain `state === Challenged` (2) → `hold` (manual review).
  - on-chain `state === Finalized` (3) → `done`.
  Returns `ResolverStep[]` with `{ matchId, action, outcome?, reason, onchainState }`.
- [ ] `resolveCupMatches({ dryRun })` — runs `planResolution()`, then for each actionable
  step (`register` / `propose` / `finalize`) either logs it (`dryRun`) or calls the
  matching `cupOracleContract` write. One action per match per pass (register this pass,
  propose next pass) — keeps each pass cheap and each tx independently observable.
  Returns a `ResolverReport { generatedAt, dryRun, steps, executed[] }`.
- [ ] `getResolverStatus()` — last report + config snapshot (`enabled`, `writeEnabled`,
  `oracleDeployed`, `intervalMs`) for the status route.
- [ ] Errors per match are caught and recorded on the step — one bad match never blocks
  the others.
- [ ] Commit: `feat(oracle): add quorum resolver orchestrator`.

---

## Task 3: `services/cupScheduler.ts`

**Files:** Create `server/src/services/cupScheduler.ts`.

- [ ] `startQuorumResolver()` — if `CUP_RESOLVER_ENABLED !== true`, log one line
  (`resolver disabled — dry-run only`) and return. Otherwise `setInterval` every
  `CUP_RESOLVER_INTERVAL_MS` (default 300000 = 5 min): run `resolveCupMatches({ dryRun:
  false })`, log a one-line summary, never throw out of the tick.
- [ ] First tick fires after a short delay (10s) so the server finishes booting.
- [ ] Commit: `feat(oracle): add resolver scheduler (off by default)`.

---

## Task 4: Wire-up + status route + env

**Files:** Modify `server/src/index.ts`, `server/src/routes/cup.ts`,
`server/src/config/env.ts`, `server/.env.example`.

- [ ] `env.ts`: add `cupResolverEnabled` (`CUP_RESOLVER_ENABLED === 'true'`, default
  false) and `cupResolverIntervalMs` (default 300000).
- [ ] `.env.example`: document both under the CupHub Oracle section, with the safety note
  that enabling it sends real OKB-spending txs.
- [ ] `index.ts`: `startQuorumResolver()` alongside the other `start*` services; add
  `cupResolver: 'GET /api/cup/resolver'` to the endpoint map.
- [ ] `routes/cup.ts`: `GET /api/cup/resolver` → `getResolverStatus()`;
  `POST /api/cup/resolver/run` (cup-write-authorized) → `resolveCupMatches({ dryRun })`
  where `dryRun` defaults to `!cupResolverEnabled`.
- [ ] Commit: `feat(oracle): wire resolver into server + status route`.

---

## Task 5: Dry-run verification script

**Files:** Create `server/scripts/test-quorum-resolver.ts`; Modify `server/package.json`.

- [ ] Script: call `planResolution()` + `resolveCupMatches({ dryRun: true })`, print the
  per-match step table. No txs. Exercises the real feed + real on-chain reads.
- [ ] `server/package.json`: add `"test:cup-resolver": "tsx scripts/test-quorum-resolver.ts"`.
- [ ] Run it; confirm it prints a coherent plan (or honest empty/hold states when no
  finished matches are live). Commit: `test(oracle): add quorum resolver dry-run script`.

---

## Self-Review
- Spec coverage: DESIGN §2.1 Flow F (ingest→quorum→propose→finalize), §4 (`quorumResolver`
  module). Free pools / leagues are off-chain product (Plan 3+), not here.
- No mocks: real sports APIs via `cupData`, real `CupOracleV2` reads/writes, real signer.
- Safety: autonomous on-chain writes are double-gated and default-off; dry-run is the
  default everywhere the flag is unset.

## Outcome
A finished, quorum-backed match resolves itself onto `CupOracleV2` end-to-end. Next:
**Plan 3 — Market Backend + Indexer** (the `ParimutuelMarket` service layer + the event
indexer that mirrors on-chain state into the DB the frontend reads).
