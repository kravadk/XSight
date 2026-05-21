# XSight X Cup / CupOS Strategy

## Recommended Direction

Build **XSight CupHub / CupOS**: a sports oracle, AI signal API, and MCP skill layer for World Cup apps on X Layer.

The product should not compete as another prediction market. It should provide the missing infrastructure those markets, fantasy games, NFT quests, and trading agents need:

- fixtures and match metadata
- multi-source result verification
- optimistic settlement state
- AI odds, edge, and risk signals
- paid x402 APIs
- MCP tools for third-party agents
- optional fan reputation
- on-chain proofs on X Layer

Positioning:

> XSight CupHub is the AI and oracle infrastructure layer for World Cup apps on X Layer. Prediction markets, fantasy games, NFT quests, and trading agents can use XSight to fetch fixtures, verify outcomes, price event risk, and trigger on-chain actions through x402 and MCP.

## What To Emphasize

The submission should emphasize **CupHub first** and **FanPass second**.

CupHub is the main differentiator because it is shared infrastructure. Most teams will build a prediction market, fantasy game, NFT quest, or social app. Those apps still need fixtures, source receipts, result verification, settlement state, AI edge, and agent-readable APIs. XSight should become the layer those apps call instead of rebuilding the same plumbing.

FanPass is the best supporting primitive because it gives every World Cup app a reusable anti-Sybil and reputation layer. It should be presented as part of CupHub, not as a separate product.

AgentBet should remain a reference consumer of CupHub, not the main product. It can show how an autonomous agent uses CupHub signals and settlement state to produce a trading/prediction action plan.

CupCast should be treated as one signal source inside `/cup/ai-edge`, not as the product itself.

Do **not** include CupLP in the MVP narrative.

Strong pitch:

> Hackathon teams should not each spend a week building fixtures, result resolution, source verification, AI edge, and fan reputation. XSight CupHub gives them those primitives through x402 APIs and MCP tools, so they can build complete World Cup apps faster on X Layer.

## Idea Ranking

### 1. XSight CupHub - Sports Oracle + AI Signal API + MCP Skill Marketplace

Status: **Core direction**

Why it wins:

- Lowest expected competition. Most hackathon teams will build user-facing prediction/NFT/GameFi apps, not infra.
- Strong market potential because it sells picks-and-shovels to every other World Cup app.
- Best reuse of existing XSight architecture: Claude, x402, MCP, heartbeat, activity tracker, economy loop, OnchainOS.
- Fits OKX criteria well: innovation, completion, X Layer verifiability, AI agent experience, market potential.

Key surfaces:

- On-chain feed: fixtures, final results, player/team stats, signed source hash receipts.
- x402 API: `/cup/fixtures`, `/cup/result/:matchId`, `/cup/player-stats`, `/cup/ai-edge`, `/cup/sentiment`.
- MCP tools: `resolve_match`, `get_cup_ai_edge`, `score_team_strength`, `get_cup_sentiment`, `verify_outcome`.
- Reference app: tiny prediction-market or fantasy consumer demo that shows how another project can integrate CupHub quickly.

Primary demo story:

- A small prediction/fantasy app imports CupHub instead of building its own sports backend.
- It reads fixtures from XSight.
- It calls `/cup/ai-edge` for match context and risk.
- After the match, it calls `/cup/result/:matchId` or MCP `verify_outcome`.
- The result is tied to a source receipt and on-chain settlement state.
- The app is complete because CupHub handles the boring but critical infrastructure.

MVP rule:

- Do not try to become a full sports data company in 10 days.
- Use 2-3 adapters with fallback and source receipts.
- Put the canonical result/settlement state on X Layer.
- Make the AI/API/MCP developer experience the hero.

### 2. FanPass - Soulbound Identity + Reputation Primitive

Status: **Secondary feature**

Why it matters:

- Useful for Social, NFT, and GameFi projects.
- Solves a real anti-Sybil and reward-gating problem.
- Easy to explain: "real fan score for World Cup apps."

Why not core:

- Reputation alone is weaker than oracle/settlement infrastructure.
- It needs adoption by other apps to feel valuable.
- It can become a farming/points feature if not tied to real settlement/proof.

Best integration:

- Add as `FanPass` inside CupHub.
- Score wallets by oracle interactions, API usage, proposals/challenges, prediction history, NFT claims, and real X Layer activity.
- Provide `GET /cup/fan-score?wallet=...` and MCP `get_fan_score`.

Primary demo story:

- A fantasy or NFT quest app calls `GET /cup/fan-score?wallet=...`.
- XSight returns a score and breakdown.
- The app gates rewards to active fans instead of bots.
- FanPass activity is connected to real CupHub usage and X Layer actions, not arbitrary points.

### 3. AgentBet - Marketplace of Autonomous Betting Agents

Status: **Future expansion / optional demo**

Why it is interesting:

- Strong AI Agent + Trading story.
- Could provide liquidity demand for prediction markets.
- Natural extension of XSight's agentic wallet and heartbeat.

Why it is risky for MVP:

- Delegated betting budgets require stronger controls, permissions, limits, and trust.
- It can look like "automated gambling" rather than infrastructure.
- Requires a marketplace UX and ranking system to feel complete.

Best integration:

- Do not make AgentBet the main submission.
- Show one "reference agent" that consumes CupHub signals and creates an action plan.
- Avoid custody-heavy delegation in the hackathon MVP unless the contract scope is very small.

### 4. CupCast - Fan-Driven Social Signal API

Status: **Useful input, not standalone product**

Why it matters:

- Sentiment is useful for AI odds and trading signals.
- It helps Social and AI Agent tracks.

Why it is risky:

- Scrapers and social APIs are fragile.
- Twitter/X access can become a cost and reliability problem.
- Hard to prove truthfulness versus normal sports result settlement.

Best integration:

- Use as one signal source inside `ai-edge`.
- Present source confidence and timestamps.
- Do not make the whole submission depend on social scraping.

## Final MVP Recommendation

Build **CupHub Core**:

1. `CupOracleV2` smart contract on X Layer:
   - register match
   - attach rules hash, source hash, evidence hash, and evidence URI
   - propose result only after live source quorum
   - challenge result with a public reason URI
   - finalize result
   - expose canonical outcome

2. Backend module:
   - `server/src/routes/cup.ts`
   - `server/src/services/cupData.ts`
   - `server/src/services/cupAdapters.ts`
   - `server/src/services/cupOracleContract.ts`
   - `server/src/services/cupReputation.ts`
   - `server/src/services/cupPersistence.ts`

3. x402 endpoints:
   - `GET /api/v1/cup/fixtures`
   - `GET /api/v1/cup/result/:matchId`
   - `GET /api/v1/cup/ai-edge?matchId=...`
   - `GET /api/v1/cup/sentiment?matchId=...`
   - `GET /api/v1/cup/team-strength?matchId=...`
   - `GET /api/v1/cup/fan-score?wallet=...`
   - `POST /api/v1/cup/action-plan`

4. MCP tools:
   - `get_cup_fixtures`
   - `resolve_match`
   - `get_cup_ai_edge`
   - `score_team_strength`
   - `get_cup_sentiment`
   - `verify_outcome`
   - `get_cup_settlement_state`
   - `get_fan_score`

5. Frontend:
   - new `CupHub` tab
   - fixtures table
   - match detail with source receipts
   - AI edge panel
   - settlement timeline
   - x402/MCP developer examples
   - small FanPass score panel

6. Reference consumer:
   - tiny "50-line prediction market/fantasy app" example that reads CupHub results.
   - The point is to prove other hackathon teams can build faster on top of XSight.

## Implementation Progress

Current local MVP status:

- CupOracleV2 source is implemented with evidence hash/URI and source-count checks.
- CupHub read APIs are live under `/api/cup/*` and now fetch real provider data instead of seeded fixtures.
- Production mode never falls back to seeded matches. If sources are unavailable, APIs return honest empty/quorum states.
- x402-paid Cup intelligence endpoints are listed under `/api/v1/cup/*` and production requires a real X Layer payment tx hash.
- Player impact stats return an empty/unavailable live-provider state until a real player data provider supplies data.
- Source adapter readiness is visible through `/api/cup/adapters`, including which free providers need keys before production settlement.
- MCP exposes CupHub read tools, including on-chain settlement state for `verify_outcome`.
- Frontend has dedicated `CupHub`, `FanPass`, and `AgentBet` views in the left navigation.
- CupHub UI includes fixture registry, AI edge, source receipts, contract readiness, and settlement controls.
- Settlement write endpoints are disabled by default and gated with `CUP_WRITE_API_KEY`.
- CupHub exposes a settlement tx log so judges can see proposed/challenged/finalized oracle actions after real source-backed transactions.
- `examples/cuphub-reference-market.ts` shows how another hackathon app can build a tiny market consumer on top of CupHub.
- `examples/cuphub-fantasy-quest.ts` shows how a GameFi/fantasy app consumes fixtures, FanPass, team strength, and oracle finality.
- `GET /api/cup/track-proof` exposes judge-readable proof rows for AI Agent, Prediction Infrastructure, Trading, Social, NFT, and GameFi.
- AgentBet now shows an explicit Agent Trace and Risk & Hedge Planner.
- FanPass now includes a Campaign Gate Simulator and FanPassSBT eligibility proof for the NFT track.
- CupHub now includes an Oracle Proof Panel, Reference Market Consumer block, and Fantasy Quest Builder.
- `docs/xcup-submission-package.md`, `docs/xcup-submission-form.md`, and `docs/xcup-track-answer-variants.md` are ready for judge-facing submission copy.
- Detailed tab responsibility, user flow, and problem-handling logic is documented in `docs/xcup-cupos-product-flow.md`.

Next hardening steps:

- Record a 90-second walkthrough using the script in `docs/xcup-demo-walkthrough.md`.
- Capture final CupHub/FanPass/AgentBet screenshots after live provider data is visible.
- Add the Twitter/X project account and post cadence later, once the submission page is stable.
- Optional stretch only if time remains: deploy `FanPassSBT` and mint one proof badge for the demo wallet; do not let it distract from CupHub.

## Pitch

> Everyone can build a World Cup prediction market. The hard part is shared infrastructure: reliable fixtures, result settlement, AI edge, source verification, and agent-readable APIs. XSight CupHub makes every World Cup app on X Layer more complete by giving them sports oracle data, AI signals, x402 monetization, and MCP tools in one reusable layer.
