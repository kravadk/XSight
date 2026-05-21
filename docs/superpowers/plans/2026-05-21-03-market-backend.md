# Plan 3: Market Backend + Indexer — Implementation Plan

> **For agentic workers:** execute task-by-task, commit per task. NO MOCKS — real
> `ParimutuelMarket`/`CupOracleV2` reads, real RPC logs, real fixtures. Where the market
> contract is not yet deployed, surface honest `not_deployed` states — never fake pools.

**Goal:** The service + indexer layer for `ParimutuelMarket` (DESIGN §3 data model, §4
"indexer — without it the dApp is blind"). A finished fixture becomes a market; stakes,
settlement and claims are mirrored from on-chain events into a cache the frontend reads.

**Reality check:** `ParimutuelMarket` is deployed by a **user-gated** step. Until
`PARIMUTUEL_MARKET_ADDRESS` is set, the contract service + indexer run idle and the API
returns honest `contract_not_deployed` / `market_not_created` states. No mock pools.

---

## Task 1: Canonical match-id encoding

**Files:** Create `server/src/utils/cupIds.ts`; Modify `server/src/services/cupOracleContract.ts`.

CupHub match ids (`cup-<home>-<away>-<stamp>`) can exceed 31 bytes, so
`encodeBytes32String` throws on them — the oracle write path is silently broken for real
fixtures. Fix with a length-safe keccak encoding shared by the oracle *and* the market so
the same `matchId` resolves on both contracts.

- [ ] `cupIds.ts`: `encodeMatchId(cupMatchId)` = `keccak256(toUtf8Bytes(cupMatchId))`;
  `deriveMarketId(cupMatchId)` = `keccak256(toUtf8Bytes('xsight-market:' + cupMatchId))`.
- [ ] `cupOracleContract.ts`: replace every `encodeBytes32String(matchId)` with
  `encodeMatchId(matchId)` (read + write paths).
- [ ] Commit: `fix(oracle): length-safe keccak match-id encoding`.

---

## Task 2: `services/parimutuelContract.ts`

**Files:** Create `server/src/services/parimutuelContract.ts`.

Mirrors `cupOracleContract.ts`: inline ABI (matches the token-agnostic contract), reads,
operator writes, and **calldata builders** the frontend uses to prompt the user's wallet.

- [ ] Inline `PARIMUTUEL_ABI` (getMarket, stakeOf, claimed, token/operator/treasury/feeBps,
  createMarket, stake, settle, claim, voidMarket + the 5 events).
- [ ] `parimutuelMetadata()` — address / deployed status / explorer link (mirror
  `cupOracleMetadata`).
- [ ] Reads: `readMarket(marketId)`, `readStakeOf(marketId, wallet)`,
  `hasClaimed(marketId, wallet)` — return `null` when not deployed.
- [ ] Operator writes (signer, gated by `CUP_WRITE_API_ENABLED`): `createMarketTx`,
  `settleMarketTx`, `voidMarketTx`.
