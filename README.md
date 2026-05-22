# 🏆 X Cup — World Cup Prediction Market on X Layer

**X Cup is the first real-money football prediction market on [X Layer](https://www.okx.com/xlayer) (OKX's zkEVM, chain 196).**
Fans stake on FIFA World Cup outcomes — *who wins, how many goals, both teams to
score* — into **pari-mutuel pools**, and claim pro-rata winnings once a **bonded
multi-source oracle** finalizes the result on-chain. No order book, no AMM, no
house — winners simply split the pool.

> Built for the **OKX X Layer × X Cup hackathon**. The full contract stack is
> **live on X Layer mainnet** (see [Deployed contracts](#deployed-contracts)).

---

## Contents

- [What is X Cup](#what-is-x-cup)
- [Features](#features)
- [The 8 screens](#the-8-screens)
- [How settlement works — the bonded oracle](#how-settlement-works--the-bonded-oracle)
- [OKX ecosystem integrations](#okx-ecosystem-integrations)
- [Architecture](#architecture)
- [Deployed contracts](#deployed-contracts)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Principles](#principles)

---

## What is X Cup

Most prediction markets are **infrastructure** — an order book or an AMM that
needs professional market-makers or locked LP capital before anyone can bet.
X Cup is a **vertical consumer product**: a clean app a football fan can open,
read, and bet in within a minute.

It uses a **pari-mutuel** mechanism — everyone who backs an outcome stakes into a
shared pool, and the winning side splits the *whole* pool pro-rata:

```
your payout = your stake × total pool ÷ winning-outcome pool
```

There is **no house and no LP risk**: the pool funds itself, and `claim()` is
pure on-chain arithmetic the operator can never touch. The only thing that has
to be trustworthy is **the result** — and that is what the bonded oracle solves
(see [below](#how-settlement-works--the-bonded-oracle)).

---

## Features

| Feature | What it does |
|---|---|
| **Multi-outcome markets** | Every fixture carries three pari-mutuel markets — **Match Result (1X2)**, **Over/Under 2.5 goals**, **Both Teams To Score** — each a separate on-chain pool. |
| **Stake with any token** | Stake in USDT, USDC or OKB. A non-USDT token is swapped to the settlement USDT in your own wallet via the **OKX DEX aggregator**, then approve + stake — no manual swapping. |
| **Bonded optimistic oracle** | Results are proposed with a slashable USDT bond, challenged inside a window, and arbitrated — a false result costs the proposer money. |
| **Multi-source quorum** | A result settles only when **≥2 of 3** independent sports feeds (ESPN, football-data.org, TheSportsDB) agree. |
| **Hermes — AI pundit** | An autonomous Claude-backed pundit publishes a conviction-weighted pick on every fixture. Beat the bot. |
| **Free-to-play** | A full-tournament **Bracket**, a global **Leaderboard**, private **Leagues**, and a soulbound **FanPass** football-IQ badge — all playable without staking. |
| **Open settlement layer** | Read finalized results straight from the oracle; **x402** pay-per-call data endpoints and an **MCP** server make X Cup consumable by other apps and AI agents. |
| **OKX Wallet + OKX Connect** | Desktop OKX Wallet injection, plus OKX Connect (QR / deep link) for mobile and Telegram. |

---

## The 8 screens

| Screen | What you do there |
|---|---|
| **Markets** | Browse every World Cup fixture × 3 market types; filter by status and market type; see pool-implied odds. |
| **Market detail** | One market — the Hermes AI read, outcome buckets with odds, a stake panel (any token), a free no-stake pick, and the live oracle state. |
| **My Bets** | Your open and settled positions, claimable estimates, and one-tx Claim on winning bets. |
| **Bracket** | Pick the winner of all 104 fixtures, save your bracket on-chain, and score it head-to-head against Hermes; mint a Bracket NFT. |
| **Leaderboard** | Global ranking by pick accuracy — you vs every fan vs the AI — plus private leagues. |
| **AI Pundit** | Every Hermes pick with its confidence and reasoning. |
| **FanPass** | Your on-chain football-IQ score, its breakdown, and the soulbound `FanPass` badge. |
| **Developers** | The deployed contracts, the oracle source adapters, the on-chain settlement log, and the x402 / MCP surface. |

---

## How settlement works — the bonded oracle

A prediction market is only as good as its result feed. X Cup settles through
**`CupOracleV3`**, a bonded optimistic oracle modelled on the UMA pattern (UMA is
not deployed on X Layer, so X Cup re-implements the pattern natively):

```
registerMatch ─▶ proposeResult ─▶ ┌─ no challenge ─▶ finalizeResult
                  (+ USDT bond)   │   (bond returned in full)
                                  └─ challengeResult ─▶ ArbiterMultisig ─▶ resolveChallenge
                                      (+ equal bond)      rules            (loser's bond
                                                                            slashed to winner)
```

1. **Propose** — anyone posts the result with a **50-USDT bond** and attests the
   multi-source evidence. A ~1-hour **challenge window** opens.
2. **Challenge** — anyone who thinks the result is wrong posts an **equal bond**;
   the match routes to the arbiter.
3. **Arbitrate** — `ArbiterMultisig` (an M-of-N panel) rules. The **loser's bond
   is slashed to the winner** — a false proposal is economically punished.
4. **Finalize** — unchallenged after the window, or once arbitrated, the result
   is final. `ParimutuelMarket` only ever reads the *finalized* result.

A published [rulebook](docs/xcup/SETTLEMENT-RULES.md) (`rulesHash` on-chain) fixes
the edge cases — extra time, penalties, abandoned/void matches, VAR — and a
guarded `flag()` + timelock replaces any instant admin override. The full
rationale and the comparison against Polymarket / Azuro / Overtime is in
[`HARDENING-PLAN.md`](docs/xcup/HARDENING-PLAN.md).

---

## OKX ecosystem integrations

| OKX surface | How X Cup uses it |
|---|---|
| **X Layer** (chain 196) | The whole contract stack is deployed and live on X Layer mainnet; gas is paid in OKB. |
| **OKX DEX aggregator** | Powers *stake with any token* — the picked token is swapped to the settlement USDT in the user's wallet before staking. |
| **OKX Wallet / OKX Connect** | Wallet connection — injected OKX Wallet on desktop, OKX Connect (QR / deep link) for mobile and Telegram. |
| **x402** | Monetized data endpoints (`/api/v1/cup/*`) gated by an `X-PAYMENT` header — pay-per-call in USDT on X Layer. |
| **OKB** | A first-class stake token (swapped to USDT for settlement) and the X Layer gas token. |

---

## Architecture

```
Fans (React + OKX Wallet / OKX Connect)      Backend (Node / Express)
  browse markets · stake any token             multi-source ingestion · bonded resolver
  claim winnings · play free-to-play           market service · event indexer · AI pundit
        │                                              │  signed operator txs / chain reads
        ▼                                              ▼
X Layer mainnet (chain 196)  ◀──────────────────  Event indexer (getLogs → cache)
  CupOracleV3 · ArbiterMultisig · ParimutuelMarket · FanPassSBT
  real USDT / USDC / OKB
```

- **Ingestion** — three real sports APIs are fetched, normalized and merged into a
  fixture feed; every match carries per-source receipts and evidence hashes.
- **Bonded resolver** — an autonomous, idempotent loop drives each market through
  `register → propose(+bond) → finalize`, one observable transaction at a time.
- **Market service + indexer** — a lightweight RPC log poller mirrors on-chain
  pool state into the cache the frontend reads; the API returns honest
  `not-deployed` / `awaiting` states, never fabricated data.
- **Frontend** — a React + Vite single-page app; eight X Cup screens plus the
  XSight copilot surface, sharing the layout chrome.

---

## Deployed contracts

All on **X Layer mainnet (chain 196)** · explorer: `https://www.okx.com/web3/explorer/xlayer`.

| Contract | Address | Role |
|---|---|---|
| `CupOracleV3` | `0x19da7aab20Be913fb697ebfef4b8f12Ac463Ebf6` | Bonded optimistic settlement oracle |
| `ArbiterMultisig` | `0x792152c274c42C588D5551C9141C21106d3A2Cce` | Arbiter for challenged results |
| `ParimutuelMarket` | `0x0431576845B77a743C87be323c04fad02201E08b` | Pari-mutuel pools (settles in USDT, reads `CupOracleV3`) |
| `FanPassSBT` | `0x74F75532428A99E613a865C97D1084b7f38241BD` | Soulbound fan-reputation badge |

The pre-hardening `CupOracleV2` + V2-era market are superseded — full registry,
explorer links and verification inputs in [`docs/xcup/CONTRACTS.md`](docs/xcup/CONTRACTS.md).

---

## Tech stack

- **Contracts** — Solidity `^0.8.24`, Hardhat; pari-mutuel market + bonded oracle +
  M-of-N arbiter, `nonReentrant` + CEI throughout.
- **Backend** — Node + Express + TypeScript, `ethers` v6; multi-source ingestion,
  bonded quorum resolver, event indexer, x402 middleware, MCP server.
- **Frontend** — React 18 + Vite + TypeScript + Tailwind, `zustand` state, `motion`.
- **AI** — the Hermes pundit runs on the Anthropic Claude API.
- **Chain** — X Layer mainnet (196); settlement in USDT, staking in USDT/USDC/OKB.

---

## Run it locally

**Prerequisites:** Node 20+, an X Layer RPC URL, and (for write actions) a funded
X Layer wallet key. Sports-feed API keys are read from `server/.env`.

```bash
# 1. install dependencies (root = frontend + contracts, server = backend)
npm install && npm --prefix server install

# 2. configure — copy the template and fill it; never commit the real .env
cp server/.env.example server/.env

# 3. start the backend  → http://localhost:8787
npm run server:dev

# 4. start the frontend → http://localhost:5173  (proxies /api to the backend)
npm run dev
```

The app opens on **Markets**. With no wallet connected every read-only screen
still works; staking, claiming and bracket-saving prompt a wallet connection.

---

## Testing

```bash
npm run contracts:compile     # Hardhat compile
npm run contracts:test        # 45 fork tests against a forked X Layer mainnet
npm --prefix server run typecheck
npm run build                 # frontend typecheck + production build
```

**No mocks.** Contract tests fork X Layer mainnet and run against the *real* USDT
and USDC contracts — 26 tests for `ParimutuelMarket` and 19 for
`CupOracleV3` / `ArbiterMultisig` (bonded propose / challenge / slash, the
timelocked fallback, and a full stake → settle → claim lifecycle).

Mainnet deploy + verification are **user-gated** steps:
`npm --prefix server run deploy:cup-oracle-v3`, then `deploy:parimutuel` — see
[`docs/xcup/CONTRACTS.md`](docs/xcup/CONTRACTS.md).

---

## Project structure

```
contracts/      CupOracleV3 · ArbiterMultisig · ParimutuelMarket · FanPassSBT · BracketNFT
  test/         fork-based test suites (real X Layer mainnet, no mocks)
server/         Express API — ingestion, bonded resolver, market service + indexer,
                AI pundit, x402 + MCP; deploy scripts under server/scripts/
src/            React + Vite frontend — 8 X Cup screens + XSight copilot surface
docs/xcup/      product, architecture and contract documentation
```

---

## Documentation

| Doc | What's inside |
|---|---|
| [`GUIDE.md`](docs/xcup/GUIDE.md) | How to use X Cup as a fan, build on it as a developer, and a FAQ. |
| [`DESIGN.md`](docs/xcup/DESIGN.md) | Full system architecture and data flows. |
| [`CONTRACTS.md`](docs/xcup/CONTRACTS.md) | Contract registry, addresses, explorer links, verification inputs. |
| [`SETTLEMENT-RULES.md`](docs/xcup/SETTLEMENT-RULES.md) | The published settlement rulebook the `rulesHash` commits to. |
| [`HARDENING-PLAN.md`](docs/xcup/HARDENING-PLAN.md) | The bonded-oracle design + comparison against market leaders. |
| [`UI-SPEC.md`](docs/xcup/UI-SPEC.md) | Per-tab UI spec — expected content and error behaviour. |
| [`BUILD-STATUS.md`](docs/xcup/BUILD-STATUS.md) | What is built, deployed and outstanding. |

---

## Principles

- **No mocks** — every layer uses real components; un-deployed pieces surface
  honest `not deployed` / `awaiting` states rather than fabricated data.
- **Mainnet-only** — X Layer mainnet (196); de-risked via fork tests and small
  first runs, not a separate testnet code path.
- **Money is un-riggable** — payouts are pure on-chain math; the result is
  defended by slashable bonds.
- **Autonomous on-chain writes are double-gated** and default-off.

## License

[MIT](LICENSE).
