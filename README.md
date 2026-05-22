# 🏆 X Cup — World Cup Prediction Market on X Layer

**X Cup is the first real-money football prediction market on [X Layer](https://www.okx.com/xlayer) (OKX's zkEVM, chain 196).**

A fan opens the app, picks a World Cup outcome — *who wins, how many goals,
whether both teams score* — stakes a stablecoin into a shared **pari-mutuel
pool**, and claims a pro-rata share of that pool once the result is finalized
on-chain. No order book, no AMM, no house. Winners split the pool; the math is
pure, the result is economically defended, and every payout is a verifiable
on-chain transaction.

> Built for the **OKX X Layer × X Cup hackathon**. The full contract stack is
> **live on X Layer mainnet** — see [Deployed contracts](#deployed-contracts).

---

## Contents

- [What is X Cup](#what-is-x-cup)
- [How a pari-mutuel pool works](#how-a-pari-mutuel-pool-works)
- [The market lifecycle](#the-market-lifecycle)
- [Market types](#market-types)
- [Staking — pay with any token](#staking--pay-with-any-token)
- [The bonded settlement oracle](#the-bonded-settlement-oracle)
- [Multi-source result quorum](#multi-source-result-quorum)
- [Hermes — the AI pundit](#hermes--the-ai-pundit)
- [Free-to-play layer](#free-to-play-layer)
- [The 8 screens](#the-8-screens)
- [Open settlement layer — x402 & MCP](#open-settlement-layer--x402--mcp)
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

Most on-chain prediction markets are **infrastructure** — an order book or an
automated market maker that needs professional market-makers or locked
liquidity-provider capital before a single bet can be placed, and that exposes
those providers to losses. X Cup takes the opposite shape: it is a **vertical
consumer product** built around one mechanism that needs neither.

Three properties define it:

- **No house, no LP risk.** The pool funds itself. Nobody underwrites the bets,
  nobody can lose liquidity-provider capital, and there is no spread skimmed by a
  market maker.
- **Un-riggable money.** `claim()` is pure on-chain arithmetic over the staked
  pool. The operator never custodies stakes and cannot alter a payout.
- **An economically-defended result.** The only thing that has to be trustworthy
  is *which outcome won* — and X Cup secures that with a bonded oracle where
  proposing a false result costs real money (see
  [the oracle section](#the-bonded-settlement-oracle)).

The result: a fan can open X Cup, read a market, and bet within a minute, with
no counterparty, no custody, and a settlement path they can verify themselves.

---

## How a pari-mutuel pool works

Everyone who backs an outcome stakes into a **shared pool**. When the result is
final, the winning side splits the *entire* pool pro-rata to stake:

```
your payout  =  your stake  ×  payout pool  ÷  winning-outcome pool

payout pool  =  total pool  −  protocol fee      (fee is 0% on the live market)
```

**Worked example.** Three fans back **Home** with 10 USDT each; one fan backs
**Away** with 60 USDT. The total pool is **90 USDT**, the Home pool is 30 USDT.
Home wins:

- each Home backer claims `10 × 90 ÷ 30 = 30 USDT` (a 3× return on a 10 stake);
- the Away backer's 60 USDT is distributed to the winners.

**Edge cases are handled, not guessed:**

- **No winners** — if the winning outcome had no stakers, the market enters
  *refund mode* and every staker reclaims their full stake.
- **Voided match** — an abandoned, postponed or cancelled fixture is voided by
  the operator into *refund mode*; nobody loses anything to the protocol.
- **Rounding dust** — integer division leaves a few sub-cent units; the last
  winner to claim absorbs the remainder, so the pool always fully empties.
- **Anti-spam floor** — the market supports an optional `minStake` to keep dust
  bets out of a pool.

There is no fixed-odds book: the *implied odds* are simply each outcome pool's
share of the total, and they move as fans stake.

---

## The market lifecycle

Each market is a small state machine on `ParimutuelMarket`:

| State | What happens |
|---|---|
| **Created** | The operator opens a market for an upcoming fixture with a close time. |
| **Open** | Anyone stakes on an outcome with USDT/USDC/OKB. Staking is permissionless. |
| **Closed** | Staking closes a short buffer **before kickoff** (not at kickoff), so a bet can't land as the match starts. |
| **Settled** | After the oracle finalizes the result, anyone can call `settle()` — it reads the *finalized* outcome and fixes the payout pool. |
| **Claimed** | Each winner calls `claim()` once for their pro-rata share; settled-but-void markets refund every staker. |

`stake`, `settle` and `claim` are all **permissionless** — no operator is needed
to release winnings — and guarded by `nonReentrant` + checks-effects-interactions.
The market is **token-agnostic**: the live instance settles in USDT, but the
contract handles any standard or non-standard ERC-20.

---

## Market types

Every World Cup fixture carries **three independent pari-mutuel markets**, each
its own on-chain pool and its own oracle record:

| Market | Outcomes | Resolves on |
|---|---|---|
| **Match Result (1X2)** | Home · Draw · Away | The official final result. |
| **Over / Under 2.5 goals** | Over · Under | Total goals in the match — 3+ = Over, 2 or fewer = Under. |
| **Both Teams To Score** | Yes · No | Whether each side scored at least one goal. |

All three settle from the **same agreed final score**, so a fan can take a view
on the winner, the goal count, and both-teams-to-score independently on the same
fixture. Knockout fixtures are handled with care: a knockout match cannot end in
a draw, so if the feeds only carry a level regulation score the resolver **holds**
the Match Result market for operator settlement rather than ever publishing a
wrong "Draw". The full rule set is published in
[`SETTLEMENT-RULES.md`](docs/xcup/SETTLEMENT-RULES.md).

---

## Staking — pay with any token

A fan should not have to hold the exact settlement token to place a bet. X Cup
lets you **stake with USDT, USDC or OKB**:

1. Pick an outcome, an amount, and a token in the stake panel.
2. If the token is **not** the settlement USDT, the backend builds an unsigned
   swap through the **OKX DEX aggregator**: the chosen token is swapped to USDT
   **in your own wallet** (no custody — every step is user-signed).
3. The bet is staked at the swap's slippage-protected minimum, so it can never
   exceed what actually landed; any positive slippage stays with you.
4. The usual `approve` + `stake` follow, and the position appears in **My Bets**.

USDT stakes skip the swap and go straight to `approve` + `stake`. Every step is a
transaction the user signs in their own wallet.

---

## The bonded settlement oracle

A prediction market is only as good as its result feed. X Cup settles through
**`CupOracleV3`**, a **bonded optimistic oracle**.

An *optimistic* oracle assumes a proposed result is correct unless someone
challenges it. On its own that is just a trust assumption — so X Cup makes the
assumption **expensive to abuse** by attaching a slashable bond to it:

```
registerMatch ─▶ proposeResult ─▶ ┌─ no challenge ─▶ finalizeResult
                  (+ 50 USDT bond) │  (bond returned in full — no fee)
                                   │
                                   └─ challengeResult ─▶ ArbiterMultisig ─▶ resolveChallenge
                                       (+ equal bond)      rules            (loser's bond
                                                                             slashed to winner)
```

1. **Propose.** Anyone posts the result with a **50-USDT bond** and attests the
   multi-source evidence on-chain. A **~1-hour challenge window** opens.
2. **Challenge.** Anyone who believes the result is wrong posts an **equal bond**
   inside the window; the match routes to the arbiter.
3. **Arbitrate.** `ArbiterMultisig` — an M-of-N signer panel — rules. The
   **loser's bond is slashed to the winner**: a false proposal costs the proposer
   50 USDT, and an honest challenge is rewarded. The protocol fee on the slash is
   **0%**, so the whole loser's bond goes to the winner — maximum incentive to
   challenge a wrong result.
4. **Finalize.** Unchallenged after the window — or once arbitrated — the result
   is final and the proposer's bond is returned in full. `ParimutuelMarket` only
   ever reads the *finalized* result.

Additional guarantees:

- **Evidence on-chain.** Every match commits a `rulesHash` (binding it to the
  published rulebook), a `sourceHash`, an `evidenceHash` and an `evidenceUri`.
- **No instant admin override.** A guarded `flag()` + a safety **timelock**
  replaces any one-key emergency finalize — a live challenge window can never be
  silently overridden.
- **Swappable arbiter.** The oracle's arbiter address is timelock-upgradeable, so
  the M-of-N panel can grow without redeploying the oracle.
- **Compatible reads.** `getMatch()` keeps a stable layout, so `ParimutuelMarket`
  consumes the oracle without any market-side change.

The design rationale is documented in [`HARDENING-PLAN.md`](docs/xcup/HARDENING-PLAN.md).

---

## Multi-source result quorum

The oracle never settles on a single feed. The backend ingests **three
independent sports sources** — ESPN, football-data.org and TheSportsDB —
normalizes them, and a result is only eligible for settlement when **at least 2
of the 3 agree** on the same outcome (`evaluateSettlementQuorum`).

- If two or more agree → `settlement_ready`, and the autonomous resolver may
  propose it on-chain.
- If no two agree → the market is held in `conflicting_sources` and **does not
  settle** — no outcome is ever guessed.
- If too few sources have a result yet → `quorum_unavailable`, and the market
  waits.

Each source contributes a signed receipt (`provider`, `url`, `observedAt`,
`payloadHash`), and the proposer attests the source count on-chain alongside the
bond — so a false multi-source claim is itself slashable.

---

## Hermes — the AI pundit

**Hermes** is an autonomous, Claude-backed pundit. For every fixture it reads the
fixture context and the multi-source edge signal and issues a **conviction-weighted
pick** — Home, Draw or Away with a confidence score — or **passes** when it sees
no edge. Hermes is an *opponent to beat*, not betting advice: its picks are
scored against real results and shown head-to-head against every fan on the
Leaderboard and Bracket.

---

## Free-to-play layer

X Cup is playable end-to-end **without staking a cent** — a zero-risk on-ramp
that still teaches the product:

- **Bracket** — call the whole tournament: pick the winner of all 104 fixtures,
  save your bracket, and score it head-to-head against Hermes as results land. A
  completed bracket is mintable as a collectible NFT.
- **Leaderboard** — a global ranking by free-pick accuracy: you against every
  fan and against Hermes. It opens at the first settlement.
- **Leagues** — private competitions: create a league, share an invite code, and
  rank your friends on their own board.
- **FanPass** — a **soulbound** on-chain reputation badge. A football-IQ **score**
  is built from five inputs — x402 usage, cup interactions, on-chain activity,
  consistency and oracle participation — and unlocks tiers as real activity grows.

---

## The 8 screens

| Screen | What you do there |
|---|---|
| **Markets** | Browse every World Cup fixture × 3 market types; filter by status and market type; see live pool-implied odds. |
| **Market detail** | One market — the Hermes AI read, outcome buckets with odds, a stake panel (any token), a free no-stake pick, and the live oracle state. |
| **My Bets** | Your open and settled positions, claimable estimates, and one-tx Claim on winning bets. |
| **Bracket** | Pick all 104 fixtures, save your bracket, score it against Hermes, and mint a Bracket NFT. |
| **Leaderboard** | Global ranking by pick accuracy — you vs every fan vs the AI — plus private leagues. |
| **AI Pundit** | Every Hermes pick with its confidence and reasoning. |
| **FanPass** | Your on-chain football-IQ score, its five-part breakdown, and the soulbound badge. |
| **Developers** | The deployed contracts, the oracle source adapters, the on-chain settlement log, and the x402 / MCP surface. |

---

## Open settlement layer — x402 & MCP

X Cup is not a walled garden — its settlement data is a public good other apps
and AI agents can consume:

- **x402 paid endpoints.** Monetized data routes (`GET /api/v1/cup/ai-edge`,
  `/cup/fixtures`, `/cup/settlement-check`, …) are gated by an `X-PAYMENT` header
  and settle pay-per-call in USDT on X Layer. The machine-readable spec is at
  `GET /api/v1/x402-spec`.
- **MCP server.** Agent-readable tools are served at `POST /mcp` (JSON-RPC 2.0),
  with discovery via `GET /mcp` — an AI agent can query fixtures, the AI edge and
  oracle state directly.
- **Direct contract reads.** Finalized results are readable straight from
  `CupOracleV3.getMatch()`, and market state from `ParimutuelMarket.getMarket()`.

---

## OKX ecosystem integrations

| OKX surface | How X Cup uses it |
|---|---|
| **X Layer** (chain 196) | The entire contract stack — oracle, arbiter, market, badge — is deployed and live on X Layer mainnet. |
| **OKX DEX aggregator** | Powers *stake with any token*: the chosen token is swapped to the settlement USDT in the user's wallet before staking, using aggregated on-chain liquidity. |
| **OKX Wallet / OKX Connect** | Wallet connection — injected OKX Wallet on desktop, and OKX Connect (QR / deep link) for mobile browsers and Telegram. |
| **x402** | Pay-per-call data endpoints settled in USDT on X Layer — the open-data layer for agents and partner apps. |
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

- **Ingestion** — three real sports APIs are fetched, normalized and merged into
  one fixture feed; every match carries per-source receipts and evidence hashes.
- **Bonded resolver** — an autonomous, idempotent loop drives each market through
  `register → propose (+bond) → finalize`, one independently-observable
  transaction per pass, and routes a challenged result to the arbiter.
- **Market service + indexer** — a lightweight RPC log poller mirrors on-chain
  pool state into the cache the frontend reads (the X Layer public RPC caps
  `eth_getLogs` at 100 blocks, so the poller works in 90-block windows). The API
  returns honest `not-deployed` / `awaiting` states, never fabricated data.
- **AI pundit** — the Hermes service calls the Claude API per fixture; an
  optional scheduler can run it autonomously.
- **Frontend** — a React + Vite single-page app: the eight X Cup screens plus an
  XSight copilot surface, sharing the layout chrome and a per-tab error boundary.

---

## Deployed contracts

All on **X Layer mainnet (chain 196)** · explorer: `https://www.okx.com/web3/explorer/xlayer`.

| Contract | Address | Role |
|---|---|---|
| `CupOracleV3` | `0x19da7aab20Be913fb697ebfef4b8f12Ac463Ebf6` | Bonded optimistic settlement oracle |
| `ArbiterMultisig` | `0x792152c274c42C588D5551C9141C21106d3A2Cce` | M-of-N arbiter for challenged results |
| `ParimutuelMarket` | `0x0431576845B77a743C87be323c04fad02201E08b` | Pari-mutuel pools — settles in USDT, reads `CupOracleV3` |
| `FanPassSBT` | `0x74F75532428A99E613a865C97D1084b7f38241BD` | Soulbound fan-reputation badge |

`BracketNFT` is built and tested; the pre-hardening `CupOracleV2` + V2-era market
are superseded. Full registry, explorer links and verification inputs in
[`docs/xcup/CONTRACTS.md`](docs/xcup/CONTRACTS.md).

---

## Tech stack

- **Contracts** — Solidity `^0.8.24`, Hardhat. Pari-mutuel market, bonded oracle
  and M-of-N arbiter; `nonReentrant` + checks-effects-interactions throughout;
  USDT-safe (non-standard ERC-20) transfers.
- **Backend** — Node + Express + TypeScript, `ethers` v6. Multi-source ingestion,
  bonded quorum resolver, event indexer, x402 middleware, MCP server, deploy
  scripts.
- **Frontend** — React 18 + Vite + TypeScript + Tailwind CSS, `zustand` state,
  `motion` animations; OKX Wallet + OKX Connect.
- **AI** — the Hermes pundit runs on the Anthropic Claude API.
- **Chain** — X Layer mainnet (196); settlement in USDT, staking in USDT/USDC/OKB,
  gas in OKB.

---

## Run it locally

**Prerequisites:** Node 20+, an X Layer RPC URL, and — for write actions — a
funded X Layer wallet key. Sports-feed API keys are read from `server/.env`.

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
and USDC contracts — 26 tests for `ParimutuelMarket` (stake → settle → claim,
fees, refunds, re-entrancy, dust) and 19 for `CupOracleV3` / `ArbiterMultisig`
(bonded propose / challenge / slash, the timelocked manual fallback, and a full
lifecycle against the oracle).

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
| [`SETTLEMENT-RULES.md`](docs/xcup/SETTLEMENT-RULES.md) | The published settlement rulebook the on-chain `rulesHash` commits to. |
| [`HARDENING-PLAN.md`](docs/xcup/HARDENING-PLAN.md) | The bonded-oracle design and rationale. |
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
