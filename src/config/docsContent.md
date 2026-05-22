<!--TAB overview|Overview|compass-->

<!--ARTICLE what-is-x-cup|What is X Cup-->

X Cup is the first real-money World Cup prediction market on **X Layer**, OKX's
zkEVM (chain 196).

A fan picks a World Cup outcome — who wins, how many goals, whether both teams
score — and stakes a stablecoin into a shared **pari-mutuel pool**. When the
result is finalized on-chain, the winning side splits the entire pool pro-rata to
stake. No order book, no AMM, no house.

Only one thing has to be trustworthy: which outcome won. X Cup secures that with a
**bonded optimistic oracle** — proposing a false result costs a slashable 50-USDT
bond — backed by a 2-of-3 quorum over three independent sports feeds.

```text
   FAN  ──stake USDT/USDC/OKB──▶  POOL (open)  ──2-of-3 feeds agree──▶  ORACLE propose
    ▲                                                                    (+50 bond)
    │                                                                        │
    └────── pro-rata claim() ◀────── POOL (settled) ◀──── finalized ──────────┘
            your stake × pool ÷ winning stake
```

## What makes it different

Most on-chain prediction markets are infrastructure — an order book or an AMM that
needs professional market-makers or locked liquidity-provider capital before a
single bet is placed. X Cup is the opposite: a vertical consumer product built on
one mechanism that needs neither.

- **No house, no LP risk** — the pool funds itself; nobody underwrites the bets.
- **Un-riggable money** — `claim()` is pure on-chain arithmetic; the operator
  never custodies stakes and cannot alter a payout.
- **An economically-defended result** — a false result is challengeable, and the
  liar's bond pays the honest challenger.

> New here? Open the [Markets tab](tab:markets) to browse live fixtures, or read
> "How a pari-mutuel pool works" next to understand the payout math.

<!--ARTICLE pari-mutuel|How a pari-mutuel pool works-->

Everyone who backs an outcome stakes into a **shared pool**. When the result is
final, the winning side splits the entire pool pro-rata to stake:

```text
your payout  =  your stake  ×  payout pool  ÷  winning-outcome pool
payout pool  =  total pool  −  protocol fee     (fee is 0% on the live market)
```

## Worked example

Three fans back **Home** with 10 USDT each; one fan backs **Away** with 60 USDT.
The total pool is 90 USDT and the Home pool is 30 USDT. Home wins:

- each Home backer claims `10 × 90 ÷ 30 = 30 USDT` — a 3× return on a 10 stake;
- the Away backer's 60 USDT is distributed to the winners.

There is no fixed-odds book: the implied odds are simply each outcome pool's share
of the total, and they move as fans stake.

## Edge cases — handled, not guessed

- **No winners** — if the winning outcome had no stakers, the market enters refund
  mode and every staker reclaims their full stake.
- **Voided match** — an abandoned, postponed or cancelled fixture is voided into
  refund mode; nobody loses anything to the protocol.
- **Rounding dust** — integer division leaves a few sub-cent units; the last
  winner to claim absorbs the remainder, so the pool always fully empties.
- **Anti-spam floor** — an optional `minStake` keeps dust bets out of a pool.

<!--ARTICLE getting-started|Getting started-->

X Cup is playable in two ways — with no wallet at all, or with a wallet for
real-money staking.

## Explore with no wallet

Every read-only screen works immediately, and you can make a **free pick** on any
fixture — a zero-risk prediction scored against real results. Open the
[Markets tab](tab:markets) and pick a match.

## Connect a wallet to stake

1. Click **Connect** in the top bar. On desktop the OKX Wallet extension opens; on
   mobile or Telegram you scan a QR with OKX Wallet via OKX Connect.
2. X Cup runs on **X Layer (chain 196)**. The wallet adds the network
   automatically — you only need a little **OKB** for gas.
