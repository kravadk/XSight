# X Cup — World Cup Prediction Market on X Layer

> The first real-money football prediction market on X Layer. Stake USDT/USDC on World
> Cup outcomes into pari-mutuel pools, settled by a trustless multi-source oracle — with
> an autonomous AI pundit to beat.

**Built for the OKX X Layer × X Cup hackathon.**

X Cup is a vertical product, not an infrastructure layer: fans browse live World Cup
markets, stake stablecoin into pari-mutuel pools, and claim pro-rata winnings once a
domain-specific oracle finalizes the result on-chain. No order book, no AMM, no house —
winners simply split the pool.

## Why on-chain

Without trustless resolution, leaderboards and payouts are "trust us." X Cup's
`CupOracleV2` anchors each result with multi-source evidence hashes and an optimistic
challenge window; `ParimutuelMarket` only ever reads the *finalized* result. The outcome
and the money are un-riggable — even by the operator. That's the premise, not a garnish.

## How it works

```
Fans (React + OKX Wallet)            Backend (Node / Express)
  browse markets · approve+stake       multi-source ingestion · quorum resolver
  claim winnings                       market service · event indexer · AI pundit
        │                                      │  signed operator txs / reads
        ▼                                      ▼
X Layer mainnet (196)  ◀────────────────  Event indexer (getLogs → cache)
  CupOracleV2 · ParimutuelMarket
  real USDT / USDC
```

1. **Ingestion** — 3 real sports sources (ESPN, football-data.org, TheSportsDB) are
   normalized and merged; each match carries source receipts + evidence hashes.
2. **Quorum resolver** — a finished match with a 2-of-N source agreement flows
   `registerMatch → proposeResult → (challenge window) → finalizeResult` on `CupOracleV2`.
3. **Market** — `ParimutuelMarket` holds the stablecoin, gates staking at kickoff, and
   settles pro-rata by reading the oracle's finalized outcome.
4. **Indexer** — a lightweight RPC log poller mirrors on-chain market state into the
   cache the frontend reads.
5. **Hermes** — an autonomous Claude-backed AI pundit issues a conviction-weighted pick
   on every fixture.

## Monorepo layout

| Path | What |
|---|---|
| `contracts/` | `ParimutuelMarket.sol`, `CupOracleV2.sol`, `FanPassSBT.sol` + fork tests |
| `server/` | Express API — ingestion, quorum resolver, market service + indexer, pundit |
| `src/` | React + Vite frontend — 8 X Cup screens, World Cup theme |
| `docs/xcup/` | [`DESIGN.md`](docs/xcup/DESIGN.md) · [`BUILD-STATUS.md`](docs/xcup/BUILD-STATUS.md) · [`CONTRACTS.md`](docs/xcup/CONTRACTS.md) |

## Run it locally

```bash
# 1. install
npm install && npm --prefix server install

# 2. configure — copy and fill the env templates (never commit the real .env)
cp server/.env.example server/.env

# 3. backend (http://localhost:8787)
npm run server:dev

# 4. frontend (http://localhost:5173 — proxies /api to the backend)
npm run dev
```

### Contracts

```bash
npm run contracts:compile          # Hardhat compile
npm run contracts:test             # 23 fork tests vs real X Layer mainnet
```

Contract tests run against a **forked X Layer mainnet** — the real `CupOracleV2` and the
real USDT + USDC contracts, no mocks. Mainnet deploy + verification are user-gated steps
(`npm --prefix server run deploy:parimutuel`); see [`docs/xcup/CONTRACTS.md`](docs/xcup/CONTRACTS.md).

## Contracts

| Contract | Status |
|---|---|
| `CupOracleV2` | Deployed — `0xE4dFef03E107225f2239CFfF955a378A9a8158Be` (X Layer 196) |
| `ParimutuelMarket` | Compiled + fork-tested; mainnet deploy is user-gated |
| `FanPassSBT` | Compiled; mainnet deploy is user-gated |

Full registry + explorer links: [`docs/xcup/CONTRACTS.md`](docs/xcup/CONTRACTS.md).

## Principles

- **No mocks** — every layer uses real components; un-deployed pieces surface honest
  `not deployed` / `awaiting` states rather than fabricated data.
- **Mainnet-only** — X Layer mainnet (196); de-risked via fork tests + small first runs.
- **Autonomous on-chain writes are double-gated** and default-off.

## License

[MIT](LICENSE).
