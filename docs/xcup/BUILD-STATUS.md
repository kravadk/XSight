# XSight × OKX X Cup — Build Status & Handoff

> **Read this first**, then `docs/xcup/DESIGN.md` (full design + architecture) and
> `docs/superpowers/plans/` (per-plan implementation plans).
> Updated: 2026-05-21 · Branch: `feat/xcup-prediction-market`.

> 🔴 **DIRECTIVE (user, 2026-05-21): NO MOCKS, NO LOCAL STAND-INS — everything real.**
> Product AND tests use only real components. Rework the contract test layer to run
> against a **forked X Layer mainnet** with the real `CupOracleV2` + real stablecoin
> (Hardhat account impersonation), and **delete `contracts/test/Mocks.sol`**. Sole
> exception to confirm with the user: a reentrancy test needs a crafted attacker
> contract (an exploit harness, not a stub of a real thing) — keep it or drop that test.

## What this is
World Cup prediction market on X Layer: real-money USDC pari-mutuel pools on football
match outcomes, settled by a trustless multi-source oracle, with an autonomous AI pundit
opponent and a free-to-play funnel. Full spec: `docs/xcup/DESIGN.md`.

## Build approach
5 sequential plans (decomposition in `DESIGN.md`):
1. **Smart Contracts** — ✅ DONE
2. Oracle Resolution Pipeline (multi-source ingest + quorum)
3. Market Backend + Indexer
4. Frontend (8 screens, World Cup design, **real team logos**)
5. AI Pundit (Hermes) + repo / demo / submission deliverables

Mode: build **autonomously**, plan-by-plan — write
`docs/superpowers/plans/2026-05-21-0N-<name>.md`, then execute it (commit per task),
checkpoint at each plan boundary.

## ✅ DONE — Plan 1 (Smart Contracts)
Commits on `feat/xcup-prediction-market`: `0de4a48`, `15d60ee`, `de67571`.
- `contracts/ParimutuelMarket.sol` — pari-mutuel pool; single-file, no external deps;
  reads `CupOracleV2.getMatch()` for settlement. Compiles clean.
- `contracts/test/Mocks.sol` + `contracts/test/ParimutuelMarket.test.cjs` —
  **11/11 unit tests passing** (`npm run contracts:test`).
- `hardhat.config.cjs` — Hardhat 2.28.6 (`.cjs` because repo root is ESM).
- `server/scripts/deploy-parimutuel-market.ts` — mainnet deploy (solc + ethers).
- Plan doc: `docs/superpowers/plans/2026-05-21-01-smart-contracts.md`.

## ⏳ REMAINING — Plan 1 (small, do first in the next session)
- Add `"deploy:parimutuel": "tsx scripts/deploy-parimutuel-market.ts"` to
  `server/package.json` scripts.
- Add to `server/.env.example`: stablecoin address var (see decision below),
  `PARIMUTUEL_MARKET_ADDRESS`, `PARIMUTUEL_TREASURY`, `PARIMUTUEL_FEE_BPS=0`.
- Optional: `contracts/test/ParimutuelMarket.fork.test.cjs` (Plan 1 Task 5 — fork
  integration test; needs `cross-env` for the npm script + `X_LAYER_RPC_URL`).
- Mainnet deploy + contract verification = **USER-GATED action** (real OKB gas + a
  live money-holding contract). Do not run autonomously.

## ⚠ KEY DECISIONS (carry forward)
- **Mainnet only** — deploy target X Layer mainnet (chain 196); no public-testnet phase;
  de-risk via local Hardhat tests + small first amounts.
- **Stablecoin — UNRESOLVED.** `DESIGN.md` says USDC, but the existing x402 code uses
  **USDT** on X Layer. Confirm the canonical stablecoin + address before deploy; the
  `ParimutuelMarket` constructor takes whichever as `usdc_`. Likely use USDT to match
  the existing x402 asset.
- Toolchain: **Hardhat 2** + `.cjs` config & tests (repo root is ESM `"type":"module"`).
  The contract itself is dependency-free single-file (so the existing `solc`+`ethers`
  deploy-script pattern works unchanged).
- `ParimutuelMarket` outcome enum mirrors `CupOracleV2`: **1=Home, 2=Draw, 3=Away**;
  oracle `state==3` = Finalized.

## ▶ NEXT STEP
Finish the small Plan 1 remainder above, then write **Plan 2**
(`docs/superpowers/plans/2026-05-21-02-oracle-pipeline.md`) — multi-source fixture/result
ingestion + quorum resolver feeding `CupOracleV2` — and execute it. References:
`DESIGN.md` §4 (data flow / source-of-truth) and §5 (competition engine).