- [ ] Calldata builders (no signing — for the frontend's wallet): `buildApproveTx`,
  `buildStakeTx`, `buildClaimTx` → `{ to, data, value:'0x0' }`.
- [ ] Commit: `feat(market): add ParimutuelMarket contract service`.

---

## Task 3: `services/marketStore.ts`

**Files:** Create `server/src/services/marketStore.ts`.

DB cache for indexed on-chain state (DESIGN §3.1). **DB-optional** — every function is a
no-op when `DATABASE_URL` is unset; the indexer keeps an in-memory mirror regardless.

- [ ] `pg.Pool` (reuse the `cupPersistence` ssl/strip pattern) + `ensureMarketSchema()`:
  `cup_markets`, `cup_stakes`, `cup_claims`, `cup_indexer_state(contract, last_block)`.
- [ ] `upsertMarket`, `insertStake`, `insertClaim`, `markSettled`,
  `getIndexerCursor(contract)`, `setIndexerCursor(contract, block)`.
- [ ] Commit: `feat(market): add market DB cache store`.

---

## Task 4: `services/marketIndexer.ts`

**Files:** Create `server/src/services/marketIndexer.ts`.

RPC `getLogs` poller (DESIGN §4 — "lightweight RPC poller, not a full subgraph"). Holds an
**in-memory mirror** (the API's source of truth) and also persists to `marketStore` when a
DB is present. On boot it backfills from the persisted cursor (or `PARIMUTUEL_DEPLOY_BLOCK`).

- [ ] In-memory `IndexerState`: `markets` map, `stakes[]`, `claims[]`, `lastBlock`.
- [ ] `pollOnce()` — `getLogs` in ≤`MARKET_INDEXER_RANGE` (default 2000) block batches for
  `ParimutuelMarket` events (`MarketCreated`, `Staked`, `Settled`, `MarketVoided`,
  `Claimed`); decode → update memory + `marketStore`; advance the cursor.
- [ ] `startMarketIndexer()` — idle-log + return if no `PARIMUTUEL_MARKET_ADDRESS`;
  otherwise backfill then `setInterval` (`MARKET_INDEXER_INTERVAL_MS`, default 30000).
- [ ] `getIndexedMarket(marketId)`, `getIndexerStatus()` for the service + route.
- [ ] Every poll wrapped — a bad batch never crashes the process.
- [ ] Commit: `feat(market): add ParimutuelMarket event indexer`.

---

## Task 5: `services/marketService.ts`

**Files:** Create `server/src/services/marketService.ts`.

Joins the CupHub fixture feed with indexed on-chain market state into the shape the
frontend renders.

- [ ] `listMarkets()` — every fixture → a `MarketView`: `marketId` (`deriveMarketId`),
  fixture meta, `onchain` (indexed pools or `null`), `status`
  (`contract_not_deployed` | `market_not_created` | `open` | `closed` |
  `awaiting_settlement` | `settled` | `refund`), pool totals + `impliedOdds`
  (pool-share; honest 0 when empty).
- [ ] `getMarket(marketId)` — one market + the staking panel inputs (token address,
  close time, the AI fair odds from `getCupAiEdge`).
- [ ] `getPosition(marketId, wallet)` — `readStakeOf` + `hasClaimed` →
  `open|pending|won_claimable|won_claimed|lost|refunded`.
- [ ] `ensureMarketsForFinishedFixtures()` — operator: `createMarket` on-chain for
  fixtures that have none yet (gated; mirrors the resolver's safety model).
- [ ] Commit: `feat(market): add marketService (fixtures + on-chain join)`.

---

## Task 6: Routes + wiring + verification

**Files:** Create `server/src/routes/markets.ts`, `server/scripts/test-market-backend.ts`;
Modify `server/src/index.ts`, `server/src/config/env.ts`, `server/.env.example`,
`server/package.json`.

- [ ] `env.ts`: `parimutuelMarketAddress`, `parimutuelDeployBlock`,
  `marketIndexerIntervalMs`, `marketIndexerRange`.
- [ ] `.env.example`: document the indexer vars under the ParimutuelMarket section.
- [ ] `routes/markets.ts`: `GET /api/markets`, `GET /api/markets/:id`,
  `GET /api/markets/:id/position?wallet=`, `GET /api/markets/indexer` (status),
  `POST /api/markets/:id/stake-tx` + `/claim-tx` (return unsigned calldata).
- [ ] `index.ts`: mount `marketRouter` at `/api/markets`, `startMarketIndexer()`.
  (Note: an existing `/api/market` token route is unrelated — keep both.)
- [ ] `test-market-backend.ts` — print `parimutuelMetadata`, indexer status, and
  `listMarkets()`; add `test:market` to `server/package.json`. Run it.
- [ ] Commit: `feat(market): wire market routes + indexer into server`.

---

## Self-Review
- DESIGN coverage: §3.1 cache tables, §4 indexer (RPC poller, backfill), market service
  modules. Free pools / leagues / leaderboard stay off-chain product (later).
- No mocks: real contracts, real RPC logs, real fixtures; un-deployed = honest empty state.
- Safety: operator writes reuse the `CUP_WRITE_API_ENABLED` gate; the indexer is read-only.

## Outcome
The frontend (Plan 4) has a real `/api/markets` surface — fixtures, pools, odds,
positions, and unsigned stake/claim calldata — backed by a live event indexer.