3. Open a market, pick an outcome and an amount, choose a stake token
   (USDT, USDC or OKB), then `approve` and `stake`.
4. Your position appears in [My Bets](tab:bets). After the match settles, a
   winning bet shows a one-transaction **Claim**.

> You never hand custody to anyone. Every approve, stake, swap and claim is a
> transaction you sign in your own wallet.

<!--ARTICLE free-to-play|The free-to-play layer-->

X Cup is playable end to end **without staking a cent** — a zero-risk on-ramp that
still teaches the whole product.

- **Free picks** — predict any fixture with no stake; picks are scored against the
  real result.
- **Bracket** — call the whole tournament: pick the winner of all 104 fixtures,
  save your bracket, and score it head-to-head against Hermes as results land. A
  completed bracket is mintable as a collectible NFT.
- **Leaderboard** — a global ranking by free-pick accuracy: you against every fan
  and against Hermes, the AI pundit.
- **Leagues** — private competitions: create a league, share an invite code, and
  rank your friends on their own board.
- **FanPass** — a soulbound on-chain reputation badge. A football-IQ score is
  built from five inputs and unlocks tiers as real activity grows.

This is the path a judge or first-time visitor can walk with no wallet, no funds
and no risk — and still see every screen working.

<!--ARTICLE the-screens|Product tour — the 8 screens-->

| Screen | What you do there |
|---|---|
| **Markets** | Browse every fixture × 3 market types; filter by status and type; see live pool-implied odds. |
| **Market detail** | One market — the Hermes AI read, outcome buckets, a stake panel, a free pick, the live oracle state. |
| **My Bets** | Your open and settled positions, claimable estimates, one-transaction Claim. |
| **Bracket** | Pick all 104 fixtures, save your bracket, score it against Hermes, mint a Bracket NFT. |
| **Leaderboard** | Global ranking by pick accuracy — you vs every fan vs the AI — plus private leagues. |
| **AI Pundit** | Every Hermes pick with its confidence and reasoning. |
| **FanPass** | Your on-chain football-IQ score, its five-part breakdown, and the soulbound badge. |
| **Developers** | The deployed contracts, oracle source adapters, the on-chain settlement log, and the x402 / MCP surface. |

A first-run walkthrough, a demo mode for visitors with no wallet, a Settings panel
and a guided wallet connect modal make the product approachable from the first
second.

<!--TAB architecture|Architecture|layers-->

<!--ARTICLE system-overview|System overview-->

X Cup is three layers — a React frontend, a Node backend, and the on-chain
contract stack — meeting at X Layer mainnet.

```text
Fans (React + OKX Wallet / OKX Connect)      Backend (Node / Express)
  browse markets · stake any token             multi-source ingestion · bonded resolver
  claim winnings · play free-to-play           market service · event indexer · AI pundit
        │                                              │  signed operator txs / chain reads
        ▼                                              ▼
X Layer mainnet (chain 196)  ◀──────────────────  Event indexer (getLogs → cache)
  CupOracleV3 · ArbiterMultisig · ParimutuelMarket · FanPassSBT
  real USDT / USDC / OKB
```

## The layers

- **Ingestion** — three real sports APIs are fetched, normalized and merged into
  one fixture feed; every match carries per-source receipts and evidence hashes.
- **Bonded resolver** — an autonomous, idempotent loop drives each market through
  register → propose (+bond) → finalize, one independently-observable transaction
  per pass, and routes a challenged result to the arbiter.
- **Market service + indexer** — a lightweight RPC log poller mirrors on-chain
  pool state into the cache the frontend reads. The API returns honest
  `not-deployed` / `awaiting` states, never fabricated data.
- **AI pundit** — the Hermes service calls the Claude API per fixture; an optional
  scheduler can run it autonomously.
- **Frontend** — a React + Vite single-page app: the eight X Cup screens, sharing
  the layout chrome and a per-tab error boundary.

