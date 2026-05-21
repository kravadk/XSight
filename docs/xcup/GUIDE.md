# X Cup — Guide

How to use X Cup as a fan, how to build on it as a developer, and a FAQ.
Companion to [`DESIGN.md`](DESIGN.md) (full architecture) and [`CONTRACTS.md`](CONTRACTS.md).

---

## 1 · For fans — how to predict & win

X Cup is a real-money prediction market on World Cup football, on X Layer (chain 196).
You stake a stablecoin into a shared pool; if your pick is right you split the pool
pro-rata with the other winners. No house, no order book — just the pool.

**First bet (cold start):**

1. Open the app — it lands on **Markets**, the live fixture feed.
2. **Connect** (top-right) — OKX Wallet. If you're on the wrong network the app prompts
   *Switch to X Layer*; approve it.
3. Tap a match → **Market detail**. Read the **Hermes AI pundit** take and the three
   buckets: pool-implied %, and the AI's fair-odds %.
4. Pick an outcome — **Home / Draw / Away** — and enter a USDT amount.
5. **Approve** (tx 1 — lets the pool pull your USDT) → **Stake** (tx 2). Your position
   appears in **My Bets**.
6. The match is played. The oracle ingests the result from multiple sources, proposes
   it, waits out a challenge window, and finalizes it on-chain.
7. In **My Bets**, a settled winning position shows **Claim** — one tx sends your
   pro-rata share of the pool to your wallet.

**Refunds.** If a market is voided, or nobody backed the winning outcome, every staker
can claim their stake back — nothing is lost to the protocol.

**Other screens.** *Bracket* — pick the knockout path (off-chain, opens at the knockout
stage). *Leaderboard* — global ranking + you vs Hermes. *AI Pundit* — Hermes' open
picks. *FanPass* — your on-chain football-IQ score and soulbound badge.

**Gas.** Transactions cost a small amount of OKB (X Layer's native token) — cents.

---

## 2 · For developers — build on the oracle

The settlement layer is open. Everything a market, game, or agent needs is a REST call
away; the backend proxies under `/api`.

**Market API**

| Endpoint | Returns |
|---|---|
| `GET /api/markets` | every fixture as a market — pools, odds, status |
| `GET /api/markets/:id` | one market + AI fair odds + oracle state |
| `GET /api/markets/:id/position?wallet=` | a wallet's position + claimable estimate |
| `GET /api/markets/positions?wallet=` | all of a wallet's positions |
| `GET /api/markets/indexer` | event-indexer status |
| `POST /api/markets/:id/stake-tx` | unsigned approve + stake calldata for the user's wallet |
| `GET /api/markets/:id/claim-tx` | unsigned claim calldata |

**Oracle / CupHub API**

`GET /api/cup/fixtures` · `/api/cup/ai-edge?matchId=` · `/api/cup/pundit` (Hermes picks)
· `/api/cup/resolver` (resolution-pipeline status) · `/api/cup/contract` (CupOracleV2
metadata + ABI) · `/api/cup/settlement-log` · `/api/cup/fan-score?wallet=` ·
`/api/cup/adapters` (source-quorum readiness).

**x402 — paid data for agents.** Monetized endpoints (e.g. `GET /api/v1/cup/ai-edge`)
take an `X-PAYMENT` header; pay-per-call in USDT on X Layer. Spec: `GET /api/v1/x402-spec`.

**MCP.** Agent-readable tools are served at `POST /mcp` (JSON-RPC 2.0) — discovery via
`GET /mcp`.

**Reference consumers.** `examples/cuphub-reference-market.ts` and
`examples/cuphub-fantasy-quest.ts` show a safe integration: observe CupHub, decide,
require approval, re-check the oracle before acting.

**Contracts.** Read finalized results straight from `CupOracleV2.getMatch(matchId)`, or
the market state from `ParimutuelMarket.getMarket(marketId)`. Addresses, ABIs and
explorer links: [`CONTRACTS.md`](CONTRACTS.md). `matchId`/`marketId` are
`keccak256` of the CupHub id (see `server/src/utils/cupIds.ts`).

**Run it.** See the repo [`README`](../../README.md) — `npm install`, fill
`server/.env`, `npm run server:dev` + `npm run dev`.

---

## 3 · FAQ

**Is it real money?** Yes — markets settle in real USDT on X Layer mainnet. There are
also off-chain free-to-play surfaces (bracket, leaderboard) that cost nothing.

**How is settlement trustless?** A result is never one operator's word. `CupOracleV2`
takes a result only after ≥2 independent sources agree (quorum), anchors evidence
hashes on-chain, and opens an optimistic challenge window before finalizing.
`ParimutuelMarket` reads *only* the finalized outcome — even the operator cannot
mis-pay a pool.

**What if the sources disagree?** The market honestly reports `conflicting_sources` /
`quorum_unavailable` and settlement holds — no guess is forced.

**What's the fee?** 0% for the hackathon. The contract supports an optional protocol
fee (`feeBps`, capped at 10%); the deployed instance is set to 0.

**Which chain / token?** X Layer mainnet, chain 196. The deployed `ParimutuelMarket`
settles in USDT (`0x1E4a5963…`); the contract itself is token-agnostic.

**Who is Hermes?** An autonomous Claude-backed pundit — it reads each fixture and the
multi-source edge signal, then issues a conviction-weighted pick. It's an opponent to
beat, not advice.

**Can the team rig payouts?** No. Payouts are pure math in `claim()` — `your stake ×
pool ÷ winning pool`. The signer wallet can only propose results (caught by the
challenge window); it can never touch staked funds.

**Is the code audited?** Self-audited against the checklist in `DESIGN.md` §7.3;
`ParimutuelMarket` has 23 fork-based tests against real X Layer mainnet (real oracle,
real USDT/USDC). Not a formal third-party audit — use small amounts.

**What happens after a match is cancelled?** The operator can `voidMarket` it →
every staker claims a full refund.
