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
4. **Frontend (8 screens, World Cup design, real team logos)** — ✅ DONE
5. **AI Pundit (Hermes) + repo / demo / submission deliverables** — ✅ DONE

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

## ✅ DONE — Plan 4 (Frontend — 8 X Cup screens)
Commit: `e52881d` (`feat(ui): Plan 4 …`).
- Dark stadium / night-match theme — floodlit-pitch green + champion gold, Anton
  display font (`src/index.css`).
- X Cup navigation (Predict / Compete / Intel); real OKX Wallet connect — EIP-1193,
  X Layer 196 network guard, `sendTx` (`walletStore`).
- 8 screens, all on real backend data: Markets feed, Market detail (approve→stake),
  My Bets (claim), Bracket, Leaderboard, AI Pundit, FanPass, Developers.
- Real team flags via a FIFA→ISO map; typed market API client + `useApi` hook.
- Backend: `GET /api/markets/positions?wallet=` for My Bets.
- Verified: `tsc` clean, `vite build` clean, Markets renders 104 real World Cup
  fixtures with honest pre-deploy states.
- Plan doc: `docs/superpowers/plans/2026-05-21-04-frontend.md`.

## ✅ DONE — Plan 5 (AI Pundit + deliverables)
Commits: `feat(pundit): Plan 5 …`, `docs: X Cup README, MIT LICENSE, contract registry`.
- `services/punditService.ts` — **Hermes**, a Claude-backed pundit: reads a real fixture
  + the multi-source heuristic edge, returns a conviction-weighted verdict. Honest
  `heuristic` fallback with no API key. `GET /api/cup/pundit[/:matchId]`.
- AI Pundit screen wired to the real Hermes service; `test:pundit` dry-run verified
  (real Claude verdicts).
- Deliverables: `LICENSE` (MIT), `README.md` (X Cup rewrite), `docs/xcup/CONTRACTS.md`.
- Plan doc: `docs/superpowers/plans/2026-05-21-05-pundit-deliverables.md`.

## ✅ BUILD COMPLETE — contracts deployed
All 5 plans done; all three contracts are live on X Layer mainnet (chain 196):
- `CupOracleV2` — `0xE4dFef03E107225f2239CFfF955a378A9a8158Be`
- `ParimutuelMarket` — `0xdB4F6A0CC67B3dF1f25129079E3f45b996A4B9D7` (settles in USDT,
  deploy block 60609636) — `server/.env` set; the event indexer is live and caught up.
- `FanPassSBT` — `0x74F75532428A99E613a865C97D1084b7f38241BD`
Registry: `docs/xcup/CONTRACTS.md`.

Remaining (user steps, no code): verify the contracts on the OKX X Layer explorer
(single file · solc v0.8.24 · optimizer 200 · MIT), record the demo video, create the
submission X account. Markets now report `market_not_created` until the operator opens
them (`POST /api/markets/ensure`).

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
Build is complete — see **BUILD COMPLETE** above. The only remaining items are
user-gated (mainnet deploy + verification, demo video, submission X account).