> Principle: no mocks. Every layer uses real components — un-deployed pieces
> surface honest `not deployed` / `awaiting` states rather than fabricated data.

<!--ARTICLE market-lifecycle|The market lifecycle-->

Each market is a small state machine on the `ParimutuelMarket` contract.

| State | What happens |
|---|---|
| **Created** | The operator opens a market for an upcoming fixture with a close time. |
| **Open** | Anyone stakes on an outcome with USDT/USDC/OKB. Staking is permissionless. |
| **Closed** | Staking closes a short buffer before kickoff — a bet can't land as the match starts. |
| **Settled** | After the oracle finalizes the result, anyone calls `settle()` — it reads the finalized outcome and fixes the payout pool. |
| **Claimed** | Each winner calls `claim()` once for their pro-rata share; void markets refund every staker. |

`stake`, `settle` and `claim` are all **permissionless** — no operator is needed
to release winnings — and guarded by `nonReentrant` plus checks-effects-interactions.

The market is **token-agnostic**: the live instance settles in USDT, but the
contract handles any standard or non-standard ERC-20.

## Three markets per fixture

Every fixture carries three independent pari-mutuel markets, each its own pool and
oracle record:

| Market | Outcomes | Resolves on |
|---|---|---|
| Match Result (1X2) | Home · Draw · Away | The official final result. |
| Over / Under 2.5 | Over · Under | Total goals — 3+ = Over, 2 or fewer = Under. |
| Both Teams To Score | Yes · No | Whether each side scored at least one goal. |

<!--ARTICLE bonded-oracle|The bonded settlement oracle-->

X Cup settles through `CupOracleV3`, a **bonded optimistic oracle**. An optimistic
oracle assumes a proposed result is correct unless challenged — so X Cup makes
abuse expensive by attaching a slashable bond.

```text
registerMatch ─▶ proposeResult ─▶ ┌─ no challenge ─▶ finalizeResult
                  (+ 50 USDT bond) │  (bond returned in full — no fee)
                                   │
                                   └─ challengeResult ─▶ ArbiterMultisig ─▶ resolveChallenge
                                       (+ equal bond)      rules            (loser's bond
                                                                             slashed to winner)
```

1. **Propose** — anyone posts the result with a 50-USDT bond and attests the
   multi-source evidence on-chain. A ~1-hour challenge window opens.
2. **Challenge** — anyone who believes the result is wrong posts an equal bond
   inside the window; the match routes to the arbiter.
3. **Arbitrate** — `ArbiterMultisig`, an M-of-N signer panel, rules. The loser's
   bond is slashed to the winner; the protocol fee on the slash is 0%.
4. **Finalize** — unchallenged after the window, or once arbitrated, the result is
   final and the proposer's bond is returned. The market only ever reads the
   finalized result.

## Extra guarantees

- Every match commits a `rulesHash`, `sourceHash`, `evidenceHash` and
  `evidenceUri` on-chain.
- A guarded `flag()` plus a safety timelock replaces any one-key emergency
  override — a live challenge window can never be silently overridden.
- The arbiter address is timelock-upgradeable, so the signer panel can grow
  without redeploying the oracle.

<!--ARTICLE quorum|Multi-source result quorum-->

The oracle never settles on a single feed. The backend ingests **three independent
sports sources** — ESPN, football-data.org and TheSportsDB — normalizes them, and
a result is only eligible for settlement when at least **2 of the 3 agree** on the
same outcome.

| Quorum state | Meaning |
|---|---|
| `settlement_ready` | Two or more sources agree — the resolver may propose on-chain. |
| `conflicting_sources` | No two agree — the market is held and does not settle. |
| `quorum_unavailable` | Too few sources have a result yet — the market waits. |

No outcome is ever guessed. Each source contributes a signed receipt — `provider`,
`url`, `observedAt`, `payloadHash` — and the proposer attests the source count
on-chain alongside the bond, so a false multi-source claim is itself slashable.

