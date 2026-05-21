# XSight × OKX X Cup — Build Status & Handoff

> **Read this first**, then `docs/xcup/DESIGN.md` (full design + architecture) and
> `docs/superpowers/plans/` (per-plan implementation plans).
> Updated: 2026-05-21 · Branch: `feat/xcup-prediction-market`.

> 🔴 **DIRECTIVE (user, 2026-05-21): NO MOCKS, NO LOCAL STAND-INS — everything real.**
> Product AND tests use only real components. The contract test layer runs against a
> **forked X Layer mainnet** with the real `CupOracleV2` + real USDT/USDC (Hardhat
> account impersonation). The sole crafted contract is the re-entrancy exploit harness
> (`contracts/test/exploit/ReentrancyAttacker.sol`) — an attacker, not a mock.

## What this is
World Cup prediction market on X Layer: real-money USDC/USDT pari-mutuel pools on football
match outcomes, settled by a trustless multi-source oracle, with an autonomous AI pundit
opponent and a free-to-play funnel. Full spec: `docs/xcup/DESIGN.md`.

## Build approach
5 sequential plans (decomposition in `DESIGN.md`):
1. **Smart Contracts** — ✅ DONE
2. **Oracle Resolution Pipeline** — ✅ DONE
3. **Market Backend + Indexer** — ✅ DONE
4. Frontend (8 screens, World Cup design, **real team logos**)
5. AI Pundit (Hermes) + repo / demo / submission deliverables

Mode: build **autonomously**, plan-by-plan — write
`docs/superpowers/plans/2026-05-21-0N-<name>.md`, then execute it (commit per task),
checkpoint at each plan boundary.

## ✅ DONE — Plan 1 (Smart Contracts) + test rework
Commits on `feat/xcup-prediction-market`: `0de4a48`, `15d60ee`, `de67571`, `edfb242`,
`db58700`.
- `contracts/ParimutuelMarket.sol` — pari-mutuel pool; single-file, no external deps;
  reads `CupOracleV2.getMatch()` for settlement. **Token-agnostic** (`token`, not `usdc`)
  — settles in USDT *or* USDC.
- **Test layer reworked to no-mocks fork tests** — `contracts/test/ParimutuelMarket.test.cjs`
  runs **23 tests against a forked X Layer mainnet**: real `CupOracleV2`, real USDT
  (`0x1E4a5963…`) + real USDC (`0x74b7F163…`). Accounts funded by Foundry-style `deal`.
  `contracts/test/Mocks.sol` deleted; only `exploit/ReentrancyAttacker.sol` remains.
  Run: `npm run contracts:test` (`cross-env FORK=1`).
- `server/scripts/deploy-parimutuel-market.ts` — mainnet deploy; reads
  `PARIMUTUEL_TOKEN_ADDRESS`. `server/.env.example` documents the stablecoin registry.
- Plan doc: `docs/superpowers/plans/2026-05-21-01-smart-contracts.md`.

## ✅ DONE — Plan 2 (Oracle Resolution Pipeline)
Commit: `feat(oracle): Plan 2 — autonomous resolution pipeline`.
- `server/src/services/quorumResolver.ts` — idempotent orchestrator driven by real
  on-chain state: `register → propose → (challenge window) → finalize`, one action per
  match per pass.
- `server/src/services/cupScheduler.ts` — periodic pass, **off by default**.
- `cupOracleContract`: `registerCupOracleMatch` + `readCupChallengeWindow` added.
- `GET /api/cup/resolver` (status) + `POST /api/cup/resolver/run`.
- `server/scripts/test-quorum-resolver.ts` — dry-run verification (`test:cup-resolver`).
- Safety: autonomous writes double-gated — `CUP_WRITE_API_ENABLED` + default-off
  `CUP_RESOLVER_ENABLED`. Verified: server typecheck clean; resolver dry-run runs
  end-to-end against live feeds, sends zero txs.
- Plan doc: `docs/superpowers/plans/2026-05-21-02-oracle-pipeline.md`.

## ✅ DONE — Plan 3 (Market Backend + Indexer)
Commits: `cc13871` (keccak match-id fix), `8167e3a` (market backend).
- `services/parimutuelContract.ts` — ABI, reads, operator writes, unsigned
  approve/stake/claim calldata builders for the user's wallet.
- `services/marketIndexer.ts` — RPC `getLogs` poller; reconstructs market state from
  events; in-memory mirror + DB persistence; cursor backfill.
- `services/marketStore.ts` — DB cache (`cup_markets`/`cup_stakes`/`cup_claims`/
  `cup_indexer_state`), DB-optional.
- `services/marketService.ts` — joins live fixtures + indexed state → `MarketView` /
  `MarketPosition`, pool-share odds.
- `routes/markets.ts` — `GET /api/markets[/:id[/position]]`, `/indexer`, stake/claim-tx
  builders, gated operator `ensure`/`settle`.
- `utils/cupIds.ts` — length-safe keccak match-id encoding (fixes a latent
  `encodeBytes32String` overflow in the oracle path).
- Verified: server typecheck clean; `test:market` lists 104 real World Cup 2026 fixtures
  as markets with honest `contract_not_deployed` state, zero txs.
- Plan doc: `docs/superpowers/plans/2026-05-21-03-market-backend.md`.

## ⚠ KEY DECISIONS (carry forward)
- **Mainnet only** — deploy target X Layer mainnet (chain 196); no public-testnet phase.
- **Stablecoin: USDT + USDC.** `ParimutuelMarket` is token-agnostic; the deploy picks one
  via `PARIMUTUEL_TOKEN_ADDRESS`. Fork tests cover both.
  USDT `0x1E4a5963aBFD975d8c9021ce480b42188849D41d`,
  USDC `0x74b7F16337b8972027F6196A17a631aC6dE26d22` (both 6-decimal).
- Toolchain: **Hardhat 2** + `.cjs` config & tests (repo root is ESM). Fork config
  registers chain 196 hardfork history + mines one local block (EDR workaround).
- Outcome enum mirrors `CupOracleV2`: **1=Home, 2=Draw, 3=Away**; oracle `state==3` =
  Finalized.
- **Mainnet deploy + contract verification = USER-GATED** (real OKB gas + live
  money-holding contract). Not run autonomously.

## ▶ NEXT STEP
**Plan 4 — Frontend** (`docs/superpowers/plans/2026-05-21-04-frontend.md`). Rework the
React app from the legacy XSight trading-copilot UI into the X Cup prediction market: 8
screens (DESIGN §5) — Markets, Market detail, My Bets, Bracket, Leaderboard, AI Pundit,
FanPass, Developers — with a World Cup visual theme, **real team logos/flags**, OKX Wallet
connect, and the approve/stake/claim flow. Every screen binds to the real backend
(`/api/markets`, `/api/cup/*`) — no mock data. Backend is fully ready (Plans 1–3).
