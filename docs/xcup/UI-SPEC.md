# X Cup — UI specification (per tab / per block)

What every tab and block must show, and how it must behave on empty data, a
backend error, or an unexpected bug. The audit that produced this doc ran the
app in a headless browser and screenshotted every tab.

**Shared rules**
- Every data block is wrapped in `StatePanel` (`components/cup/CupKit`): it shows
  a **skeleton** while loading, an **error card with a Retry button** on a failed
  fetch, and a labelled **empty state** when there is no data — never a blank zone
  and never fabricated data.
- Money/numbers render `en-US` (`$1,250.50`), pinned regardless of viewer locale.
- A failed transaction surfaces a **toast** with the revert reason; the UI never
  silently no-ops.
- Honest contract states: `contract_not_deployed`, `market_not_created`,
  `awaiting_settlement`, `awaiting registration` — shown verbatim, never hidden.
- "Connected" on X Cup means the **user** connected their wallet. The agent
  portfolio (XSight surface) never auto-marks X Cup as connected.

---

## X Cup tabs

### Markets
- **Header** — title + a short framing line; "Pool contract live" chip when the
  market contract is deployed.
- **Filters** — status row (All / Upcoming / Live / Finished) + market-type row
  (All types / Match Result / Over-Under / Both Score); a live count.
- **Market grid** — one card per (fixture × market type): stage, status badge,
  matchup, a market-type chip, the pool-implied outcome bar, total pool. Capped
  at 36 cards with a **"Load more"** button (104 fixtures × 3 types = 312).
- **Empty/error** — "No fixtures in this filter yet" empty state; error card with
  Retry. Before kickoff the World Cup feed can be legitimately empty.

### Market detail
- **Hero** — stage · market-type label, status badge, matchup, kickoff
  countdown, total pool, venue.
- **AI pundit read** — Hermes verdict + confidence (1X2 markets only).
- **Outcome buckets** — 2 or 3 buttons from the market type's labels; pool-implied
  %, plus AI fair odds on 1X2.
- **Stake panel** — token selector (USDT / USDC / OKB); USDT = approve + stake,
  any other token = OKX-DEX swap → stake. Disabled with an honest reason when the
  market is not `open`.
- **Free pick** — no-stake prediction (1X2 only).
- **Oracle strip** — live oracle name + `bonded` flag + on-chain state.
- **Error** — "Market not found" empty state; tx failures → toast.

### My Bets
- Wallet-gated. **Disconnected** → a single "Connect your wallet to see your
  bets" card with a Connect button. **Connected** → the wallet's positions with
  claimable estimates and a Claim action on settled wins.
- **Empty** — connected with no positions → an honest "no positions yet" state.

### Bracket
- **Scoreboard** — You X/Y vs Hermes X/Y.
- **NFT card** — mint state (contract-not-deployed / mintable / minted).
- **Fixture list** — one row per fixture (104), Home/Draw/Away pick buttons, a
  "picked N/104" counter. Save is wallet-gated.
- **Error** — "No fixtures available yet" empty state; save failure → toast.

### Leaderboard
- **Tabs** — Global / My Leagues.
- **You vs Hermes** card; **global ranking** — opens at the first settlement
  (honest "opens at the first settlement" state until then).
- **Leagues** — create / join by invite code.

### AI Pundit
- **Hermes profile** card — model, record.
- **Pick grid** — one card per fixture: matchup, Hermes pick + confidence, or a
  `NO EDGE` / `PASS` tag. Honest empty state when no picks exist yet.

### FanPass
- **Score card** — football-IQ score + tier.
- **Score breakdown** — x402 usage / cup interactions / on-chain activity /
  consistency / oracle participation, each a labelled progress bar.
- **SBT card** — eligibility + the FanPassSBT contract address.
- Wallet-gated — disconnected shows a connect prompt.

### Developers
- **On-chain contracts** — CupOracleV3, ParimutuelMarket (live addresses +
  explorer links + deployed status).
- **Oracle source adapters** — "N live · M needed for quorum" + per-source status.
- **Settlement log** — recent on-chain oracle actions.
- **MCP tools** — agent-readable endpoint list.

---

## XSight copilot tabs

- **Portfolio** — Overview / Holdings / History / Yield; value + holdings +
  LP-yield + API-calls stat cards; equity chart; allocation donut. Honest empty
  states when the agent wallet holds nothing.
- **AI Chat** — Claude-backed chat; session list (select + delete per row);
  empty state before the first conversation.
- **x402 API** — endpoint workbench, per-endpoint try-it with the 402 gate.
- **Auto-Yield** — earn→store→deploy→yield loop, agent heartbeat, manual deploy.
- **Guide** — searchable documentation.
- **Build** — x402 endpoint reference + drop-in code examples (API base derived
  from `window.location.origin`).

---

## Error & bug behaviour (every tab)

| Situation | Expected behaviour |
|---|---|
| Backend unreachable | `StatePanel` error card + Retry; `useBackendSync` backs off (15s→2min) and the sidebar shows offline. |
| Endpoint returns empty | Labelled empty state — never a blank zone, never fake rows. |
| Contract not deployed | Honest `contract_not_deployed` / `awaiting` text; actions disabled. |
| Wallet not connected | Connect prompt on gated blocks; read-only blocks still render. |
| Wrong network | "Switch to X Layer" chip; `ensureXLayer()` prompts the switch before any tx. |
| Transaction reverts | Toast with the revert reason; no partial UI state. |
| Unexpected render error | A page-level error boundary should catch it and show a recoverable card rather than a white screen. |