Knockout fixtures are handled with care: a knockout match cannot end in a draw, so
if the feeds only carry a level regulation score the resolver holds the Match
Result market for operator settlement rather than ever publishing a wrong "Draw".

<!--ARTICLE hermes|Hermes — the AI pundit-->

**Hermes** is an autonomous, Claude-backed pundit. For every fixture it reads the
context and the multi-source edge signal and issues a **conviction-weighted pick**
— Home, Draw or Away with a confidence score — or **passes** when it sees no edge.

Hermes is an opponent to beat, not betting advice. Its picks are scored against
real results and shown head-to-head against every fan on the
[Leaderboard](tab:leaderboard) and [Bracket](tab:bracket).

The Hermes service calls the Claude API per fixture; an optional scheduler can run
it autonomously so picks are always current. Every pick, with its confidence and
reasoning, is visible on the [AI Pundit](tab:pundit) screen.

<!--TAB integrations|Integrations|plug-->

<!--ARTICLE x-layer|X Layer-->

X Cup runs entirely on **X Layer**, OKX's zkEVM rollup — **chain 196**.

The full contract stack — `CupOracleV3`, `ArbiterMultisig`, `ParimutuelMarket` and
`FanPassSBT` — is deployed and live on X Layer mainnet. There is no separate
testnet code path: the project is mainnet-only, de-risked through fork tests and
small first runs.

- **Settlement token** — USDT on X Layer.
- **Gas token** — OKB.
- **Explorer** — every contract, stake, bond and payout is verifiable in the OKX
  X Layer explorer.

The full registry with explorer links is in the API & Contracts section, and live
contract status is on the [Developers screen](tab:developers).

<!--ARTICLE okx-dex|OKX DEX aggregator-->

A fan should not need the exact settlement token to place a bet. X Cup uses the
**OKX DEX aggregator** to power *stake with any token*.

1. Pick an outcome, an amount and a token in the stake panel.
2. If the token is not the settlement USDT, the backend builds an unsigned swap
   through the OKX DEX aggregator: the chosen token is swapped to USDT **in your
   own wallet** — no custody, every step user-signed.
3. The bet is staked at the swap's slippage-protected minimum, so it can never
   exceed what actually landed; any positive slippage stays with you.
4. The usual `approve` and `stake` follow.

USDT stakes skip the swap entirely and go straight to `approve` + `stake`.

<!--ARTICLE okx-wallet|OKX Wallet & OKX Connect-->

X Cup connects through the OKX wallet stack, covering every device with one
button.

- **OKX Wallet (desktop)** — the injected browser extension. The connect flow
  detects it and requests accounts directly.
- **OKX Connect (mobile & Telegram)** — when no wallet is injected, X Cup opens
  OKX Connect: a QR code on desktop, a deep link on mobile and inside Telegram.

Either way the session opens on X Layer; the connect modal explains chain 196 and
points a new user to OKB for gas before they connect. The app never auto-connects
— connecting is always an explicit user action.

<!--ARTICLE x402|x402 paid data-->

X Cup's settlement data is a public good that other apps and AI agents can consume
— monetized through **x402**, the pay-per-call HTTP payment standard.

- Paid routes such as `/api/v1/cup/ai-edge`, `/cup/fixtures` and
  `/cup/settlement-check` are gated by an `X-PAYMENT` header.
- Each call settles pay-per-call in USDT on X Layer.
- The machine-readable spec is published at `GET /api/v1/x402-spec`.

This turns X Cup from a closed app into an open settlement layer: any agent that
can pay a few cents in USDT can read the AI edge, the fixture feed or an oracle
state check. The x402 API endpoints page lists every route.

<!--ARTICLE okb|OKB-->

**OKB** is OKX's exchange token and the native gas token of X Layer.

In X Cup, OKB plays two roles:

- **Gas** — every transaction on X Layer (chain 196) is paid in OKB. A small
  balance is all a fan needs to stake, claim or save a bracket.
