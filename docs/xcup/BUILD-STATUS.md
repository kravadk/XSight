# X Cup — Build Status & Handoff

> **Read this first**, then `docs/xcup/DESIGN.md` (design + architecture),
> `docs/xcup/CONTRACTS.md` (live contract registry) and
> `docs/xcup/HARDENING-PLAN.md` (the bonded-oracle design).
> Updated: 2026-05-22 · Branch: `main`.

> 🔴 **DIRECTIVE: NO MOCKS — everything real.** Product and tests use only real
> components. Contract tests run against a **forked X Layer mainnet** with the real
> oracle and real USDT/USDC (Hardhat account impersonation). The sole crafted
> contract is the re-entrancy exploit harness
> (`contracts/test/exploit/ReentrancyAttacker.sol`) — an attacker, not a mock.

## What this is

A World Cup prediction market on X Layer: real-money USDT pari-mutuel pools on
football match outcomes, settled by a **bonded** multi-source oracle, with an
autonomous AI pundit opponent and a full free-to-play layer. Full spec:
`docs/xcup/DESIGN.md`.

## Build — complete

The product is **feature-complete and live on X Layer mainnet (chain 196)**.

| Area | Status |
|---|---|
| Smart contracts — pari-mutuel market, bonded oracle, M-of-N arbiter, SBT | ✅ built + deployed |
| Oracle resolution pipeline — multi-source quorum, autonomous resolver | ✅ |
| Market backend + RPC event indexer | ✅ |
| Frontend — 8 X Cup screens | ✅ |
| AI pundit (Hermes) | ✅ |
| Free-to-play — free picks, bracket, leaderboard, leagues, FanPass SBT | ✅ |
| Bonded-oracle hardening — `CupOracleV3` + `ArbiterMultisig` | ✅ deployed |
| `BracketNFT` | ✅ built + fork-tested · ⏳ not yet deployed |
| Product polish — onboarding, demo mode, Settings, connect modal, tooltips, confetti | ✅ |
| In-app documentation hub (Overview · Architecture · Integrations · API) | ✅ |

Per-plan implementation plans live in `docs/superpowers/plans/`.

## Live on X Layer mainnet (chain 196)

The **active stack** is the bonded-oracle V3 set. Full registry, roles and
verification inputs: `docs/xcup/CONTRACTS.md`.

| Contract | Address |
|---|---|
| `CupOracleV3` | `0x19da7aab20Be913fb697ebfef4b8f12Ac463Ebf6` |
| `ArbiterMultisig` | `0x792152c274c42C588D5551C9141C21106d3A2Cce` |
| `ParimutuelMarket` | `0x0431576845B77a743C87be323c04fad02201E08b` |
| `FanPassSBT` | `0x74F75532428A99E613a865C97D1084b7f38241BD` |

The pre-hardening `CupOracleV2` (`0xE4dFef03…`) and its V2-era `ParimutuelMarket`
(`0xdB4F6A0C…`) are **superseded** — see the "Superseded" table in `CONTRACTS.md`.

Bonds: 50 USDT · 1 h challenge window · 0% protocol fee · 1 h safety timelock.
Tests: **45 fork tests** (26 `ParimutuelMarket` + 19 `CupOracleV3` /
`ArbiterMultisig`) against a forked X Layer mainnet — `npm run contracts:test`.

## Key decisions (carry forward)

- **Mainnet only** — deploy target X Layer mainnet (chain 196); no public-testnet
  phase. De-risked via fork tests and small first runs.
- **Settlement token USDT**; staking in USDT/USDC/OKB — a non-USDT token is swapped
  to USDT in the user's wallet via the OKX DEX aggregator before staking.
- Outcome enum mirrors the oracle: **1=Home, 2=Draw, 3=Away**.
- Toolchain: **Hardhat 2** + `.cjs` config & tests (repo root is ESM); deploy
  scripts compile with the `solc` npm package (`^0.8.35`).
- **Mainnet writes are USER-GATED** — real OKB gas; autonomous writes are
  double-gated by `CUP_WRITE_API_ENABLED` + default-off `CUP_RESOLVER_ENABLED`.

## Remaining — user-gated operator steps (no code)

These need real OKB gas / a funded wallet and are intentionally not run
autonomously:

1. **Open markets on-chain** — markets read `market_not_created` until the operator
   opens them:
   `ENSURE_LIMIT=16 CUP_WRITE_API_ENABLED=true npm --prefix server run ensure:markets`
   (idempotent — existing markets are skipped).
2. **Verify the 4 contracts** on the OKX X Layer explorer — runbook:
   `docs/contract-verification.md` (single file · `solc` 0.8.35 · optimizer 200 · MIT).
3. **Deploy `BracketNFT`** to mainnet — `npm --prefix server run deploy:bracket-nft`,
   then set `BRACKET_NFT_ADDRESS` in `server/.env`.
4. *(optional)* Raise the arbiter from 1-of-1 to a **2-of-3** panel via the oracle's
   timelocked arbiter-change path.
5. **Hackathon submission** — record the demo video, create the submission X
   account, submit the Google Form.