- **A first-class stake token** — a fan can stake with OKB directly. Because the
  pari-mutuel pool settles in USDT, the OKX DEX aggregator swaps the OKB to USDT in
  the user's wallet before the stake.

The connect modal links a new user to where they can acquire OKB for gas.

<!--TAB api|API & Contracts|code-->

<!--ARTICLE contracts|Deployed contracts-->

The full X Cup stack is live on **X Layer mainnet (chain 196)**. Every address
below is clickable to the explorer.

| Contract | Role |
|---|---|
| [CupOracleV3](https://www.okx.com/web3/explorer/xlayer/address/0x19da7aab20Be913fb697ebfef4b8f12Ac463Ebf6) | Bonded optimistic settlement oracle |
| [ArbiterMultisig](https://www.okx.com/web3/explorer/xlayer/address/0x792152c274c42C588D5551C9141C21106d3A2Cce) | M-of-N arbiter for challenged results |
| [ParimutuelMarket](https://www.okx.com/web3/explorer/xlayer/address/0x0431576845B77a743C87be323c04fad02201E08b) | Pari-mutuel pools — settles in USDT, reads `CupOracleV3` |
| [FanPassSBT](https://www.okx.com/web3/explorer/xlayer/address/0x74F75532428A99E613a865C97D1084b7f38241BD) | Soulbound fan-reputation badge |

```text
CupOracleV3       0x19da7aab20Be913fb697ebfef4b8f12Ac463Ebf6
ArbiterMultisig   0x792152c274c42C588D5551C9141C21106d3A2Cce
ParimutuelMarket  0x0431576845B77a743C87be323c04fad02201E08b
FanPassSBT        0x74F75532428A99E613a865C97D1084b7f38241BD
```

`BracketNFT` is built and fork-tested. Live status for every contract is on the
[Developers screen](tab:developers).

<!--ARTICLE x402-endpoints|x402 API endpoints-->

X Cup exposes its settlement data as **x402 paid endpoints** — HTTP routes gated
by an `X-PAYMENT` header that settle pay-per-call in USDT on X Layer.

| Endpoint | Returns |
|---|---|
| `GET /api/v1/cup/ai-edge` | The Hermes AI edge signal for a fixture. |
| `GET /api/v1/cup/fixtures` | The normalized multi-source fixture feed. |
| `GET /api/v1/cup/settlement-check` | The quorum / settlement state for a market. |
| `GET /api/v1/x402-spec` | The machine-readable spec of every paid route. |

A caller without a valid payment receives an HTTP 402 with payment instructions; a
caller with a valid `X-PAYMENT` header receives the data. Start from
`/api/v1/x402-spec` — it describes every route, its price and its schema.

<!--ARTICLE mcp|MCP server for agents-->

X Cup ships a **Model Context Protocol (MCP) server** so AI agents can read
fixtures, the AI edge and oracle state as native tools.

- **Endpoint** — `POST /mcp` (JSON-RPC 2.0).
- **Discovery** — `GET /mcp` lists the available tools and their schemas.

An agent connected to the MCP server can query the fixture feed, the Hermes edge
and a market's settlement state directly, without scraping the UI — the same data
the app itself runs on.

<!--ARTICLE reading-state|Reading on-chain state-->

Finalized results and market state are public on X Layer — no API key, no
backend, no trust in X Cup required.

- **Finalized results** — read straight from `CupOracleV3.getMatch(matchId)`. It
  returns the finalized outcome and state with a stable layout.
- **Market state** — read `ParimutuelMarket.getMarket(marketId)` for pool sizes,
  status and the settled outcome.

Because `getMatch()` keeps a compatible layout, `ParimutuelMarket` consumes the
oracle without any market-side change — and so can any third-party contract or
indexer. The [Developers screen](tab:developers) shows this state live, read
directly from the chain.
